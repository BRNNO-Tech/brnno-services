import React from 'react';
import { X } from 'lucide-react';

export default function LoginModal({ loginData, setLoginData, onEmailLogin, onGoogleLogin, onClose, onSwitchToSignup }) {
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
                        Welcome back
                    </h2>
                    <p className="text-gray-600">
                        Sign in to your account
                    </p>
                </div>

                <div className="space-y-4 mb-6">
                    <input
                        type="email"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        placeholder="Email"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && loginData.email && loginData.password) {
                                onEmailLogin();
                            }
                        }}
                    />
                    <input
                        type="password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        placeholder="Password"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && loginData.email && loginData.password) {
                                onEmailLogin();
                            }
                        }}
                    />
                </div>

                <button
                    onClick={onEmailLogin}
                    disabled={!loginData.email || !loginData.password}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors mb-4 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    Sign In
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
                    onClick={onGoogleLogin}
                    className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 mb-4"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>

                <div className="text-center">
                    <button
                        onClick={onSwitchToSignup}
                        className="text-blue-600 font-medium hover:text-blue-700"
                    >
                        Don't have an account? Sign up
                    </button>
                </div>
            </div>
        </div>
    );
}

