# Stripe Webhook Setup Guide - Outback Gems & Minerals

## Overview
This webhook system automatically processes Stripe payments and:
- ✅ Sends detailed shipping emails with customer & order info to you
- ✅ Updates inventory stock counts automatically
- ✅ Handles international shipping restrictions

**Note:** Only shipping notification emails are sent to you. Customer confirmation emails are handled separately by you.

## Prerequisites
1. Stripe account with webhooks enabled
2. Resend account for email delivery
3. Google Sheets with inventory data
4. Netlify Functions deployment

## Setup Steps

### 1. Environment Variables
Add these to your Netlify environment variables:

```
STRIPE_SECRET_KEY=sk_live_... (your existing key)
STRIPE_WEBHOOK_SECRET=whsec_... (from step 2)
RESEND_API_KEY=re_... (from step 3)
GOOGLE_SHEETS_INVENTORY_UPDATE_URL=https://script.google.com/... (from step 4)
SHIPPING_EMAIL=your-email@outbackgems.com.au (optional, defaults to support@outbackgems.com.au)
```

### 2. Stripe Webhook Configuration

1. **Go to Stripe Dashboard** → Developers → Webhooks
2. **Click "Add endpoint"**
3. **Endpoint URL:** `https://your-site.netlify.app/.netlify/functions/stripe-webhook`
4. **Events to listen for:**
   - `checkout.session.completed`
5. **Copy the Webhook Secret** (starts with `whsec_`)
6. **Add to Netlify environment variables** as `STRIPE_WEBHOOK_SECRET`

### 3. Resend Email Setup

1. **Sign up at** [resend.com](https://resend.com)
2. **Verify your domain:** `outbackgems.com.au`
3. **Create API key** in dashboard
4. **Add to Netlify environment variables** as `RESEND_API_KEY`

### 4. Inventory Management

The webhook system will automatically update your local `inventory.json` file when orders are completed. 

**How it works:**
1. When a customer completes a purchase, the webhook receives the order data
2. For each product purchased, it calls the `update-inventory` function
3. This function reads your `inventory.json` file, finds the matching product by ID and weight
4. Reduces the stock count by the quantity purchased
5. Saves the updated inventory back to the JSON file

**No additional setup required** - the inventory update function is automatically deployed with your site.

### 5. Deploy Webhook Functions

The webhook functions (`stripe-webhook.js` and `update-inventory.js`) will be automatically deployed with your Netlify site.

### 6. Test the Setup

1. **Test webhook endpoint:**
   ```bash
   curl -X POST https://your-site.netlify.app/.netlify/functions/stripe-webhook
   # Should return: {"error":"Invalid signature"}
   ```

2. **Test inventory update:**
   ```bash
   curl -X POST https://your-site.netlify.app/.netlify/functions/update-inventory \
     -H "Content-Type: application/json" \
     -d '{"productId":"sap001","weight":"5.5","quantityToReduce":1}'
   # Should return: {"success":true,"message":"Inventory updated successfully",...}
   ```

3. **Test complete flow:**
   - Make a test purchase on your site
   - Check that emails are sent
   - Verify inventory is updated

## Webhook Event Flow

```
Customer completes purchase
         ↓
Stripe sends webhook to your site
         ↓
Webhook processes order data
         ↓
┌─────────────────┬─────────────────┐
│  Send Email     │ Update Inventory │
│  • Shipping     │  • Reduce stock  │
│    notification │  • Update JSON   │
│    to you only  │    file locally  │
└─────────────────┴─────────────────┘
```

## Email Templates

### Shipping Email Features:
- 🚚 Clear "ACTION REQUIRED" alerts
- 📋 Complete customer information  
- 📦 Product details with IDs for easy picking
- 💰 Payment confirmation
- 📍 Full shipping address

**Note:** Customer confirmation emails are not sent automatically - you handle those separately.

## Troubleshooting

### Common Issues:

1. **Webhook signature verification fails:**
   - Check `STRIPE_WEBHOOK_SECRET` is correct
   - Ensure endpoint URL matches exactly

2. **Emails not sending:**
   - Verify `RESEND_API_KEY` is valid
   - Check domain verification in Resend
   - Look at Netlify function logs

3. **Inventory not updating:**
   - Test the update-inventory function directly
   - Check that inventory.json file is writable in Netlify
   - Verify product IDs and weights match exactly

4. **International orders getting through:**
   - Check your existing payment restrictions
   - Webhook processes all completed payments

### Debugging:

1. **Check Netlify Function Logs:**
   - Go to Netlify dashboard → Functions
   - Click on `stripe-webhook`
   - View real-time logs

2. **Check Stripe Webhook Logs:**
   - Go to Stripe dashboard → Webhooks
   - Click your webhook endpoint
   - View attempt logs

3. **Check Google Apps Script Logs:**
   - In Apps Script editor → Executions
   - View function execution logs

## Security Considerations

- ✅ Webhook signature verification prevents unauthorized requests
- ✅ Google Sheets API requires authentication
- ✅ Resend API key protects email sending
- ✅ Environment variables keep secrets secure

## Monitoring

### Key Metrics to Monitor:
- Webhook success rate (should be 100%)
- Email delivery rate
- Inventory accuracy
- Customer satisfaction

### Recommended Alerts:
- Failed webhook deliveries
- Email sending failures
- Inventory sync issues

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Netlify function logs
3. Test each component individually
4. Verify all environment variables are set correctly

The system is designed to be robust - even if one component fails (like email), the others will still work (like inventory updates).
