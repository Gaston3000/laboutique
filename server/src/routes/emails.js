import express from "express";
import {
  sendOrderConfirmationEmail,
  sendShippingNotificationEmail,
  sendMarketingEmail,
  sendTestEmail
} from "../services/emailService.js";

const router = express.Router();

/**
 * POST /api/emails/test
 * Send a test email to verify Resend configuration
 */
router.post("/test", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email address is required"
      });
    }

    const result = await sendTestEmail(email);

    res.json({
      success: true,
      message: "Test email sent successfully",
      data: result
    });

  } catch (error) {
    console.error("Error sending test email:", error);
    res.status(500).json({
      error: "Failed to send test email",
      details: error.message
    });
  }
});

/**
 * POST /api/emails/order-confirmation
 * Send order confirmation email
 * 
 * Example request body:
 * {
 *   "email": "customer@example.com",
 *   "orderDetails": {
 *     "orderId": 123,
 *     "customerName": "Juan Pérez",
 *     "totalArs": 45000,
 *     "items": [
 *       {
 *         "product_name": "Detergente Ala",
 *         "wix_variant": "500ml",
 *         "quantity": 2,
 *         "unit_price_ars": 1500
 *       }
 *     ],
 *     "deliveryAddress": "Av. Corrientes 1234, CABA"
 *   }
 * }
 */
router.post("/order-confirmation", async (req, res) => {
  try {
    const { email, orderDetails } = req.body;

    if (!email || !orderDetails) {
      return res.status(400).json({
        error: "Email and orderDetails are required"
      });
    }

    const result = await sendOrderConfirmationEmail(email, orderDetails);

    res.json({
      success: true,
      message: "Order confirmation email sent successfully",
      data: result
    });

  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    res.status(500).json({
      error: "Failed to send order confirmation email",
      details: error.message
    });
  }
});

/**
 * POST /api/emails/shipping-notification
 * Send shipping notification email
 * 
 * Example request body:
 * {
 *   "email": "customer@example.com",
 *   "shippingDetails": {
 *     "orderId": 123,
 *     "customerName": "Juan Pérez",
 *     "trackingNumber": "AR123456789",
 *     "carrier": "Correo Argentino",
 *     "estimatedDelivery": "3-5 días hábiles"
 *   }
 * }
 */
router.post("/shipping-notification", async (req, res) => {
  try {
    const { email, shippingDetails } = req.body;

    if (!email || !shippingDetails) {
      return res.status(400).json({
        error: "Email and shippingDetails are required"
      });
    }

    const result = await sendShippingNotificationEmail(email, shippingDetails);

    res.json({
      success: true,
      message: "Shipping notification email sent successfully",
      data: result
    });

  } catch (error) {
    console.error("Error sending shipping notification email:", error);
    res.status(500).json({
      error: "Failed to send shipping notification email",
      details: error.message
    });
  }
});

/**
 * POST /api/emails/marketing
 * Send marketing/promotional email
 * 
 * Example request body:
 * {
 *   "email": "customer@example.com",
 *   "marketingContent": {
 *     "subject": "🔥 ¡Oferta Especial! 25% OFF en toda la tienda",
 *     "title": "¡Gran Promoción de Primavera!",
 *     "content": "<p>Estimado cliente,</p><p>Estamos emocionados de ofrecerte un <strong>25% de descuento</strong> en todos nuestros productos de limpieza. ¡No te lo pierdas!</p>",
 *     "ctaText": "Comprar Ahora",
 *     "ctaLink": "https://laboutique.com/promociones",
 *     "imageUrl": "https://example.com/promotion-banner.jpg"
 *   }
 * }
 */
router.post("/marketing", async (req, res) => {
  try {
    const { email, marketingContent } = req.body;

    if (!email || !marketingContent) {
      return res.status(400).json({
        error: "Email and marketingContent are required"
      });
    }

    const result = await sendMarketingEmail(email, marketingContent);

    res.json({
      success: true,
      message: "Marketing email sent successfully",
      data: result
    });

  } catch (error) {
    console.error("Error sending marketing email:", error);
    res.status(500).json({
      error: "Failed to send marketing email",
      details: error.message
    });
  }
});

export default router;
