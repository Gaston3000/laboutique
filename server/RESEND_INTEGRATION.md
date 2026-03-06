# 📧 Resend Email Integration

This document explains how to use the Resend email service integration in your project.

## 📁 File Structure

```
server/
├── src/
│   ├── services/
│   │   └── emailService.js     # Email service with reusable functions
│   └── routes/
│       └── emails.js            # API endpoints for sending emails
├── .env                         # Environment variables (DO NOT COMMIT)
└── .env.example                 # Example environment variables
```

## ⚙️ Setup Instructions

### 1. Install Dependencies

The Resend package is already installed. If needed, you can reinstall with:

```bash
cd server
npm install resend
```

### 2. Configure Environment Variables

#### Add your Resend API key to `.env` file:

**Location:** `server/.env`

```env
RESEND_API_KEY=re_your_actual_api_key_here
```

⚠️ **IMPORTANT:** 
- Never commit the `.env` file to git (it's already in `.gitignore`)
- The API key is secret and should only be stored in environment variables
- Get your API key from: https://resend.com/api-keys

### 3. Restart the Server

After adding the API key, restart your development server:

```bash
npm run dev
```

## 🚀 Available Email Functions

The email service (`emailService.js`) provides these functions:

### 1. Send Order Confirmation Email

```javascript
import { sendOrderConfirmationEmail } from './services/emailService.js';

await sendOrderConfirmationEmail('customer@example.com', {
  orderId: 123,
  customerName: 'Juan Pérez',
  totalArs: 45000,
  items: [
    {
      product_name: 'Detergente Ala',
      wix_variant: '500ml',
      quantity: 2,
      unit_price_ars: 1500
    }
  ],
  deliveryAddress: 'Av. Corrientes 1234, CABA'
});
```

### 2. Send Shipping Notification Email

```javascript
import { sendShippingNotificationEmail } from './services/emailService.js';

await sendShippingNotificationEmail('customer@example.com', {
  orderId: 123,
  customerName: 'Juan Pérez',
  trackingNumber: 'AR123456789',
  carrier: 'Correo Argentino',
  estimatedDelivery: '3-5 días hábiles'
});
```

### 3. Send Marketing Email

```javascript
import { sendMarketingEmail } from './services/emailService.js';

await sendMarketingEmail('customer@example.com', {
  subject: '🔥 ¡Oferta Especial! 25% OFF',
  title: '¡Gran Promoción de Primavera!',
  content: '<p>Estimado cliente,</p><p>Oferta especial...</p>',
  ctaText: 'Comprar Ahora',
  ctaLink: 'https://laboutique.com/promociones',
  imageUrl: 'https://example.com/banner.jpg' // Optional
});
```

### 4. Send Test Email

```javascript
import { sendTestEmail } from './services/emailService.js';

await sendTestEmail('your-email@example.com');
```

## 🧪 Testing the Integration

### Using API Endpoints (Recommended)

You can test using curl, Postman, or any HTTP client:

#### 1. Test Basic Email

```bash
curl -X POST http://localhost:4000/api/emails/test \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

#### 2. Test Order Confirmation

```bash
curl -X POST http://localhost:4000/api/emails/order-confirmation \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dylandecaso1520@gmail.com",
    "orderDetails": {
      "orderId": 123,
      "customerName": "Dylan De Caso",
      "totalArs": 45000,
      "items": [
        {
          "product_name": "Detergente Ala",
          "wix_variant": "500ml",
          "quantity": 2,
          "unit_price_ars": 1500
        }
      ],
      "deliveryAddress": "Av. Corrientes 1234, CABA"
    }
  }'
```

#### 3. Test Shipping Notification

```bash
curl -X POST http://localhost:4000/api/emails/shipping-notification \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dylandecaso1520@gmail.com",
    "shippingDetails": {
      "orderId": 123,
      "customerName": "Dylan De Caso",
      "trackingNumber": "AR123456789",
      "carrier": "Correo Argentino",
      "estimatedDelivery": "3-5 días hábiles"
    }
  }'
