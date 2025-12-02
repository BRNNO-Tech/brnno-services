import React from 'react';
import { X } from 'lucide-react';

export default function SignupModal({ signupData, setSignupData, onEmailSignup, onGoogleSignup, onBack, onClose, onSwitchToLogin }) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-8 relative my-8 animate-fadeIn">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Create your account
                    </h2>
                    <p className="text-gray-600">
                        Choose your account type to get started
                    </p>
                </div>

                {/* Account Type Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        I want to sign up as:
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setSignupData({ ...signupData, accountType: 'customer' })}
                            className={`px-4 py-3 rounded-xl border-2 font-medium transition-all ${signupData.accountType === 'customer'
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-200 text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Customer
                        </button>
                        <button
                            type="button"
                            onClick={() => setSignupData({ ...signupData, accountType: 'provider' })}
                            className={`px-4 py-3 rounded-xl border-2 font-medium transition-all ${signupData.accountType === 'provider'
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-gray-200 text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Provider
                        </button>
                    </div>
                    {signupData.accountType === 'provider' && (
                        <p className="mt-2 text-xs text-gray-500">
                            Providers will need to complete additional information after signup
                        </p>
                    )}
                </div>

                <div className="space-y-4 mb-6">
                    <input
                        type="text"
                        value={signupData.name}
                        onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                        placeholder="Full Name"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                    />
                    <input
                        type="email"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        placeholder="Email"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                    />
                    <input
                        type="password"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        placeholder="Password"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                    />
                </div>

                <button
                    onClick={onEmailSignup}
                    disabled={!signupData.name || !signupData.email || !signupData.password}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors mb-4 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    Sign Up with Email
                </button>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-gray-500">or</span>
                    </div>
                </div>

                <button
                    onClick={() => {
                        // Store role in localStorage before Google sign-in
                        const role = signupData.accountType === 'provider' ? 'detailer' : 'customer';
                        localStorage.setItem('pendingUserRole', role);
                        onGoogleSignup();
                    }}
                    className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>

                <div className="flex items-center justify-center mt-4">
                    {onSwitchToLogin && (
                        <button
                            onClick={onSwitchToLogin}
                            className="text-blue-600 font-medium hover:text-blue-700"
                        >
                            Already have an account? Sign in
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

