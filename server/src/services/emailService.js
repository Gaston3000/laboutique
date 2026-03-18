import { Resend } from "resend";

// Email sender configuration
const FROM_EMAIL = "La Boutique de la Limpieza <noreply@emailtestt.com>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "gaston.costabella@davinci.edu.ar";

// Lazy initialization of Resend to ensure env vars are loaded
let resendInstance = null;

function getResend() {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set in environment variables");
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

/**
 * Generic: send a pre-built order email to a customer.
 */
export async function sendOrderEmail(toEmail, subject, html) {
  const result = await getResend().emails.send({
    from: FROM_EMAIL,
    to: toEmail,
    subject,
    html,
  });
  return result;
}

/**
 * Generic: send a pre-built email to the admin address(es).
 */
export async function sendAdminOrderEmail(subject, html) {
  const result = await getResend().emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject,
    html,
  });
  return result;
}

/**
 * Send order confirmation email to customer
 * @param {string} userEmail - Customer email address
 * @param {object} orderDetails - Order information
 * @param {number} orderDetails.orderId - Order ID
 * @param {string} orderDetails.customerName - Customer name
 * @param {string} orderDetails.customerPhone - Customer phone
 * @param {number} orderDetails.totalArs - Total amount in ARS
 * @param {number} orderDetails.subtotalArs - Subtotal before shipping and discounts
 * @param {number} orderDetails.shippingCostArs - Shipping cost
 * @param {number} orderDetails.discountArs - Discount amount
 * @param {string} orderDetails.promoCode - Promo code used
 * @param {Array} orderDetails.items - Order items
 * @param {string} orderDetails.deliveryAddress - Delivery address
 * @param {string} orderDetails.shippingZone - Shipping zone
 * @returns {Promise<object>} Resend API response
 */
