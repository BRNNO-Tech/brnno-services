import React, { useState } from 'react';
import { User, X } from 'lucide-react';

export default function GuestCheckoutModal({ onContinue, onSignUp, onClose }) {
    const [guestEmail, setGuestEmail] = useState('');
    const [guestName, setGuestName] = useState('');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-8 relative animate-fadeIn">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="mb-6">
                    <User className="w-12 h-12 text-blue-600 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Continue as Guest
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Complete your booking without creating an account. A receipt will be sent to your email.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                            <strong>Note:</strong> To save addresses, vehicles, or track bookings, you'll need to create an account.
                        </p>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            placeholder="your.email@example.com"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name (Optional)
                        </label>
                        <input
                            type="text"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => onContinue({ email: guestEmail.trim(), name: guestName.trim() })}
                        disabled={!guestEmail || !guestEmail.includes('@')}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        Continue to Payment
                    </button>
                    <button
                        onClick={onSignUp}
                        className="w-full border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                    >
                        Create Account Instead
                    </button>
                </div>
            </div>
        </div>
    );
}

