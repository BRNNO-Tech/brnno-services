# Google Maps API Setup Guide

## 🗺️ Getting Started with Google Maps API

### 1. Get Your API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - **Maps JavaScript API**
   - **Geocoding API**
   - **Places API**
   - **Distance Matrix API** (optional)
4. Create credentials → API Key
5. Restrict the API key to your domain for security

### 2. Add API Key to Your Project

Create a `.env` file in your project root:

```bash
REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 3. Features Implemented

- ✅ **Location-based search** - Find providers near user
- ✅ **Distance calculation** - Show providers within radius
- ✅ **Geocoding** - Convert addresses to coordinates
- ✅ **Reverse geocoding** - Get city/state from coordinates
- ✅ **"Use My Location" button** - Auto-detect user location

### 4. Cost Estimation

- **Geocoding**: $5 per 1,000 requests
- **Maps JavaScript API**: $7 per 1,000 loads
- **Places API**: $17 per 1,000 requests
- **Typical small app**: $10-50/month

### 5. Security Best Practices ⚠️ CRITICAL

#### API Key Restrictions (REQUIRED)

1. **Go to Google Cloud Console** → APIs & Services → Credentials
2. **Edit your API key**
3. **Application restrictions** → Select "HTTP referrers"
4. **Add your domains**:
   - `https://yourdomain.com/*`
   - `https://your-vercel-app.vercel.app/*`
   - `http://localhost:3000/*` (for development)
5. **API restrictions** → Select "Restrict key"
6. **Only enable these APIs**:
   - Maps JavaScript API
   - Geocoding API
   - Places API (optional)

#### Additional Security

- Enable billing alerts
- Monitor usage in Google Cloud Console
- Use environment variables (never commit API keys)
- Set spending limits

### 6. Testing

1. Add your API key to `.env`
2. Run `npm start`
3. Click "My Location" button
4. Check browser console for location data
5. Verify providers show up based on location

## 🚀 Next Steps

- Add provider location collection during signup
- Implement radius-based search
- Add map visualization
- Create location-based notifications