export async function sendOrderConfirmationEmail(userEmail, orderDetails) {
  try {
    const { 
      orderId, 
      customerName, 
      customerPhone,
      totalArs, 
      subtotalArs = totalArs,
      shippingCostArs = 0,
      discountArs = 0,
      promoCode,
      items, 
      deliveryAddress,
      shippingZone
    } = orderDetails;

    const currentDate = new Date().toLocaleDateString('es-AR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Pedido</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a4ac8 0%, #2563eb 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">¡Pedido Confirmado!</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">Gracias por tu compra</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">Hola <strong>${customerName}</strong>,</p>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                Tu pedido ha sido confirmado exitosamente y está siendo procesado. En breve comenzaremos a prepararlo para su envío.
              </p>
              
              <!-- Order Summary Box -->
              <table style="width: 100%; border: 2px solid #e5e7eb; border-radius: 8px; margin: 30px 0; overflow: hidden;">
                <tr style="background-color: #f9fafb;">
                  <td colspan="2" style="padding: 20px; text-align: center; border-bottom: 2px solid #e5e7eb;">
                    <h2 style="margin: 0; font-size: 20px; color: #1f2937;">Recibo de Compra</h2>
                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">${currentDate}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px 20px; font-weight: 600; color: #1f2937; border-bottom: 1px solid #e5e7eb;">
                    Número de Pedido
                  </td>
                  <td style="padding: 15px 20px; text-align: right; color: #1a4ac8; font-weight: bold; font-size: 16px; border-bottom: 1px solid #e5e7eb;">
                    #${orderId}
                  </td>
                </tr>
                ${customerPhone ? `
                <tr>
                  <td style="padding: 15px 20px; font-weight: 600; color: #1f2937; border-bottom: 1px solid #e5e7eb;">
                    Teléfono de Contacto
                  </td>
                  <td style="padding: 15px 20px; text-align: right; color: #1f2937; border-bottom: 1px solid #e5e7eb;">
                    ${customerPhone}
                  </td>
                </tr>
                ` : ''}
              </table>
              
              <!-- Items List -->
              <h2 style="margin: 30px 0 15px 0; font-size: 18px; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                📦 Productos
              </h2>
              
              <table style="width: 100%; margin-bottom: 20px;">
                ${items.map(item => `
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                      <strong style="color: #1f2937; font-size: 15px;">${item.product_name}</strong>
                      ${item.wix_variant ? `<br><span style="color: #6b7280; font-size: 13px;">${item.wix_variant}</span>` : ''}
                    </td>
                    <td style="padding: 12px 0; text-align: center; color: #6b7280; border-bottom: 1px solid #f3f4f6; white-space: nowrap;">
                      x${item.quantity}
                    </td>
                    <td style="padding: 12px 0; text-align: right; color: #1f2937; font-weight: 500; border-bottom: 1px solid #f3f4f6; white-space: nowrap;">
                      $${(item.unit_price_ars * item.quantity).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                `).join('')}
              </table>
              
              <!-- Receipt Totals -->
              <table style="width: 100%; margin: 30px 0; background-color: #f9fafb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 12px 20px; color: #1f2937; font-size: 15px;">
                    Subtotal
                  </td>
                  <td style="padding: 12px 20px; text-align: right; color: #1f2937; font-size: 15px;">
                    $${subtotalArs.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                ${discountArs > 0 ? `
                <tr>
                  <td style="padding: 12px 20px; color: #059669; font-size: 15px;">
                    Descuento${promoCode ? ` (${promoCode})` : ''}
                  </td>
                  <td style="padding: 12px 20px; text-align: right; color: #059669; font-weight: 600; font-size: 15px;">
                    -$${discountArs.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 12px 20px; color: #1f2937; font-size: 15px;">
                    Envío${shippingZone ? ` (${shippingZone})` : ''}
                  </td>
                  <td style="padding: 12px 20px; text-align: right; color: #1f2937; font-size: 15px; font-weight: ${shippingCostArs === 0 ? '600' : 'normal'}; color: ${shippingCostArs === 0 ? '#059669' : '#1f2937'};">
                    ${shippingCostArs === 0 ? 'GRATIS' : `$${shippingCostArs.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
                  </td>
                </tr>
                <tr style="border-top: 2px solid #e5e7eb;">
                  <td style="padding: 16px 20px; color: #1f2937; font-size: 18px; font-weight: bold;">
                    TOTAL
                  </td>
                  <td style="padding: 16px 20px; text-align: right; color: #059669; font-size: 22px; font-weight: bold;">
                    $${totalArs.toLocaleString('es-AR', { minimumFractionDigits: 2 })} ARS
                  </td>
                </tr>
              </table>
              
              <!-- Delivery Address -->
              ${deliveryAddress ? `
                <h2 style="margin: 30px 0 15px 0; font-size: 18px; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
                  📍 Dirección de Entrega
                </h2>
                <p style="margin: 0 0 20px 0; padding: 15px; background-color: #f9fafb; border-radius: 6px; color: #374151; line-height: 1.6;">
                  ${deliveryAddress}
                </p>
              ` : ''}
              
              <!-- Next Steps -->
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 8px; padding: 20px; margin: 30px 0;">
                <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px;">🎯 Próximos pasos:</h3>
                <ol style="margin: 0; padding-left: 20px; color: #1e3a8a; line-height: 1.8; font-size: 14px;">
                  <li>Procesaremos tu pedido en las próximas horas</li>
                  <li>Prepararemos los productos para el envío</li>
                  <li>Te notificaremos cuando tu pedido sea despachado</li>
                  <li>Recibirás un número de seguimiento para rastrear tu envío</li>
                </ol>
              </div>
              
              <!-- Call to Action -->
              <table role="presentation" style="margin: 40px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/cuenta/pedidos/${orderId}" 
                       style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1a4ac8 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(26, 74, 200, 0.3);">
                      Ver Detalles del Pedido
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6; text-align: center;">
                Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos.<br>
                ¡Gracias por confiar en nosotros!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #1f2937; font-weight: 600;">
                La Boutique de la Limpieza
              </p>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                Tu tienda de productos de limpieza de confianza
              </p>
              <p style="margin: 15px 0 0 0; font-size: 13px; color: #6b7280;">
                📧 ${userEmail} | 📞 ${customerPhone || 'Contacto registrado'}
              </p>
              <p style="margin: 20px 0 0 0; font-size: 12px; color: #9ca3af;">
                Este es un email automático, por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `✅ Confirmación de Pedido #${orderId} - La Boutique de la Limpieza`,
      html: htmlContent
    });

    console.log("✅ Order confirmation email sent:", result);
    return result;

  } catch (error) {
    console.error("❌ Error sending order confirmation email:", error);
    throw new Error(`Failed to send order confirmation email: ${error.message}`);
  }
}

/**
 * Send shipping notification email to customer
 * @param {string} userEmail - Customer email address
 * @param {object} shippingDetails - Shipping information
 * @param {number} shippingDetails.orderId - Order ID
 * @param {string} shippingDetails.customerName - Customer name
 * @param {string} shippingDetails.trackingNumber - Tracking number
 * @param {string} shippingDetails.carrier - Shipping carrier name
 * @param {string} shippingDetails.estimatedDelivery - Estimated delivery date
 * @returns {Promise<object>} Resend API response
 */
export async function sendShippingNotificationEmail(userEmail, shippingDetails) {
  try {
    const { orderId, customerName, trackingNumber, carrier, estimatedDelivery } = shippingDetails;

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pedido Enviado</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">📦</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">¡Tu Pedido Está en Camino!</h1>
              <p style="margin: 10px 0 0 0; color: #d1fae5; font-size: 16px;">Pedido #${orderId}</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">Hola <strong>${customerName}</strong>,</p>
              
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                ¡Buenas noticias! Tu pedido ha sido enviado y está en camino hacia ti.
              </p>
              
              <!-- Tracking Info Box -->
              <table style="width: 100%; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 8px; margin: 30px 0; overflow: hidden;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #1e40af;">
                      Información de Seguimiento
                    </h2>
                    
                    <table style="width: 100%; margin-top: 15px;">
                      ${trackingNumber ? `
                        <tr>
                          <td style="padding: 8px 0; font-weight: 600; color: #374151;">Número de Seguimiento:</td>
                          <td style="padding: 8px 0; text-align: right; color: #1a4ac8; font-family: monospace; font-size: 16px; font-weight: bold;">
                            ${trackingNumber}
                          </td>
                        </tr>
                      ` : ''}
                      ${carrier ? `
                        <tr>
                          <td style="padding: 8px 0; font-weight: 600; color: #374151;">Empresa de Envío:</td>
                          <td style="padding: 8px 0; text-align: right; color: #1f2937;">
                            ${carrier}
                          </td>
                        </tr>
                      ` : ''}
                      ${estimatedDelivery ? `
                        <tr>
                          <td style="padding: 8px 0; font-weight: 600; color: #374151;">Entrega Estimada:</td>
                          <td style="padding: 8px 0; text-align: right; color: #059669; font-weight: 600;">
                            ${estimatedDelivery}
                          </td>
                        </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Call to Action -->
              <table role="presentation" style="margin: 40px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/cuenta/pedidos/${orderId}" 
                       style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                      Seguir mi Pedido
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Delivery Tips -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 30px 0;">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400e; font-size: 15px;">
                  💡 Consejos para la entrega:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 14px; line-height: 1.6;">
                  <li>Asegúrate de que alguien esté disponible para recibir el pedido</li>
                  <li>Verifica que la dirección de entrega sea correcta</li>
                  <li>Ten a mano tu DNI para la entrega</li>
                </ul>
              </div>
              
              <p style="margin: 30px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos. ¡Gracias por confiar en nosotros!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #1f2937; font-weight: 600;">
                La Boutique de la Limpieza
              </p>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                Envíos en CABA y Gran Buenos Aires
              </p>
              <p style="margin: 20px 0 0 0; font-size: 12px; color: #9ca3af;">
                Este es un email automático, por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `📦 Tu Pedido #${orderId} Ha Sido Enviado`,
      html: htmlContent
    });

    console.log("✅ Shipping notification email sent:", result);
    return result;

  } catch (error) {
    console.error("❌ Error sending shipping notification email:", error);
    throw new Error(`Failed to send shipping notification email: ${error.message}`);
  }
}

/**
 * Send marketing/promotional email to customer
 * @param {string} userEmail - Customer email address
 * @param {object} marketingContent - Marketing email content
 * @param {string} marketingContent.subject - Email subject
 * @param {string} marketingContent.title - Main title
 * @param {string} marketingContent.content - Main content/message
 * @param {string} marketingContent.ctaText - Call-to-action button text
 * @param {string} marketingContent.ctaLink - Call-to-action button link
 * @param {string} marketingContent.imageUrl - Optional promotional image URL
 * @returns {Promise<object>} Resend API response
 */
export async function sendMarketingEmail(userEmail, marketingContent) {
  try {
    const { subject, title, content, ctaText, ctaLink, imageUrl } = marketingContent;

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #f59e0b 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                ${title}
              </h1>
            </td>
          </tr>
          
          ${imageUrl ? `
            <!-- Promotional Image -->
            <tr>
              <td style="padding: 0;">
                <img src="${imageUrl}" alt="Promotional Banner" style="width: 100%; height: auto; display: block;" />
              </td>
            </tr>
          ` : ''}
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <div style="font-size: 16px; color: #374151; line-height: 1.8;">
                ${content}
              </div>
              
              ${ctaText && ctaLink ? `
                <!-- Call to Action -->
                <table role="presentation" style="margin: 40px 0;">
                  <tr>
                    <td align="center">
                      <a href="${ctaLink}" 
                         style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #dc2626 0%, #f59e0b 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">
                        ${ctaText}
                      </a>
                    </td>
                  </tr>
                </table>
              ` : ''}
              
              <!-- Benefits Section -->
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 8px; padding: 25px; margin: 30px 0;">
                <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 18px;">✨ Beneficios exclusivos:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #1e40af; line-height: 1.8;">
                  <li>Envíos gratis desde $50.000</li>
                  <li>Entrega en CABA y Gran Buenos Aires</li>
                  <li>Productos de alta calidad</li>
                  <li>Atención personalizada</li>
                </ul>
              </div>
              
              <p style="margin: 30px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6; text-align: center;">
                ¡No dejes pasar esta oportunidad! Oferta válida por tiempo limitado.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #1f2937; font-weight: 600;">
                La Boutique de la Limpieza
              </p>
              <p style="margin: 0 0 15px 0; font-size: 14px; color: #6b7280;">
                Tu tienda de productos de limpieza de confianza
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                Recibiste este email porque estás suscrito a nuestras promociones.<br>
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/unsubscribe" style="color: #6b7280; text-decoration: underline;">
                  Cancelar suscripción
                </a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: subject,
      html: htmlContent
    });

    console.log("✅ Marketing email sent:", result);
    return result;

  } catch (error) {
    console.error("❌ Error sending marketing email:", error);
    throw new Error(`Failed to send marketing email: ${error.message}`);
  }
}

