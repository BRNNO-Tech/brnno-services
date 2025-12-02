import React from 'react';
import { MapPin, X } from 'lucide-react';

export default function ZipCodeModal({ zipCode, setZipCode, onSubmit, onClose, onSkip }) {
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
                    <MapPin className="w-12 h-12 text-blue-600 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Enter Your Zip Code
                    </h2>
                    <p className="text-gray-600">
                        We'll show you detailers near your location
                    </p>
                </div>

                <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                        setZipCode(value);
                    }}
                    placeholder="12345"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none mb-6 text-center text-2xl font-semibold"
                    maxLength={5}
                />

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => onSubmit(zipCode)}
                        disabled={zipCode.length !== 5}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        Find Detailers
                    </button>
                    <button
                        onClick={onSkip}
                        className="w-full border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                    >
                        Skip for now
                    </button>
                </div>
            </div>
        </div>
    );
}

