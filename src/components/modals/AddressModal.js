import React from 'react';
import { MapPin, X } from 'lucide-react';

export default function AddressModal({ address, setAddress, addressInputRef, onSubmit, onClose }) {
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
                        Where should we come?
                    </h2>
                    <p className="text-gray-600">
                        Enter your address to find nearby detailers
                    </p>
                </div>

                <input
                    ref={addressInputRef}
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Start typing your address..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none mb-6"
                />

                <button
                    onClick={onSubmit}
                    disabled={!address.trim()}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}