/**
 * Send welcome email after email verification
 * @param {string} userEmail - User email address
 * @param {string} userName - User name
 * @returns {Promise<object>} Resend API response
 */
export async function sendWelcomeEmail(userEmail, userName) {
  try {
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Bienvenido/a!</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a4ac8 0%, #2563eb 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 52px; margin-bottom: 10px;">🎉</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">¡Cuenta Verificada!</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">Bienvenido/a a La Boutique de la Limpieza</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">Hola <strong>${userName}</strong>,</p>

              <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                Tu cuenta fue verificada exitosamente. Ya podés disfrutar de todos los beneficios de nuestra tienda.
              </p>

              <!-- Welcome Discount Box -->
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 2px solid #1a4ac8; border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Tu descuento de bienvenida</p>
                <p style="margin: 0 0 8px 0; font-size: 40px; font-weight: bold; color: #1a4ac8;">10% OFF</p>
                <p style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: #1f2937; letter-spacing: 2px; font-family: monospace;">PRIMERACOMPRA10</p>
                <p style="margin: 0; font-size: 13px; color: #6b7280;">Válido por 24 horas · Una sola vez · Aplica al total del pedido</p>
              </div>

              <!-- Benefits -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">✨ Lo que podés hacer ahora:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                  <li>Explorar más de 500 productos de limpieza</li>
                  <li>Guardar tus productos favoritos</li>
                  <li>Envíos gratis desde \$50.000 ARS</li>
                  <li>Entregas en CABA y Gran Buenos Aires</li>
                </ul>
              </div>

              <!-- CTA -->
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}"
                       style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1a4ac8 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                      Ir a la tienda
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #1f2937; font-weight: 600;">La Boutique de la Limpieza</p>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">Tu tienda de productos de limpieza de confianza</p>
              <p style="margin: 20px 0 0 0; font-size: 12px; color: #9ca3af;">Este es un email automático, por favor no respondas a este mensaje.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: "🎉 ¡Bienvenido/a a La Boutique de la Limpieza! Tu cuenta está activa",
      html: htmlContent
    });

    console.log("✅ Welcome email sent:", result);
    return result;

  } catch (error) {
    console.error("❌ Error sending welcome email:", error);
    throw new Error(`Failed to send welcome email: ${error.message}`);
  }
}

