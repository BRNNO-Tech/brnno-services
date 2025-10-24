// Secure configuration for API keys
// For development, you can set these directly here
// For production, use Vercel environment variables

const config = {
    // Google Maps API Key
    // Set this in your .env file as REACT_APP_GOOGLE_MAPS_API_KEY
    // Or set it directly here for development (NOT recommended for production)
    googleMapsApiKey: window.GOOGLE_MAPS_API_KEY || '',
    
    // Stripe API Keys
    // Set these in your .env file as REACT_APP_STRIPE_PUBLISHABLE_KEY
    // Or set them directly here for development (NOT recommended for production)
    stripePublishableKey: 'pk_test_51SAg8pPbLPDcISuo3tL9zQ0SwWtnpMtEabkOadMIttxZbbnZ7OUa1QAUwR0hpCHuEaSLv5mpNRJNL3q29QkisUgR00Pp4LXstT', // Replace with your key
    
    // Firebase Configuration (if needed)
    firebase: {
        apiKey: '',
        authDomain: '',
        projectId: '',
    }
};

export default config;
