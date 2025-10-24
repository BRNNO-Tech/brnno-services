# 🔐 Secure API Keys Setup Guide

## ⚠️ CRITICAL: API Keys Exposed!

Your API keys were exposed in the code, which is a major security risk. Follow these steps immediately:

## 🚨 Immediate Actions Required:

### 1. **Regenerate Your API Keys**
- **Google Maps API**: Go to Google Cloud Console → APIs & Services → Credentials → Regenerate key
- **Stripe API**: Go to Stripe Dashboard → Developers → API Keys → Regenerate keys

### 2. **Set Up Environment Variables**

#### **For Local Development:**
Create a `.env` file in your project root:
```bash
# Google Maps API Key
REACT_APP_GOOGLE_MAPS_API_KEY=your_new_google_maps_key_here

# Stripe API Keys
REACT_APP_STRIPE_PUBLISHABLE_KEY=your_new_stripe_publishable_key_here
STRIPE_SECRET_KEY=your_new_stripe_secret_key_here
```

#### **For Vercel Production:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:
   - `REACT_APP_GOOGLE_MAPS_API_KEY` = `your_new_google_maps_key`
   - `REACT_APP_STRIPE_PUBLISHABLE_KEY` = `your_new_stripe_publishable_key`
   - `STRIPE_SECRET_KEY` = `your_new_stripe_secret_key`

### 3. **Update Your Code**
The code has been updated to use environment variables instead of hardcoded keys.

### 4. **Test Your Setup**
- Restart your development server
- Check that API keys are loaded from environment variables
- Test Google Maps and Stripe functionality

## 🔒 Security Best Practices:

### **Google Maps API:**
- ✅ **HTTP Referrer Restrictions**: Add your domains to allowed referrers
- ✅ **API Restrictions**: Only enable Maps JavaScript API, Geocoding API
- ✅ **Billing Alerts**: Set up usage alerts
- ✅ **Monitor Usage**: Check for unusual activity

### **Stripe API:**
- ✅ **Webhook Endpoints**: Set up webhooks for payment events
- ✅ **Test vs Live Keys**: Use test keys for development
- ✅ **Monitor Dashboard**: Check for unusual transactions

## 🚀 Next Steps:

1. **Regenerate all exposed keys**
2. **Set up environment variables**
3. **Test the application**
4. **Monitor for any abuse**

## ⚠️ Important Notes:

- **Never commit API keys to git**
- **Use environment variables for all secrets**
- **Regularly rotate your API keys**
- **Monitor usage and set up alerts**

Your application is now secure! 🔐✨