/**
 * Send a test email (useful for testing configuration)
 * @param {string} userEmail - Recipient email address
 * @returns {Promise<object>} Resend API response
 */
export async function sendTestEmail(userEmail) {
  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: "🧪 Test Email - Resend Integration",
      html: `
        <h1>Test Email</h1>
        <p>If you're reading this, Resend is working correctly!</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `
    });

    console.log("✅ Test email sent:", result);
    return result;

  } catch (error) {
    console.error("❌ Error sending test email:", error);
    throw new Error(`Failed to send test email: ${error.message}`);
  }
}

/**
 * Send email verification code to user
 * @param {string} userEmail - User email address
 * @param {object} verificationDetails - Verification information
 * @param {string} verificationDetails.userName - User name
 * @param {string} verificationDetails.verificationCode - 6-digit verification code
 * @returns {Promise<object>} Resend API response
 */
export async function sendVerificationCodeEmail(userEmail, verificationDetails) {
  try {
    const { userName, verificationCode } = verificationDetails;

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificación de Cuenta</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a4ac8 0%, #2563eb 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">🔐</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Verificá tu Cuenta</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">¡Bienvenido/a a La Boutique de la Limpieza!</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">Hola <strong>${userName}</strong>,</p>
              
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                Gracias por registrarte. Para completar tu registro y verificar tu cuenta, ingresá el siguiente código de verificación:
              </p>
              
              <!-- Verification Code Box — Stripe-style -->
              <table style="width: 100%; margin: 32px 0;" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" style="width: 380px; max-width: 100%; background: #f8faff; border: 1.5px solid #d1deff; border-radius: 16px; overflow: hidden;">

                      <!-- Top blue accent bar -->
                      <tr>
                        <td style="background: #1a4ac8; height: 5px; font-size: 0; line-height: 0;">&nbsp;</td>
                      </tr>

                      <!-- Label -->
                      <tr>
                        <td style="padding: 24px 32px 12px; text-align: center;">
                          <p style="margin: 0; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 2px;">
                            Código de verificación
                          </p>
                        </td>
                      </tr>

                      <!-- Big clickable code with copy icon -->
                      <tr>
                        <td style="padding: 0 32px 8px; text-align: center;">
                          <!-- user-select:all = un solo clic selecciona todo el código -->
                          <div style="display: inline-flex; align-items: center; gap: 10px; background: #ffffff; border: 2px solid #1a4ac8; border-radius: 12px; padding: 14px 24px; cursor: pointer;" title="Clic para seleccionar el código">
                            <span style="-webkit-user-select: all; -moz-user-select: all; user-select: all; font-size: 38px; font-weight: 900; font-family: 'Courier New', Courier, monospace; color: #1a4ac8; letter-spacing: 10px; line-height: 1;">
                              ${verificationCode}
                            </span>
                            <!-- Copy icon SVG -->
                            <span style="flex-shrink: 0; opacity: 0.55;" title="Copiá el código">
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="9" y="9" width="13" height="13" rx="2" stroke="#1a4ac8" stroke-width="2" fill="none"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="#1a4ac8" stroke-width="2" stroke-linecap="round"/>
                              </svg>
                            </span>
                          </div>
                        </td>
                      </tr>

                      <!-- Instruction -->
                      <tr>
                        <td style="padding: 10px 32px 28px; text-align: center;">
                          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                            👆 <strong>Un clic</strong> sobre el código lo selecciona · luego <strong>Ctrl+C</strong> para copiar
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Important Info Box -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 30px 0;">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400e; font-size: 15px;">
                  ⏱️ Información Importante:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 14px; line-height: 1.6;">
                  <li>Este código es válido por <strong>10 minutos</strong></li>
                  <li>No compartas este código con nadie</li>
                  <li>Si no solicitaste este código, ignorá este email</li>
                </ul>
              </div>
              
              <p style="margin: 30px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                Una vez verificada tu cuenta, podrás disfrutar de todos los beneficios de ser parte de nuestra comunidad.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #1f2937; font-weight: 600;">
                La Boutique de la Limpieza
              </p>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                Tu tienda de productos de limpieza de confianza
              </p>
              <p style="margin: 20px 0 0 0; font-size: 12px; color: #9ca3af;">
                Este es un email automático, por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `Código de Verificación: ${verificationCode} - La Boutique de la Limpieza`,
      html: htmlContent
    });

    console.log("✅ Verification code email sent:", result);
    return result;

  } catch (error) {
    console.error("❌ Error sending verification code email:", error);
    throw new Error(`Failed to send verification code email: ${error.message}`);
  }
}

