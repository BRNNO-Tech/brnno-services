import React from 'react';
import { Shield, MapPin, Star } from 'lucide-react';

export default function LandingPage({ onGetStarted }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white">
            <div className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
                <div className="text-center mb-12 sm:mb-16">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6">Welcome to Brnno</h1>
                    <p className="text-lg sm:text-xl md:text-2xl text-blue-100 mb-8 sm:mb-12 px-4">
                        Premium mobile detailing at your fingertips
                    </p>
                    <div className="flex items-center justify-center px-4">
                        <button
                            onClick={onGetStarted}
                            className="w-full sm:w-auto bg-white text-blue-600 px-8 sm:px-12 py-3 sm:py-4 rounded-xl text-lg sm:text-xl font-semibold hover:bg-blue-50 transition-all transform hover:scale-105 shadow-2xl"
                        >
                            Get Started
                        </button>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mt-12 sm:mt-20 px-4">
                    <FeatureCard
                        icon={Shield}
                        title="Vetted Professionals"
                        description="All detailers are background checked and insured"
                    />
                    <FeatureCard
                        icon={MapPin}
                        title="Mobile Service"
                        description="They come to you - home, office, or anywhere"
                    />
                    <FeatureCard
                        icon={Star}
                        title="Quality Guaranteed"
                        description="Read reviews and choose the best for your needs"
                    />
                </div>
            </div>
        </div>
    );
}

function FeatureCard({ icon: Icon, title, description }) {
    return (
        <div className="bg-white/10 backdrop-blur-lg p-6 sm:p-8 rounded-2xl border border-white/20">
            <Icon className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-bold mb-2">{title}</h3>
            <p className="text-sm sm:text-base text-blue-100">{description}</p>
        </div>
    );
}

