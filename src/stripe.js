import { loadStripe } from '@stripe/stripe-js';
import config from './config';

// Initialize Stripe with publishable key from environment variables
const stripePromise = loadStripe(config.stripePublishableKey);

export default stripePromise;
