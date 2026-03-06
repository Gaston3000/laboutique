import fs from "fs/promises";
import { parse } from "csv-parse/sync";
import { db, query } from "../db.js";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeHeaderKey(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function buildRowValueGetter(row) {
  const normalized = new Map();

  for (const [key, value] of Object.entries(row || {})) {
    normalized.set(normalizeHeaderKey(key), value);
  }

  return (...aliases) => {
    for (const alias of aliases) {
      const value = normalized.get(normalizeHeaderKey(alias));
      if (value !== undefined) {
        return normalizeText(value);
      }
    }

    return "";
  };
}

function parseMoney(value) {
  const raw = normalizeText(value)
    .replace(/\s+/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "");

  if (!raw) {
    return 0;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCount(value, fallback = 0) {
  const parsed = Number(normalizeText(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.floor(parsed));
}

function parseDateTime(dateValue, timeValue) {
  const composed = `${normalizeText(dateValue)} ${normalizeText(timeValue)}`.trim();

  if (!composed) {
    return null;
  }

  const timestamp = Date.parse(composed);

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function normalizeComparable(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function deriveShippingZone(method, city) {
  const methodText = normalizeComparable(method);
  const cityText = normalizeComparable(city);

  if (methodText.includes("retiro")) {
    return "retiro";
  }

  if (methodText.includes("caba") || cityText.includes("caba") || cityText.includes("capital") || cityText.includes("ciudad autonoma")) {
    return "caba";
  }

  return "gba";
}

function mapStatus(paymentStatus, fulfillmentStatus, trackingNumber) {
  const payment = normalizeComparable(paymentStatus);
  const fulfillment = normalizeComparable(fulfillmentStatus);
  const tracking = normalizeText(trackingNumber);

  if (payment.includes("reembols") || fulfillment.includes("cancel")) {
    return "cancelado";
  }

  if (fulfillment.includes("entregado")) {
    return "entregado";
  }

  if (tracking || fulfillment.includes("enviado") || fulfillment.includes("despach")) {
    return "enviado";
  }

  if (fulfillment.includes("procesado") || fulfillment.includes("prepar")) {
    return "preparado";
  }

  if (payment.includes("pagado")) {
    return "pago";
  }

  return "nuevo";
}

async function main() {
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.error("Uso: npm run import:wix:orders -- \"C:/ruta/Pedidos.csv\"");
    process.exit(1);
  }

  const rawCsv = await fs.readFile(csvPath, "utf8");
  const rows = parse(rawCsv, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });

  if (!rows.length) {
    console.log("El archivo no contiene pedidos para importar.");
    await db.end();
    return;
  }

  const productsResult = await query("SELECT id, name, brand FROM products");
  const productIdByName = new Map();

  for (const product of productsResult.rows) {
    const key = normalizeComparable(product.name);
    if (!productIdByName.has(key)) {
      productIdByName.set(key, product.id);
    }
  }

  const groupedByOrderNumber = new Map();

  for (const row of rows) {
    const get = buildRowValueGetter(row);
    const orderNumber = get("Número de pedido", "Numero de pedido", "Order Number", "Order #");

    if (!orderNumber) {
      continue;
    }

    if (!groupedByOrderNumber.has(orderNumber)) {
      groupedByOrderNumber.set(orderNumber, []);
    }

    groupedByOrderNumber.get(orderNumber).push(row);
  }

  await query("BEGIN");

  try {
    await query("DELETE FROM orders");

    let ordersInserted = 0;
    let linesInserted = 0;

    for (const [orderNumber, orderRows] of groupedByOrderNumber.entries()) {
      const baseRow = orderRows[0];
      const get = buildRowValueGetter(baseRow);

      const shippingMethod = get("Método de envío", "Metodo de envio", "Shipping Method");
      const shippingCity = get("Ciudad de entrega", "Shipping City");
      const shippingAddress = get("Dirección de entrega", "Direccion de entrega", "Shipping Address");
      const paymentStatus = get("Estado del pago", "Payment Status");
      const fulfillmentStatus = get("Estado de cumplimiento", "Fulfillment Status");
      const trackingNumber = get("Número de seguimiento", "Numero de seguimiento", "Tracking Number");
      const createdAt = parseDateTime(
        get("Fecha de creación", "Fecha de creacion", "Created Date"),
        get("Hora", "Time")
      );

      const total = parseMoney(get("Total"));
      const shippingCost = parseMoney(get("Tarifa de envío", "Tarifa de envio", "Shipping Fee", "Shipping"));
      const taxTotal = parseMoney(get("Impuesto total", "Total Tax"));
      const netAmount = parseMoney(get("Monto neto", "Net Amount"));
      const paymentCardAmount = parseMoney(get("Monto de la tarjeta", "Card Amount"));
      const discount = Math.max(
        0,
        orderRows.reduce((acc, currentRow) => {
          const rowGet = buildRowValueGetter(currentRow);
          const unitPrice = parseMoney(rowGet("Precio", "Price"));
          const quantity = parseCount(rowGet("Cant.", "Cant", "Quantity"), 1);
          return acc + unitPrice * quantity;
        }, 0) + shippingCost + taxTotal - total
      );

      const insertOrder = await query(
        `INSERT INTO orders (
           wix_order_number,
           customer_name,
           customer_phone,
           customer_address,
           contact_email,
           customer_note,
           purchase_extra_data,
           order_items_count,
           shipping_zone,
           shipping_method,
           delivery_time,
           recipient_name,
           recipient_phone,
           recipient_company,
           shipping_country,
           shipping_state,
           shipping_city,
           shipping_postal_code,
           billing_name,
           billing_phone,
           billing_company,
           billing_country,
           billing_state,
           billing_city,
           billing_address,
           billing_postal_code,
           payment_status,
           payment_method,
           promo_code,
           fulfillment_status,
           tracking_number,
           fulfillment_service,
           shipping_label,
           currency,
           net_amount_ars,
           payment_card_amount_ars,
           shipping_cost_ars,
           tax_total_ars,
           discount_ars,
           total_ars,
           status,
           source,
           raw_payload,
           created_at
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8,
           $9, $10, $11, $12, $13, $14, $15, $16,
           $17, $18, $19, $20, $21, $22, $23, $24,
           $25, $26, $27, $28, $29, $30, $31, $32,
           $33, $34, $35, $36, $37, $38, $39, $40,
           $41, $42, $43,
           COALESCE($44::timestamp, NOW())
         )
         RETURNING id`,
        [
          orderNumber,
          get("Nombre del destinatario", "Recipient Name", "Nombre de facturación", "Nombre de facturacion"),
          get("Teléfono del destinatario", "Telefono del destinatario", "Teléfono de facturación", "Telefono de facturacion"),
          shippingAddress || get("Dirección de facturación", "Direccion de facturacion", "Billing Address"),
          get("Email de contacto", "Contact Email", "Email"),
          get("Nota del cliente", "Customer Note"),
          get("Datos adicionales de compra", "Additional Purchase Data"),
          parseCount(get("Cantidad total del pedido", "Total Quantity"), orderRows.length),
          deriveShippingZone(shippingMethod, shippingCity),
          shippingMethod,
          get("Tiempo de entrega", "Delivery Time"),
          get("Nombre del destinatario", "Recipient Name"),
          get("Teléfono del destinatario", "Telefono del destinatario", "Recipient Phone"),
          get("Empresa del destinatario", "Recipient Company"),
          get("País de entrega", "Pais de entrega", "Shipping Country"),
          get("Estado de entrega", "Shipping State"),
          shippingCity,
          get("Código postal de entrega", "Codigo postal de entrega", "Shipping Zip"),
          get("Nombre de facturación", "Nombre de facturacion", "Billing Name"),
          get("Teléfono de facturación", "Telefono de facturacion", "Billing Phone"),
          get("Empresa de facturación", "Empresa de facturacion", "Billing Company"),
          get("País de facturación", "Pais de facturacion", "Billing Country"),
          get("Estado de facturación", "Estado de facturacion", "Billing State"),
          get("Ciudad de facturación", "Billing City"),
          get("Dirección de facturación", "Direccion de facturacion", "Billing Address"),
          get("Código postal de la dirección de facturación", "Codigo postal de la direccion de facturacion", "Billing Zip"),
          paymentStatus,
          get("Método de pago", "Metodo de pago", "Payment Method"),
          get("Código del cupón", "Codigo del cupon", "Coupon Code"),
          fulfillmentStatus,
          trackingNumber,
          get("Servicio de cumplimiento", "Fulfillment Service"),
          get("Etiqueta de envío", "Etiqueta de envio", "Shipping Label"),
          get("Divisa", "Currency"),
          netAmount,
          paymentCardAmount,
          shippingCost,
          taxTotal,
          discount,
          total,
          mapStatus(paymentStatus, fulfillmentStatus, trackingNumber),
          "wix_csv",
          JSON.stringify({ orderNumber, rawHeader: baseRow }),
          createdAt
        ]
      );

      const orderId = insertOrder.rows[0].id;
      ordersInserted += 1;

      for (const lineRow of orderRows) {
        const lineGet = buildRowValueGetter(lineRow);
        const productName = lineGet("Artículo", "Articulo", "Item", "Product");
        const productId = productIdByName.get(normalizeComparable(productName)) || null;
        const quantity = parseCount(lineGet("Cant.", "Cant", "Quantity"), 1);

        await query(
          `INSERT INTO order_items (
             order_id,
             product_id,
             product_name,
             wix_variant,
             wix_sku,
             quantity,
             refunded_quantity,
             unit_price_ars,
             item_weight,
             custom_text,
             deposit_amount_ars,
             raw_payload
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9, 0), $10, $11, $12::jsonb)`,
          [
            orderId,
            productId,
            productName || "Artículo sin nombre",
            lineGet("Variante", "Variant"),
            lineGet("SKU"),
            quantity,
            parseMoney(lineGet("Cantidad reembolsada", "Refunded Quantity")),
            parseMoney(lineGet("Precio", "Price")),
            parseMoney(lineGet("Peso", "Weight")),
            lineGet("Texto personalizado", "Custom Text"),
            parseMoney(lineGet("Monto del depósito", "Monto del deposito", "Deposit Amount")),
            JSON.stringify({ rawLine: lineRow })
          ]
        );

        linesInserted += 1;
      }
    }

    await query("COMMIT");

    const totals = await query("SELECT COUNT(*)::int AS orders_count FROM orders");
    console.log("Importación de pedidos Wix finalizada.");
    console.log(`Pedidos importados: ${ordersInserted}`);
    console.log(`Líneas importadas: ${linesInserted}`);
    console.log(`Pedidos en base: ${totals.rows[0]?.orders_count || 0}`);
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  } finally {
    await db.end();
  }
}

main().catch(async (error) => {
  console.error("Error al importar pedidos de Wix:", error.message);
  await db.end();
  process.exit(1);
});
