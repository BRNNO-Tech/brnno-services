// Secure configuration for API keys
// These should be set via environment variables in production

const config = {
    // Google Maps API Key
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    
    // Stripe API Keys
    stripePublishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    
    // Firebase Configuration
    firebase: {
        apiKey: process.env.REACT_APP_FIREBASE_API_KEY || '',
        authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || '',
    }
};

export default config;