export async function sendPasswordResetEmail(userEmail, { userName, resetCode }) {
  try {
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background-color:#2563eb;padding:30px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;">La Boutique de la Limpieza</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 30px;">
            <h2 style="margin:0 0 16px 0;color:#1f2937;font-size:22px;">Recuperar contraseña</h2>
            <p style="margin:0 0 24px 0;color:#374151;font-size:15px;">Hola <strong>${userName}</strong>, recibimos una solicitud para restablecer tu contraseña.</p>
            <p style="margin:0 0 12px 0;color:#374151;font-size:15px;">Tu código de recuperación es:</p>
            <div style="background-color:#f3f4f6;border-radius:8px;padding:24px;text-align:center;margin:0 0 24px 0;">
              <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#2563eb;">${resetCode}</span>
            </div>
            <div style="background-color:#fef3c7;border-left:4px solid #f59e0b;padding:15px;border-radius:4px;">
              <p style="margin:0 0 8px 0;font-weight:bold;color:#92400e;font-size:15px;">⏱️ Información importante:</p>
              <ul style="margin:0;padding-left:20px;color:#78350f;font-size:14px;line-height:1.6;">
                <li>Este código es válido por <strong>15 minutos</strong></li>
                <li>No compartas este código con nadie</li>
                <li>Si no solicitaste esto, ignorá este email</li>
              </ul>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background-color:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:13px;color:#6b7280;">La Boutique de la Limpieza &mdash; Email automático, no respondas.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `Código de recuperación: ${resetCode} - La Boutique`,
      html: htmlContent
    });

    console.log("✅ Password reset email sent:", result);
    return result;
  } catch (error) {
    console.error("❌ Error sending password reset email:", error);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}