```

#### 4. Test Marketing Email

```bash
curl -X POST http://localhost:4000/api/emails/marketing \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dylandecaso1520@gmail.com",
    "marketingContent": {
      "subject": "🔥 ¡Oferta Especial! 25% OFF",
      "title": "¡Gran Promoción de Primavera!",
      "content": "<p>Estimado cliente,</p><p>Estamos emocionados de ofrecerte un <strong>25% de descuento</strong> en todos nuestros productos de limpieza. ¡No te lo pierdas!</p>",
      "ctaText": "Comprar Ahora",
      "ctaLink": "http://localhost:5173/promociones"
    }
  }'
```

## 📝 Integration Examples

### Example 1: Sending Order Confirmation When Order is Created

In `routes/orders.js`:

```javascript
import { sendOrderConfirmationEmail } from '../services/emailService.js';

router.post('/orders', async (req, res) => {
  try {
    // Create order in database
    const order = await createOrder(req.body);
    
    // Send confirmation email
    try {
      await sendOrderConfirmationEmail(req.body.customerEmail, {
        orderId: order.id,
        customerName: order.customer_name,
        totalArs: order.total_ars,
        items: order.items,
        deliveryAddress: order.customer_address
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the order creation if email fails
    }
    
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Example 2: Sending Shipping Notification When Order Status Updates

In `routes/admin.js`:

```javascript
import { sendShippingNotificationEmail } from '../services/emailService.js';

router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status, trackingNumber } = req.body;
    
    // Update order status
    const order = await updateOrderStatus(req.params.id, status);
    
    // If order is shipped, send notification
    if (status === 'enviado' && order.contact_email) {
      try {
        await sendShippingNotificationEmail(order.contact_email, {
          orderId: order.id,
          customerName: order.customer_name,
          trackingNumber: trackingNumber || 'En preparación',
          carrier: 'Correo Argentino',
          estimatedDelivery: '3-5 días hábiles'
        });
      } catch (emailError) {
        console.error('Failed to send shipping notification:', emailError);
      }
    }
    
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🎨 Email Templates

All email templates are responsive and include:

- ✅ Mobile-friendly design
- ✅ Professional branding
- ✅ Clear call-to-action buttons
- ✅ Gradient backgrounds
- ✅ Proper spacing and typography

You can customize the templates in `emailService.js`:
- Change colors
- Update content
- Add images
- Modify layout

## 🔒 Security Best Practices

1. ✅ API key is stored in environment variables
2. ✅ `.env` file is in `.gitignore`
3. ✅ Error handling prevents sensitive data leakage
4. ✅ Email validation should be added before sending

## 📊 Monitoring

Check the server console for email sending logs:

```
✅ Order confirmation email sent: { id: 'xxx', ... }
✅ Shipping notification email sent: { id: 'xxx', ... }
✅ Marketing email sent: { id: 'xxx', ... }
❌ Error sending email: Error message...
```

## 🐛 Troubleshooting

### Email not sending?

1. **Check API key:** Make sure `RESEND_API_KEY` is correctly set in `.env`
2. **Restart server:** After adding the API key, restart the server
3. **Check email domain:** Free tier uses `onboarding@resend.dev`, update `FROM_EMAIL` in production
4. **Check logs:** Look for error messages in the console
5. **Verify recipient:** Make sure the recipient email is valid

### Common errors:

- `Missing API key`: Add `RESEND_API_KEY` to `.env`
- `Invalid email`: Check email format
- `Rate limit`: Free tier has sending limits
- `Domain not verified`: In production, you need to verify your domain

## 🚀 Production Deployment

Before deploying to production:

1. **Verify your domain** in Resend dashboard
2. **Update FROM_EMAIL** in `emailService.js`:
   ```javascript
   const FROM_EMAIL = "La Boutique <noreply@yourdomain.com>";
   ```
3. **Add RESEND_API_KEY** to your hosting environment variables
4. **Test all email types** before going live
5. **Monitor email delivery** in Resend dashboard

## 📚 Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference/introduction)
- [Email Best Practices](https://resend.com/docs/knowledge-base/email-best-practices)

---

**Created by:** Dylan De Caso  
**Date:** March 6, 2026
