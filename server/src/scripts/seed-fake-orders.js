import { db, query } from "../db.js";

const SEED_TAG = "preview_fake_orders_v1";

const fakeOrders = [
  {
    wixOrderNumber: "FAKE-1001",
    customerName: "María Fernández",
    customerPhone: "+54 9 11 5555-0101",
    customerAddress: "Av. Córdoba 1234, CABA",
    contactEmail: "maria.fernandez.fake@example.com",
    customerNote: "Entregar por la tarde",
    shippingZone: "AMBA",
    shippingMethod: "Envío a domicilio",
    deliveryTime: "24-48 hs",
    paymentStatus: "paid",
    paymentMethod: "mercadopago",
    fulfillmentStatus: "processing",
    currency: "ARS",
    status: "pago",
    source: "fake_seed",
    shippingCost: 3500,
    taxTotal: 0,
    discount: 1200,
    promoCode: "PRUEBA10",
    lines: [
      { productName: "Detergente Ultra 750ml", quantity: 2, unitPrice: 4800 },
      { productName: "Desinfectante Floral 1L", quantity: 1, unitPrice: 6200 }
    ]
  },
  {
    wixOrderNumber: "FAKE-1002",
    customerName: "Julián Martínez",
    customerPhone: "+54 9 11 5555-0202",
    customerAddress: "Belgrano 456, Rosario",
    contactEmail: "julian.martinez.fake@example.com",
    customerNote: "Llamar antes de entregar",
    shippingZone: "Interior",
    shippingMethod: "Correo",
    deliveryTime: "3-5 días",
    paymentStatus: "pending",
    paymentMethod: "transferencia",
    fulfillmentStatus: "unfulfilled",
    currency: "ARS",
    status: "nuevo",
    source: "fake_seed",
    shippingCost: 5200,
    taxTotal: 0,
    discount: 0,
    promoCode: null,
    lines: [
      { productName: "Lavandina Clásica 2L", quantity: 3, unitPrice: 3100 },
      { productName: "Limpiador Multiuso 900ml", quantity: 2, unitPrice: 3900 }
    ]
  },
  {
    wixOrderNumber: "FAKE-1003",
    customerName: "Carla Gómez",
    customerPhone: "+54 9 261 555-0303",
    customerAddress: "San Martín 890, Mendoza",
    contactEmail: "carla.gomez.fake@example.com",
    customerNote: "Dejar en portería",
    shippingZone: "Cuyo",
    shippingMethod: "Logística regional",
    deliveryTime: "48-72 hs",
    paymentStatus: "paid",
    paymentMethod: "tarjeta",
    fulfillmentStatus: "fulfilled",
    currency: "ARS",
    status: "enviado",
    source: "fake_seed",
    shippingCost: 4800,
    taxTotal: 0,
    discount: 900,
    promoCode: "ENVIOFREE",
    lines: [
      { productName: "Jabón Líquido Ropa 3L", quantity: 1, unitPrice: 11200 },
      { productName: "Perfume Textil Brisa 500ml", quantity: 2, unitPrice: 5400 }
    ]
  }
];

function calculateAmounts(order) {
  const subtotal = order.lines.reduce((acc, line) => acc + line.quantity * line.unitPrice, 0);
  const netAmount = subtotal;
  const paymentCardAmount = Math.max(0, subtotal + order.shippingCost + order.taxTotal - order.discount);
  const total = paymentCardAmount;

  return { subtotal, netAmount, paymentCardAmount, total };
}

async function insertFakeOrders() {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `DELETE FROM orders
       WHERE source = 'fake_seed'
          OR raw_payload->>'seedTag' = $1`,
      [SEED_TAG]
    );

    for (const order of fakeOrders) {
      const { netAmount, paymentCardAmount, total } = calculateAmounts(order);

      const orderResult = await client.query(
        `INSERT INTO orders (
          wix_order_number,
          customer_name,
          customer_phone,
          customer_address,
          contact_email,
          customer_note,
          order_items_count,
          shipping_zone,
          shipping_method,
          delivery_time,
          payment_status,
          payment_method,
          fulfillment_status,
          currency,
          net_amount_ars,
          payment_card_amount_ars,
          shipping_cost_ars,
          tax_total_ars,
          discount_ars,
          promo_code,
          total_ars,
          status,
          source,
          raw_payload
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24::jsonb
        )
        RETURNING id`,
        [
          order.wixOrderNumber,
          order.customerName,
          order.customerPhone,
          order.customerAddress,
          order.contactEmail,
          order.customerNote,
          order.lines.length,
          order.shippingZone,
          order.shippingMethod,
          order.deliveryTime,
          order.paymentStatus,
          order.paymentMethod,
          order.fulfillmentStatus,
          order.currency,
          netAmount,
          paymentCardAmount,
          order.shippingCost,
          order.taxTotal,
          order.discount,
          order.promoCode,
          total,
          order.status,
          order.source,
          JSON.stringify({ seedTag: SEED_TAG, isFake: true })
        ]
      );

      const orderId = orderResult.rows[0].id;

      for (const line of order.lines) {
        await client.query(
          `INSERT INTO order_items (
            order_id,
            product_name,
            quantity,
            unit_price_ars,
            raw_payload
          )
          VALUES ($1, $2, $3, $4, $5::jsonb)`,
          [
            orderId,
            line.productName,
            line.quantity,
            line.unitPrice,
            JSON.stringify({ seedTag: SEED_TAG, isFake: true })
          ]
        );
      }
    }

    await client.query("COMMIT");
    console.log(`Pedidos fake insertados: ${fakeOrders.length}`);
    console.log(`Seed tag: ${SEED_TAG}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("No se pudieron insertar pedidos fake", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await db.end();
  }
}

insertFakeOrders();