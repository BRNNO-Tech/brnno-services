// Payment processing service using Stripe
import stripePromise from './stripe';

class PaymentService {
    constructor() {
        this.stripe = null;
    }

    // Initialize Stripe
    async initialize() {
        if (!this.stripe) {
            this.stripe = await stripePromise;
        }
        return this.stripe;
    }

    // Create payment intent for a booking
    async createPaymentIntent(bookingData) {
        try {
            const stripe = await this.initialize();
            
            // Calculate amounts
            const totalAmount = bookingData.service?.price || 0;
            const platformFee = Math.round(totalAmount * 0.15); // 15% platform fee
            const providerAmount = totalAmount - platformFee;

            // Create payment intent on your backend
            // For now, we'll simulate this - in production, call your backend API
            const paymentIntent = {
                id: 'pi_' + Math.random().toString(36).substr(2, 9),
                amount: totalAmount * 100, // Convert to cents
                currency: 'usd',
                status: 'requires_payment_method',
                metadata: {
                    bookingId: bookingData.id,
                    providerId: bookingData.provider?.id,
                    platformFee: platformFee,
                    providerAmount: providerAmount
                }
            };

            return paymentIntent;
        } catch (error) {
            console.error('Error creating payment intent:', error);
            throw error;
        }
    }

    // Process payment with card
    async processPayment(paymentIntentId, cardElement) {
        try {
            const stripe = await this.initialize();
            
            const { error, paymentIntent } = await stripe.confirmCardPayment(paymentIntentId, {
                payment_method: {
                    card: cardElement,
                }
            });

            if (error) {
                throw new Error(error.message);
            }

            return paymentIntent;
        } catch (error) {
            console.error('Error processing payment:', error);
            throw error;
        }
    }

    // Create payment method
    async createPaymentMethod(cardElement, billingDetails = {}) {
        try {
            const stripe = await this.initialize();
            
            const { error, paymentMethod } = await stripe.createPaymentMethod({
                type: 'card',
                card: cardElement,
                billing_details: billingDetails,
            });

            if (error) {
                throw new Error(error.message);
            }

            return paymentMethod;
        } catch (error) {
            console.error('Error creating payment method:', error);
            throw error;
        }
    }

    // Setup provider account for payouts (Stripe Connect)
    async createProviderAccount(providerData) {
        try {
            // In production, this would create a Stripe Connect account
            // For now, we'll simulate it
            const account = {
                id: 'acct_' + Math.random().toString(36).substr(2, 9),
                type: 'express',
                country: 'US',
                email: providerData.email,
                business_type: 'individual',
                capabilities: {
                    card_payments: 'active',
                    transfers: 'active'
                }
            };

            return account;
        } catch (error) {
            console.error('Error creating provider account:', error);
            throw error;
        }
    }

    // Process provider payout
    async processProviderPayout(providerId, amount, currency = 'usd') {
        try {
            // In production, this would transfer funds to provider's Stripe account
            // For now, we'll simulate it
            const transfer = {
                id: 'tr_' + Math.random().toString(36).substr(2, 9),
                amount: amount * 100, // Convert to cents
                currency: currency,
                destination: providerId,
                status: 'pending'
            };

            return transfer;
        } catch (error) {
            console.error('Error processing provider payout:', error);
            throw error;
        }
    }
}

export default new PaymentService();
