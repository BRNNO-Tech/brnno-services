import React from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const CARD_ELEMENT_OPTIONS = {
    style: {
        base: {
            fontSize: '16px',
            color: '#424770',
            '::placeholder': {
                color: '#aab7c4',
            },
        },
        invalid: {
            color: '#9e2146',
        },
    },
};

const StripeCardInput = ({ onCardChange, onCardError }) => {
    const stripe = useStripe();
    const elements = useElements();

    const handleChange = (event) => {
        if (event.error) {
            onCardError(event.error.message);
        } else {
            onCardError(null);
        }
        onCardChange(event);
    };

    return (
        <div className="w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
                Card Information
            </label>
            <div className="border border-gray-300 rounded-lg p-3 focus-within:ring-2 focus-within:ring-cyan-500 focus-within:border-transparent">
                <CardElement
                    options={CARD_ELEMENT_OPTIONS}
                    onChange={handleChange}
                />
            </div>
        </div>
    );
};

export default StripeCardInput;
