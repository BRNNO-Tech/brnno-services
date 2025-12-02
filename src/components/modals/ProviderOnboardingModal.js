import React from 'react';
import { X } from 'lucide-react';

export default function ProviderOnboardingModal({ providerOnboardingData, setProviderOnboardingData, addressInputRef, onSubmit, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-8 relative my-8 animate-fadeIn">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Complete Your Provider Profile
                    </h2>
                    <p className="text-gray-600">
                        Please provide your business information to get started
                    </p>
                </div>

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Business Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={providerOnboardingData.businessName}
                            onChange={(e) => setProviderOnboardingData({ ...providerOnboardingData, businessName: e.target.value })}
                            placeholder="Your Business Name"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Business Address <span className="text-red-500">*</span>
                        </label>
                        <input
                            ref={addressInputRef}
                            type="text"
                            value={providerOnboardingData.businessAddress}
                            onChange={(e) => setProviderOnboardingData({ ...providerOnboardingData, businessAddress: e.target.value })}
                            placeholder="Start typing your business address..."
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            This address will be used to help customers find you
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Service Area (Optional)
                        </label>
                        <input
                            type="text"
                            value={providerOnboardingData.serviceArea}
                            onChange={(e) => setProviderOnboardingData({ ...providerOnboardingData, serviceArea: e.target.value })}
                            placeholder="e.g., Los Angeles, CA or 25 miles radius"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Business Phone (Optional)
                        </label>
                        <input
                            type="tel"
                            value={providerOnboardingData.phone}
                            onChange={(e) => setProviderOnboardingData({ ...providerOnboardingData, phone: e.target.value })}
                            placeholder="(555) 123-4567"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Business Email (Optional)
                        </label>
                        <input
                            type="email"
                            value={providerOnboardingData.email}
                            onChange={(e) => setProviderOnboardingData({ ...providerOnboardingData, email: e.target.value })}
                            placeholder="business@example.com"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                        />
                    </div>
                </div>

                <button
                    onClick={onSubmit}
                    disabled={!providerOnboardingData.businessName || !providerOnboardingData.businessAddress}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    Complete Setup
                </button>
            </div>
        </div>
    );
}

