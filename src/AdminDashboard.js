import React, { useState, useEffect } from 'react';
import { getWaitlistAnalytics } from './firebaseService';

const AdminDashboard = () => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const data = await getWaitlistAnalytics();
                setAnalytics(data);
            } catch (error) {
                console.error('Error fetching analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600">Error loading analytics</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-8">BRNNO Waitlist Analytics</h1>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Signups</h3>
                        <p className="text-3xl font-bold text-cyan-600">{analytics.totalCount}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Recent Signups</h3>
                        <p className="text-3xl font-bold text-green-600">{analytics.recentSignups}</p>
                        <p className="text-sm text-gray-600 mt-1">Last 24 hours</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Top City</h3>
                        <p className="text-xl font-bold text-blue-600">
                            {Object.keys(analytics.byCity).reduce((a, b) => analytics.byCity[a] > analytics.byCity[b] ? a : b, 'N/A')}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                            {Math.max(...Object.values(analytics.byCity))} signups
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Cities */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Signups by City</h3>
                        <div className="space-y-3">
                            {Object.entries(analytics.byCity)
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 10)
                                .map(([city, count]) => (
                                    <div key={city} className="flex justify-between items-center">
                                        <span className="text-gray-700">{city}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-cyan-500 h-2 rounded-full"
                                                    style={{ width: `${(count / Math.max(...Object.values(analytics.byCity))) * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm font-semibold text-gray-800 w-8 text-right">{count}</span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Services */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Most Wanted Services</h3>
                        <div className="space-y-3">
                            {Object.entries(analytics.byService)
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 7)
                                .map(([service, count]) => (
                                    <div key={service} className="flex justify-between items-center">
                                        <span className="text-gray-700">{service}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-orange-500 h-2 rounded-full"
                                                    style={{ width: `${(count / Math.max(...Object.values(analytics.byService))) * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm font-semibold text-gray-800 w-8 text-right">{count}</span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Urgency */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Booking Urgency</h3>
                        <div className="space-y-3">
                            {Object.entries(analytics.byUrgency)
                                .sort(([, a], [, b]) => b - a)
                                .map(([urgency, count]) => (
                                    <div key={urgency} className="flex justify-between items-center">
                                        <span className="text-gray-700 capitalize">{urgency.replace('_', ' ')}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full"
                                                    style={{ width: `${(count / Math.max(...Object.values(analytics.byUrgency))) * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm font-semibold text-gray-800 w-8 text-right">{count}</span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Vehicle Types */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Vehicle Types</h3>
                        <div className="space-y-3">
                            {Object.entries(analytics.byVehicleType)
                                .sort(([, a], [, b]) => b - a)
                                .map(([vehicleType, count]) => (
                                    <div key={vehicleType} className="flex justify-between items-center">
                                        <span className="text-gray-700 capitalize">{vehicleType.replace('_', ' ')}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-purple-500 h-2 rounded-full"
                                                    style={{ width: `${(count / Math.max(...Object.values(analytics.byVehicleType))) * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm font-semibold text-gray-800 w-8 text-right">{count}</span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
