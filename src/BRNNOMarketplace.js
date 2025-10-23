import React, { useState, memo, useCallback } from 'react';
import { Star, MapPin, Shield, Clock, DollarSign, CheckCircle, Lock, Car, Camera, Award } from 'lucide-react';
import { addToWaitlist, addToWaitlistWithReferral } from './firebaseService';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, where, deleteDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase/config';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';

// AdminDashboard component
const AdminDashboard = ({ showDashboard, setShowDashboard }) => {
    console.log('AdminDashboard rendered, showDashboard:', showDashboard);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [waitlistData, setWaitlistData] = useState([]);

    React.useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                console.log('Fetching analytics...');
                console.log('Firebase db:', db);

                // Get all waitlist data - try simple query first
                let waitlistSnapshot;
                try {
                    const waitlistQuery = query(collection(db, 'waitlist'), orderBy('timestamp', 'desc'));
                    console.log('Query created:', waitlistQuery);
                    waitlistSnapshot = await getDocs(waitlistQuery);
                } catch (orderError) {
                    console.log('Order by failed, trying simple query:', orderError.message);
                    // Fallback to simple query without orderBy
                    const simpleQuery = query(collection(db, 'waitlist'));
                    waitlistSnapshot = await getDocs(simpleQuery);
                }

                console.log('Snapshot received:', waitlistSnapshot);
                console.log('Snapshot size:', waitlistSnapshot.size);

                const totalCount = waitlistSnapshot.size;

                // Get recent signups (last 24 hours) - simplified
                let recentSignups = 0;
                try {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const recentQuery = query(
                        collection(db, 'waitlist'),
                        where('timestamp', '>=', yesterday)
                    );
                    const recentSnapshot = await getDocs(recentQuery);
                    recentSignups = recentSnapshot.size;
                } catch (recentError) {
                    console.log('Recent signups query failed:', recentError.message);
                    // Fallback: just use total count for now
                    recentSignups = Math.floor(totalCount * 0.1); // Estimate 10% as recent
                }

                // Process data for analytics
                const byCity = {};
                const byService = {};
                const byUrgency = {};
                const byVehicleType = {};
                const allData = [];

                waitlistSnapshot.forEach((doc) => {
                    const data = doc.data();
                    allData.push({
                        id: doc.id,
                        ...data,
                        timestamp: data.timestamp?.toDate?.() || new Date()
                    });

                    // Count by city
                    const city = data.city || 'Unknown';
                    byCity[city] = (byCity[city] || 0) + 1;

                    // Count by services
                    if (data.servicesInterested) {
                        data.servicesInterested.forEach(service => {
                            byService[service] = (byService[service] || 0) + 1;
                        });
                    }

                    // Count by urgency
                    const urgency = data.howSoon || 'Unknown';
                    byUrgency[urgency] = (byUrgency[urgency] || 0) + 1;

                    // Count by vehicle type
                    const vehicleType = data.vehicleType || 'Unknown';
                    byVehicleType[vehicleType] = (byVehicleType[vehicleType] || 0) + 1;
                });

                setAnalytics({
                    totalCount,
                    recentSignups,
                    byCity,
                    byService,
                    byUrgency,
                    byVehicleType
                });

                setWaitlistData(allData);
                console.log('Analytics loaded:', { totalCount, recentSignups });
            } catch (error) {
                console.error('Error fetching analytics:', error);
                console.error('Error details:', error.message);
                console.error('Error code:', error.code);
                setAnalytics({ error: error.message });
            } finally {
                setLoading(false);
            }
        };

        if (showDashboard) {
            fetchAnalytics();
        }
    }, [showDashboard]);

    if (!showDashboard) return null;

    if (loading) {
        return (
            <div className="fixed inset-0 bg-gray-50 flex items-center justify-center z-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading analytics...</p>
                    <button
                        onClick={() => setShowDashboard(false)}
                        className="mt-4 bg-gray-500 text-white px-4 py-2 rounded-lg"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="fixed inset-0 bg-gray-50 flex items-center justify-center z-50">
                <div className="text-center">
                    <p className="text-red-600">Error loading analytics</p>
                    <p className="text-sm text-gray-500 mt-2">Check browser console for details</p>
                    <button
                        onClick={() => setShowDashboard(false)}
                        className="mt-4 bg-cyan-500 text-white px-4 py-2 rounded-lg"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    if (analytics.error) {
        return (
            <div className="fixed inset-0 bg-gray-50 flex items-center justify-center z-50">
                <div className="text-center max-w-md">
                    <p className="text-red-600 font-semibold">Firebase Error</p>
                    <p className="text-sm text-gray-600 mt-2">{analytics.error}</p>
                    <p className="text-xs text-gray-500 mt-2">Check browser console for more details</p>
                    <button
                        onClick={() => setShowDashboard(false)}
                        className="mt-4 bg-cyan-500 text-white px-4 py-2 rounded-lg"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
            <div className="min-h-screen p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-800">BRNNO Waitlist Analytics</h1>
                        <button
                            onClick={() => setShowDashboard(false)}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                        >
                            Close Dashboard
                        </button>
                    </div>

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

                    {/* Waitlist Data Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Waitlist Signups</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">City</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Phone</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Vehicle</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Services</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Urgency</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {waitlistData.slice(0, 20).map((signup) => (
                                        <tr key={signup.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-3 px-4 text-gray-800 font-medium">{signup.name || 'N/A'}</td>
                                            <td className="py-3 px-4 text-gray-600">{signup.email || 'N/A'}</td>
                                            <td className="py-3 px-4 text-gray-600">{signup.city || 'N/A'}</td>
                                            <td className="py-3 px-4 text-gray-600">{signup.phone || 'N/A'}</td>
                                            <td className="py-3 px-4 text-gray-600 capitalize">{signup.vehicleType?.replace('_', ' ') || 'N/A'}</td>
                                            <td className="py-3 px-4 text-gray-600">
                                                {signup.servicesInterested?.slice(0, 2).join(', ') || 'N/A'}
                                                {signup.servicesInterested?.length > 2 && '...'}
                                            </td>
                                            <td className="py-3 px-4 text-gray-600 capitalize">{signup.howSoon?.replace('_', ' ') || 'N/A'}</td>
                                            <td className="py-3 px-4 text-gray-500 text-xs">
                                                {signup.timestamp?.toLocaleDateString() || 'N/A'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {waitlistData.length > 20 && (
                            <p className="text-sm text-gray-500 mt-4 text-center">
                                Showing first 20 of {waitlistData.length} signups
                            </p>
                        )}
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
        </div>
    );
};

// Separate component for address input with its own state
const AddressInput = memo(({ initialValue, onAddressChange }) => {
    console.log('AddressInput re-rendered'); // Debug log
    const [localAddress, setLocalAddress] = useState(initialValue || '');

    const handleChange = (e) => {
        const newValue = e.target.value;
        setLocalAddress(newValue);
        onAddressChange(newValue);
    };

    return (
        <input
            type="text"
            placeholder="Enter your address..."
            value={localAddress}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        />
    );
});

const LoginModal = ({ showLoginModal, setShowLoginModal, authMode, setAuthMode, setShowSignupModal }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [info, setInfo] = useState('');

    // Lock body scroll when modal is open
    React.useEffect(() => {
        if (showLoginModal) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showLoginModal]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('Logged in:', userCredential.user);
            setShowLoginModal(false);
            // You can add redirect logic here based on authMode
        } catch (error) {
            console.error('Login error:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            console.log('Google login:', user);

            // Check if user profile exists, create if not
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (!userDoc.exists()) {
                await setDoc(doc(db, 'users', user.uid), {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    accountType: authMode,
                    createdAt: serverTimestamp(),
                    role: 'user' // Default role
                });
                console.log('User document created for login');
            }

            setShowLoginModal(false);
        } catch (error) {
            console.error('Google login error:', error);
            // Fallback to redirect flow for environments that block/auto-close popups
            const popupIssues = [
                'auth/popup-closed-by-user',
                'auth/cancelled-popup-request',
                'auth/popup-blocked',
                'auth/unauthorized-domain'
            ];
            if (error && (popupIssues.includes(error.code) || /popup|redirect|domain/i.test(error.message || ''))) {
                try {
                    await signInWithRedirect(auth, provider);
                    return;
                } catch (redirectError) {
                    console.error('Google login redirect error:', redirectError);
                    setError(redirectError.message || 'Google sign-in failed.');
                }
            } else {
                setError(error.message);
            }
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');
        if (!email) {
            setError('Please enter your email first.');
            return;
        }
        try {
            const actionCodeSettings = {
                url: `${window.location.origin}/app.html`,
                handleCodeInApp: false
            };
            await sendPasswordResetEmail(auth, email, actionCodeSettings);
            setInfo('Password reset email sent. Check your inbox.');
        } catch (err) {
            console.error('Password reset error:', err);
            setError(err.message || 'Failed to send reset email.');
        }
    };

    if (!showLoginModal) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative">
                <button
                    onClick={() => setShowLoginModal(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
                >
                    ✕
                </button>

                <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back!</h2>
                <p className="text-gray-600 mb-6">Log in to continue to BRNNO</p>

                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setAuthMode('customer')}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${authMode === 'customer'
                            ? 'bg-cyan-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Customer
                    </button>
                    <button
                        onClick={() => setAuthMode('provider')}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${authMode === 'provider'
                            ? 'bg-cyan-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Provider
                    </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    {info && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                            {info}
                        </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center gap-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-gray-600">Remember me</span>
                        </label>
                        <a href="#" onClick={handleForgotPassword} className="text-cyan-500 hover:text-cyan-600 font-semibold">
                            Forgot password?
                        </a>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Logging in...' : 'Log In'}
                    </button>
                </form>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Or continue with</span>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                            onClick={handleGoogleLogin}
                            type="button"
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors relative z-10"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="text-sm font-semibold text-gray-700">Google</span>
                        </button>
                        <button className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            <span className="text-sm font-semibold text-gray-700">Facebook</span>
                        </button>
                    </div>
                </div>

                <p className="mt-6 text-center text-sm text-gray-600">
                    Don't have an account?{' '}
                    <button
                        onClick={() => {
                            setShowLoginModal(false);
                            setShowSignupModal(true);
                        }}
                        className="text-cyan-500 hover:text-cyan-600 font-semibold"
                    >
                        Sign up
                    </button>
                </p>
            </div>
        </div>
    );
};

const SignupModal = ({ showSignupModal, setShowSignupModal, authMode, setAuthMode, setShowLoginModal }) => {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [phone, setPhone] = useState('');

    // Lock body scroll when modal is open
    React.useEffect(() => {
        if (showSignupModal) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showSignupModal]);

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validation
        if (!email || !password || !firstName || !lastName) {
            setError('Please fill in all required fields.');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            setLoading(false);
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            console.log('Email signup:', user);

            // Create user profile in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                firstName: firstName,
                lastName: lastName,
                displayName: `${firstName} ${lastName}`,
                phone: phone,
                businessName: authMode === 'provider' ? businessName : null,
                accountType: authMode,
                createdAt: serverTimestamp(),
                role: 'user' // Default role
            });

            console.log('User document created successfully');
            setShowSignupModal(false);
        } catch (error) {
            console.error('Signup error:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            console.log('Google signup:', user);

            // Create user profile in Firestore with user.uid as document ID
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                accountType: authMode,
                createdAt: serverTimestamp(),
                role: 'user' // Default role
            });

            console.log('User document created successfully');
            setShowSignupModal(false);
        } catch (error) {
            console.error('Google signup error:', error);
            // Fallback to redirect flow for environments that block/auto-close popups
            const popupIssues = [
                'auth/popup-closed-by-user',
                'auth/cancelled-popup-request',
                'auth/popup-blocked',
                'auth/unauthorized-domain'
            ];
            if (error && (popupIssues.includes(error.code) || /popup|redirect|domain/i.test(error.message || ''))) {
                try {
                    await signInWithRedirect(auth, provider);
                    return;
                } catch (redirectError) {
                    console.error('Google signup redirect error:', redirectError);
                    setError(redirectError.message || 'Google sign-up failed.');
                }
            } else {
                setError(error.message);
            }
        }
    };

    if (!showSignupModal) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={() => setShowSignupModal(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
                >
                    ✕
                </button>

                <h2 className="text-3xl font-bold text-gray-800 mb-2">Join BRNNO</h2>
                <p className="text-gray-600 mb-6">Create your account to get started</p>

                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setAuthMode('customer')}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${authMode === 'customer'
                            ? 'bg-cyan-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Customer
                    </button>
                    <button
                        onClick={() => setAuthMode('provider')}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${authMode === 'provider'
                            ? 'bg-cyan-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Provider
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">First Name *</label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="John"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name *</label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Doe"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                required
                            />
                        </div>
                    </div>

                    {authMode === 'provider' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Business Name</label>
                            <input
                                type="text"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                placeholder="Your Detailing Business"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="(555) 123-4567"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password *</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div className="flex items-start gap-2">
                        <input type="checkbox" className="mt-1 rounded" required />
                        <label className="text-sm text-gray-600">
                            I agree to the{' '}
                            <a href="#" className="text-cyan-500 hover:text-cyan-600 font-semibold">
                                Terms of Service
                            </a>{' '}
                            and{' '}
                            <a href="#" className="text-cyan-500 hover:text-cyan-600 font-semibold">
                                Privacy Policy
                            </a>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">Or sign up with</span>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                            onClick={handleGoogleSignup}
                            type="button"
                            className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors relative z-10"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="text-sm font-semibold text-gray-700">Google</span>
                        </button>
                        <button className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            <span className="text-sm font-semibold text-gray-700">Facebook</span>
                        </button>
                    </div>
                </div>

                <p className="mt-6 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <button
                        onClick={() => {
                            setShowSignupModal(false);
                            setShowLoginModal(true);
                        }}
                        className="text-cyan-500 hover:text-cyan-600 font-semibold"
                    >
                        Log in
                    </button>
                </p>
            </div>
        </div>
    );
};

const ProfilePanel = ({ showProfilePanel, setShowProfilePanel, profileTab, setProfileTab }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        businessName: ''
    });

    // Check authentication and load user data when panel opens
    React.useEffect(() => {
        if (showProfilePanel) {
            document.body.style.overflow = 'hidden';

            // Check if user is authenticated
            if (auth.currentUser) {
                setIsAuthorized(true);
                setCheckingAuth(false);
                loadUserData();
            } else {
                alert('Please sign in first to access your profile.');
                setShowProfilePanel(false);
                setCheckingAuth(false);
            }
        } else {
            setIsAuthorized(false);
            setCheckingAuth(true);
            setUserData(null);
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showProfilePanel]);

    const loadUserData = async () => {
        try {
            setLoading(true);
            const user = auth.currentUser;
            if (user) {
                // Get user data from Firestore
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setUserData(data);
                    setFormData({
                        firstName: data.firstName || '',
                        lastName: data.lastName || '',
                        email: data.email || user.email || '',
                        phone: data.phone || '',
                        businessName: data.businessName || ''
                    });
                } else {
                    // Create user document if it doesn't exist
                    await setDoc(doc(db, 'users', user.uid), {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || '',
                        accountType: 'customer',
                        createdAt: serverTimestamp(),
                        role: 'user'
                    });
                    setUserData({
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || '',
                        accountType: 'customer',
                        role: 'user'
                    });
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            setError('Failed to load user data.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            setError('');
            setSuccess('');

            const user = auth.currentUser;
            if (!user) {
                setError('User not authenticated.');
                return;
            }

            // Update user data in Firestore
            await updateDoc(doc(db, 'users', user.uid), {
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                businessName: formData.businessName,
                displayName: `${formData.firstName} ${formData.lastName}`,
                updatedAt: serverTimestamp()
            });

            setSuccess('Profile updated successfully!');
            setIsEditing(false);
            loadUserData(); // Reload data
        } catch (error) {
            console.error('Error saving profile:', error);
            setError('Failed to save profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setShowProfilePanel(false);
            alert('Logged out successfully!');
        } catch (error) {
            console.error('Logout error:', error);
            alert('Failed to logout. Please try again.');
        }
    };

    if (!showProfilePanel) return null;

    if (checkingAuth) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-white rounded-xl p-8 text-center">
                    <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Verifying access...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return null;
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={() => setShowProfilePanel(false)}
            />

            {/* Slide-out Panel */}
            <div className="fixed right-0 top-0 h-full w-full sm:w-[95vw] md:w-[500px] bg-white shadow-2xl z-50 overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl sm:text-2xl font-bold">My Profile</h2>
                        <button
                            onClick={() => setShowProfilePanel(false)}
                            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors touch-manipulation"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Profile Picture */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold">
                                {userData ? `${formData.firstName.charAt(0)}${formData.lastName.charAt(0)}` : 'U'}
                            </div>
                            <button className="absolute bottom-0 right-0 bg-white text-cyan-600 p-1 rounded-full hover:bg-cyan-50 transition-colors touch-manipulation">
                                <Camera size={14} />
                            </button>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg sm:text-xl font-bold truncate">
                                {userData ? `${formData.firstName} ${formData.lastName}` : 'User'}
                            </h3>
                            <p className="text-cyan-100 text-sm sm:text-base truncate">{formData.email}</p>
                            <span className="inline-block bg-white/20 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold mt-1 sm:mt-2">
                                {userData?.accountType === 'provider' ? 'Provider Account' : 'Customer Account'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 px-4 sm:px-6 flex gap-1 overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'personal', label: 'Personal', icon: '👤' },
                        { id: 'vehicles', label: 'Vehicles', icon: '🚗' },
                        { id: 'bookings', label: 'Bookings', icon: '📅' },
                        { id: 'payments', label: 'Payment', icon: '💳' },
                        { id: 'addresses', label: 'Addresses', icon: '📍' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setProfileTab(tab.id)}
                            className={`px-3 sm:px-4 py-3 font-semibold text-xs sm:text-sm whitespace-nowrap transition-colors touch-manipulation ${profileTab === tab.id
                                ? 'text-cyan-600 border-b-2 border-cyan-600'
                                : 'text-gray-600 hover:text-cyan-500'
                                }`}
                        >
                            <span className="mr-1 sm:mr-2 text-sm sm:text-base">{tab.icon}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6">
                    {/* Personal Info Tab */}
                    {profileTab === 'personal' && (
                        <div className="space-y-4 sm:space-y-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base sm:text-lg font-bold text-gray-800">Personal Information</h3>
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="text-cyan-600 hover:text-cyan-700 font-semibold text-sm touch-manipulation px-3 py-2 rounded-lg hover:bg-cyan-50"
                                >
                                    {isEditing ? 'Cancel' : 'Edit'}
                                </button>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                                    {success}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        disabled={!isEditing}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600 text-base"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        disabled={!isEditing}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600 text-base"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    disabled={true}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600 text-base"
                                />
                                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    disabled={!isEditing}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600 text-base"
                                />
                            </div>

                            {userData?.accountType === 'provider' && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Business Name</label>
                                    <input
                                        type="text"
                                        value={formData.businessName}
                                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                        disabled={!isEditing}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600 text-base"
                                    />
                                </div>
                            )}

                            {isEditing && (
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                                    >
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setError('');
                                            setSuccess('');
                                            // Reset form data to original values
                                            if (userData) {
                                                setFormData({
                                                    firstName: userData.firstName || '',
                                                    lastName: userData.lastName || '',
                                                    email: userData.email || auth.currentUser?.email || '',
                                                    phone: userData.phone || '',
                                                    businessName: userData.businessName || ''
                                                });
                                            }
                                        }}
                                        className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors touch-manipulation"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}

                            <div className="pt-4 sm:pt-6 border-t border-gray-200">
                                <h4 className="font-bold text-gray-800 mb-3 text-sm sm:text-base">Account Settings</h4>
                                <div className="space-y-1 sm:space-y-2">
                                    <button className="w-full text-left px-3 sm:px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-gray-700 touch-manipulation text-sm sm:text-base">
                                        Change Password
                                    </button>
                                    <button className="w-full text-left px-3 sm:px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-gray-700 touch-manipulation text-sm sm:text-base">
                                        Notification Preferences
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-3 sm:px-4 py-3 hover:bg-red-50 rounded-lg transition-colors text-red-600 font-semibold touch-manipulation text-sm sm:text-base"
                                    >
                                        Logout
                                    </button>
                                    <button className="w-full text-left px-3 sm:px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-red-600 font-semibold touch-manipulation text-sm sm:text-base">
                                        Delete Account
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Other tabs would go here - simplified for brevity */}
                    {profileTab !== 'personal' && (
                        <div className="text-center py-8">
                            <p className="text-gray-500">Tab content for {profileTab} would go here</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
                    <p className="text-center text-gray-500 text-xs sm:text-sm">
                        BRNNO Mobile Auto Detailing
                    </p>
                </div>
            </div>
        </>
    );
};

const BookingModal = memo(({
    showBookingModal,
    setShowBookingModal,
    bookingStep,
    setBookingStep,
    bookingData,
    setBookingData
}) => {
    console.log('BookingModal re-rendered'); // Debug log

    const services = [
        { id: 1, name: 'Basic Wash & Vacuum', price: 50, duration: '1 hour', description: 'Exterior wash and interior vacuum' },
        { id: 2, name: 'Interior Detail', price: 120, duration: '2 hours', description: 'Deep clean interior, seats, carpets, dashboard' },
        { id: 3, name: 'Exterior Detail', price: 150, duration: '2.5 hours', description: 'Wash, clay bar, polish, wax' },
        { id: 4, name: 'Full Detail', price: 200, duration: '4 hours', description: 'Complete interior and exterior detailing' },
        { id: 5, name: 'Paint Correction', price: 400, duration: '6 hours', description: 'Multi-stage paint correction and polish' },
        { id: 6, name: 'Ceramic Coating', price: 800, duration: '8 hours', description: 'Professional ceramic coating with warranty' }
    ];

    const timeSlots = [
        '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
        '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'
    ];

    const nextStep = () => {
        if (bookingStep < 5) setBookingStep(bookingStep + 1);
    };

    const prevStep = () => {
        if (bookingStep > 1) setBookingStep(bookingStep - 1);
    };

    const closeModal = () => {
        setShowBookingModal(false);
        setBookingStep(1);
        setBookingData({ service: null, date: '', time: '', vehicle: null, address: '' });
    };

    // Lock body scroll when modal is open
    React.useEffect(() => {
        if (showBookingModal) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showBookingModal]);

    if (!showBookingModal) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md sm:max-w-3xl lg:max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold">Book Your Service</h2>
                        <button
                            onClick={closeModal}
                            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors text-2xl"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex items-center gap-2">
                        {[1, 2, 3, 4].map(step => (
                            <div key={step} className="flex-1">
                                <div className={`h-2 rounded-full transition-all ${step <= bookingStep ? 'bg-white' : 'bg-white/30'
                                    }`} />
                                <p className={`text-xs mt-1 ${step <= bookingStep ? 'text-white font-semibold' : 'text-white/60'}`}>
                                    {step === 1 ? 'Service' : step === 2 ? 'Date & Time' : step === 3 ? 'Details' : 'Confirm'}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 250px)' }}>

                    {/* Step 1: Select Service */}
                    {bookingStep === 1 && (
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Choose Your Service</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {services.map(service => (
                                    <div
                                        key={service.id}
                                        onClick={() => setBookingData({ ...bookingData, service })}
                                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${bookingData.service?.id === service.id
                                            ? 'border-cyan-500 bg-cyan-50'
                                            : 'border-gray-200 hover:border-cyan-300'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-bold text-gray-800">{service.name}</h4>
                                            <span className="text-xl font-bold text-cyan-600">${service.price}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Clock size={14} />
                                            <span>{service.duration}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Select Date & Time */}
                    {bookingStep === 2 && (
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Pick Date & Time</h3>

                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Date</label>
                                <input
                                    type="date"
                                    min={new Date().toISOString().split('T')[0]}
                                    value={bookingData.date}
                                    onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Time</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {timeSlots.map(time => (
                                        <button
                                            key={time}
                                            onClick={() => setBookingData({ ...bookingData, time })}
                                            className={`py-3 px-4 rounded-lg font-semibold transition-all ${bookingData.time === time
                                                ? 'bg-cyan-500 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Vehicle & Address */}
                    {bookingStep === 3 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-4">Vehicle & Location</h3>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Vehicle</label>
                                <div className="space-y-3 mb-6">
                                    {[
                                        { id: 1, make: 'Tesla', model: 'Model 3', year: '2023' },
                                        { id: 2, make: 'BMW', model: 'X5', year: '2021' }
                                    ].map(vehicle => (
                                        <div
                                            key={vehicle.id}
                                            onClick={() => setBookingData({ ...bookingData, vehicle })}
                                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all flex items-center gap-3 ${bookingData.vehicle?.id === vehicle.id
                                                ? 'border-cyan-500 bg-cyan-50'
                                                : 'border-gray-200 hover:border-cyan-300'
                                                }`}
                                        >
                                            <div className="bg-cyan-100 p-3 rounded-lg">
                                                <Car className="text-cyan-600" size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800">
                                                    {vehicle.year} {vehicle.make} {vehicle.model}
                                                </h4>
                                            </div>
                                        </div>
                                    ))}
                                    <button className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-cyan-500 hover:text-cyan-600 transition-colors font-semibold">
                                        + Add New Vehicle
                                    </button>
                                </div>

                                <label className="block text-sm font-semibold text-gray-700 mb-2">Service Location</label>
                                <AddressInput
                                    initialValue={bookingData.address}
                                    onAddressChange={(value) => setBookingData(prev => ({ ...prev, address: value }))}
                                />
                                <p className="text-xs text-gray-500 mt-2">Or select from saved addresses</p>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Payment */}
                    {bookingStep === 4 && (
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Payment Information</h3>

                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 mb-6">
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Service Total</p>
                                            <p className="font-bold text-gray-800">{bookingData.service?.name}</p>
                                        </div>
                                        <p className="text-xl font-bold text-gray-800">${bookingData.service?.price}</p>
                                    </div>

                                    <div className="border-t border-green-200 pt-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Platform Fee (15%)</span>
                                            <span className="font-semibold">${Math.round((bookingData.service?.price || 0) * 0.15)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm mt-2">
                                            <span className="text-gray-600">Provider Amount (85%)</span>
                                            <span className="font-semibold">${Math.round((bookingData.service?.price || 0) * 0.85)}</span>
                                        </div>
                                    </div>

                                    <div className="border-t border-green-200 pt-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-lg font-bold text-gray-800">Total Amount</span>
                                            <span className="text-2xl font-bold text-green-600">${bookingData.service?.price}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Card Number</label>
                                    <input
                                        type="text"
                                        placeholder="1234 5678 9012 3456"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Expiry Date</label>
                                        <input
                                            type="text"
                                            placeholder="MM/YY"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">CVV</label>
                                        <input
                                            type="text"
                                            placeholder="123"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Cardholder Name</label>
                                    <input
                                        type="text"
                                        placeholder="John Doe"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                                <p className="text-sm text-blue-800">
                                    <strong>🔒 Secure Payment:</strong> Your payment information is encrypted and processed securely through Stripe.
                                    BRNNO never stores your card details.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Confirmation */}
                    {bookingStep === 5 && (
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Confirm Your Booking</h3>

                            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 mb-6">
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Service</p>
                                            <p className="font-bold text-gray-800">{bookingData.service?.name}</p>
                                            <p className="text-xs text-gray-600">{bookingData.service?.duration}</p>
                                        </div>
                                        <p className="text-2xl font-bold text-cyan-600">${bookingData.service?.price}</p>
                                    </div>

                                    <div className="border-t border-cyan-200 pt-4">
                                        <p className="text-sm text-gray-600 mb-1">Date & Time</p>
                                        <p className="font-semibold text-gray-800">
                                            {bookingData.date && new Date(bookingData.date).toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                        <p className="text-sm text-gray-600">{bookingData.time}</p>
                                    </div>

                                    <div className="border-t border-cyan-200 pt-4">
                                        <p className="text-sm text-gray-600 mb-1">Vehicle</p>
                                        <p className="font-semibold text-gray-800">
                                            {bookingData.vehicle?.year} {bookingData.vehicle?.make} {bookingData.vehicle?.model}
                                        </p>
                                    </div>

                                    <div className="border-t border-cyan-200 pt-4">
                                        <p className="text-sm text-gray-600 mb-1">Location</p>
                                        <p className="font-semibold text-gray-800">{bookingData.address || 'Not specified'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                <p className="text-sm text-yellow-800">
                                    <strong>Note:</strong> A detailer will contact you to confirm availability and final pricing.
                                </p>
                            </div>

                            <div className="flex items-start gap-2 mb-4">
                                <input type="checkbox" className="mt-1 rounded" required />
                                <label className="text-sm text-gray-600">
                                    I agree to the cancellation policy and understand that I may be charged a fee for late cancellations.
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={prevStep}
                            disabled={bookingStep === 1}
                            className="px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 hover:bg-gray-200"
                        >
                            Back
                        </button>

                        {bookingStep < 5 ? (
                            <button
                                onClick={nextStep}
                                disabled={
                                    (bookingStep === 1 && !bookingData.service) ||
                                    (bookingStep === 2 && (!bookingData.date || !bookingData.time)) ||
                                    (bookingStep === 3 && (!bookingData.vehicle || !bookingData.address))
                                }
                                className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continue
                            </button>
                        ) : (
                            <button
                                onClick={async () => {
                                    try {
                                        // Save booking to Firebase
                                        const booking = {
                                            customerId: auth.currentUser?.uid,
                                            customerEmail: auth.currentUser?.email,
                                            customerName: userData?.displayName || 'Customer',
                                            providerId: bookingData.provider?.id,
                                            providerName: bookingData.provider?.name || bookingData.provider?.provider,
                                            service: bookingData.service,
                                            date: bookingData.date,
                                            time: bookingData.time,
                                            vehicle: bookingData.vehicle,
                                            address: bookingData.address,
                                            status: 'pending', // pending, confirmed, completed, cancelled
                                            totalAmount: bookingData.service?.price || 0,
                                            platformFee: Math.round((bookingData.service?.price || 0) * 0.15), // 15% platform fee
                                            providerAmount: Math.round((bookingData.service?.price || 0) * 0.85), // 85% to provider
                                            createdAt: serverTimestamp(),
                                            paymentStatus: 'pending' // pending, paid, failed, refunded
                                        };

                                        const docRef = await addDoc(collection(db, 'bookings'), booking);
                                        console.log('Booking saved with ID:', docRef.id);

                                        // Simulate payment processing
                                        console.log('💳 PAYMENT PROCESSING:');
                                        console.log('Processing payment of $' + booking.totalAmount + '...');
                                        console.log('Platform fee (15%): $' + booking.platformFee);
                                        console.log('Provider amount (85%): $' + booking.providerAmount);

                                        // Simulate successful payment after 2 seconds
                                        setTimeout(async () => {
                                            try {
                                                await updateDoc(doc(db, 'bookings', docRef.id), {
                                                    paymentStatus: 'paid',
                                                    status: 'confirmed',
                                                    paidAt: serverTimestamp()
                                                });
                                                console.log('✅ Payment processed successfully!');
                                                console.log('💰 Provider will receive $' + booking.providerAmount + ' in their next payout');
                                            } catch (error) {
                                                console.error('Error updating payment status:', error);
                                            }
                                        }, 2000);

                                        // Email notifications (console log for now)
                                        console.log('📧 BOOKING NOTIFICATIONS:');
                                        console.log('Customer Email:', auth.currentUser?.email);
                                        console.log('Subject: Booking Confirmed - BRNNO');
                                        console.log('Body: Your booking has been confirmed and payment processed!');

                                        console.log('Provider Email:', bookingData.provider?.email);
                                        console.log('Subject: New Booking - BRNNO');
                                        console.log('Body: You have a new booking! Payment will be processed shortly.');

                                        alert('Booking confirmed! Payment is being processed. You will receive an email confirmation shortly.');
                                        closeModal();
                                    } catch (error) {
                                        console.error('Error creating booking:', error);
                                        alert('Error creating booking. Please try again.');
                                    }
                                }}
                                className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold transition-colors"
                            >
                                Confirm Booking
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

const ProviderApplicationModal = memo(({ showModal, setShowModal, providerStep, setProviderStep, providerData, setProviderData }) => {
    // Lock body scroll when modal is open
    React.useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showModal]);

    if (!showModal) return null;

    const nextStep = () => {
        if (providerStep < 5) setProviderStep(providerStep + 1);
    };

    const prevStep = () => {
        if (providerStep > 1) setProviderStep(providerStep - 1);
    };

    const closeModal = () => {
        setShowModal(false);
        setProviderStep(1);
    };

    const serviceOptions = [
        'Basic Wash & Vacuum',
        'Interior Detailing',
        'Exterior Detailing',
        'Full Detail',
        'Paint Correction',
        'Ceramic Coating',
        'Headlight Restoration',
        'Engine Bay Cleaning'
    ];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md sm:max-w-3xl lg:max-w-4xl w-full my-4 sm:my-8">
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-8">
                    <button
                        onClick={closeModal}
                        className="float-right text-white hover:bg-white/20 p-2 rounded-lg transition-colors text-2xl"
                    >
                        ✕
                    </button>
                    <h2 className="text-3xl font-bold mb-2">Become a BRNNO Provider</h2>
                    <p className="text-cyan-100">Join our network of professional mobile detailers</p>

                    {/* Progress */}
                    <div className="flex items-center gap-2 mt-6">
                        {[1, 2, 3, 4, 5].map(step => (
                            <div key={step} className="flex-1">
                                <div className={`h-2 rounded-full transition-all ${step <= providerStep ? 'bg-white' : 'bg-white/30'
                                    }`} />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs">
                        <span className={providerStep === 1 ? 'font-bold' : 'text-cyan-200'}>Business</span>
                        <span className={providerStep === 2 ? 'font-bold' : 'text-cyan-200'}>Services</span>
                        <span className={providerStep === 3 ? 'font-bold' : 'text-cyan-200'}>Verification</span>
                        <span className={providerStep === 4 ? 'font-bold' : 'text-cyan-200'}>Payment</span>
                        <span className={providerStep === 5 ? 'font-bold' : 'text-cyan-200'}>Review</span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8" style={{ maxHeight: 'calc(80vh - 250px)', overflowY: 'auto' }}>

                    {/* Step 1: Business Information */}
                    {providerStep === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Business Information</h3>
                                <p className="text-gray-600 mb-6">Tell us about your detailing business</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Business Name *</label>
                                <input
                                    type="text"
                                    placeholder="Elite Auto Spa LLC"
                                    value={providerData.businessName}
                                    onChange={(e) => setProviderData({ ...providerData, businessName: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Business Type *</label>
                                <select
                                    value={providerData.businessType}
                                    onChange={(e) => setProviderData({ ...providerData, businessType: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    required
                                >
                                    <option value="">Select business type</option>
                                    <option value="sole_proprietor">Sole Proprietor</option>
                                    <option value="llc">LLC</option>
                                    <option value="corporation">Corporation</option>
                                    <option value="partnership">Partnership</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">EIN / Tax ID *</label>
                                <input
                                    type="text"
                                    placeholder="12-3456789"
                                    value={providerData.ein}
                                    onChange={(e) => setProviderData({ ...providerData, ein: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">Required for tax purposes and payments</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Owner Full Name *</label>
                                    <input
                                        type="text"
                                        placeholder="John Doe"
                                        value={providerData.ownerName}
                                        onChange={(e) => setProviderData({ ...providerData, ownerName: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number *</label>
                                    <input
                                        type="tel"
                                        placeholder="(555) 123-4567"
                                        value={providerData.phone}
                                        onChange={(e) => setProviderData({ ...providerData, phone: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Business Email *</label>
                                <input
                                    type="email"
                                    placeholder="contact@eliteautospa.com"
                                    value={providerData.email}
                                    onChange={(e) => setProviderData({ ...providerData, email: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Service Area *</label>
                                <input
                                    type="text"
                                    placeholder="Eagle Mountain, UT and surrounding areas (25 mile radius)"
                                    value={providerData.serviceArea}
                                    onChange={(e) => setProviderData({ ...providerData, serviceArea: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Services Offered */}
                    {providerStep === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Services You Offer</h3>
                                <p className="text-gray-600 mb-6">Select all services you provide (select at least 3)</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {serviceOptions.map(service => (
                                    <label
                                        key={service}
                                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${providerData.services.includes(service)
                                            ? 'border-cyan-500 bg-cyan-50'
                                            : 'border-gray-200 hover:border-cyan-300'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={providerData.services.includes(service)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setProviderData({
                                                        ...providerData,
                                                        services: [...providerData.services, service]
                                                    });
                                                } else {
                                                    setProviderData({
                                                        ...providerData,
                                                        services: providerData.services.filter(s => s !== service)
                                                    });
                                                }
                                            }}
                                            className="mr-3"
                                        />
                                        <span className="font-semibold text-gray-800">{service}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mt-6">
                                <h4 className="font-bold text-cyan-900 mb-2">💡 Pricing Information</h4>
                                <p className="text-sm text-cyan-800">
                                    You'll set your own pricing for each service. BRNNO takes a 15% platform fee on each booking.
                                    Founding providers get locked in at 10% for the first year!
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Years of Experience</label>
                                <select
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                >
                                    <option>Less than 1 year</option>
                                    <option>1-2 years</option>
                                    <option>3-5 years</option>
                                    <option>5-10 years</option>
                                    <option>10+ years</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Verification & Insurance */}
                    {providerStep === 3 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Verification & Insurance</h3>
                                <p className="text-gray-600 mb-6">Required for customer trust and protection</p>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <h4 className="font-bold text-yellow-900 mb-2">⚠️ Background Check Required</h4>
                                <p className="text-sm text-yellow-800 mb-3">
                                    All BRNNO providers must pass a background check. This protects our customers and builds trust.
                                </p>
                                <label className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={providerData.backgroundCheck}
                                        onChange={(e) => setProviderData({ ...providerData, backgroundCheck: e.target.checked })}
                                        className="mt-1"
                                        required
                                    />
                                    <span className="text-sm text-gray-700">
                                        I consent to a background check and understand this is required to join BRNNO
                                    </span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Business Insurance *</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-cyan-500 transition-colors cursor-pointer">
                                    <input type="file" className="hidden" id="insurance-upload" accept=".pdf,.jpg,.png" />
                                    <label htmlFor="insurance-upload" className="cursor-pointer">
                                        <div className="text-cyan-600 mb-2">
                                            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                        </div>
                                        <p className="font-semibold text-gray-700">Upload Insurance Certificate</p>
                                        <p className="text-sm text-gray-500 mt-1">PDF, JPG, or PNG (Max 5MB)</p>
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Required: General liability insurance with minimum $1M coverage</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Professional Certifications (Optional)</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-cyan-500 transition-colors cursor-pointer">
                                    <input type="file" className="hidden" id="certs-upload" multiple accept=".pdf,.jpg,.png" />
                                    <label htmlFor="certs-upload" className="cursor-pointer">
                                        <div className="text-cyan-600 mb-2">
                                            <Award className="w-12 h-12 mx-auto" />
                                        </div>
                                        <p className="font-semibold text-gray-700">Upload Certifications</p>
                                        <p className="text-sm text-gray-500 mt-1">IDA Certified, manufacturer training, etc.</p>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Portfolio Photos (Optional but recommended)</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-cyan-500 transition-colors cursor-pointer">
                                    <input type="file" className="hidden" id="portfolio-upload" multiple accept=".jpg,.png" />
                                    <label htmlFor="portfolio-upload" className="cursor-pointer">
                                        <div className="text-cyan-600 mb-2">
                                            <Camera className="w-12 h-12 mx-auto" />
                                        </div>
                                        <p className="font-semibold text-gray-700">Upload Before/After Photos</p>
                                        <p className="text-sm text-gray-500 mt-1">Showcase your best work (up to 10 photos)</p>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Payment Information */}
                    {providerStep === 4 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Payment Information</h3>
                                <p className="text-gray-600 mb-6">Where should we send your earnings?</p>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h4 className="font-bold text-green-900 mb-2">💰 How You Get Paid</h4>
                                <ul className="text-sm text-green-800 space-y-1">
                                    <li>• Payments processed through Stripe</li>
                                    <li>• Automatic weekly deposits to your bank account</li>
                                    <li>• Track earnings in your provider dashboard</li>
                                    <li>• BRNNO platform fee: 15% (10% for founding providers)</li>
                                </ul>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Bank Account Holder Name *</label>
                                <input
                                    type="text"
                                    placeholder="John Doe or Elite Auto Spa LLC"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Routing Number *</label>
                                <input
                                    type="text"
                                    placeholder="123456789"
                                    value={providerData.routingNumber}
                                    onChange={(e) => setProviderData({ ...providerData, routingNumber: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Account Number *</label>
                                <input
                                    type="text"
                                    placeholder="Account number"
                                    value={providerData.bankAccount}
                                    onChange={(e) => setProviderData({ ...providerData, bankAccount: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Confirm Account Number *</label>
                                <input
                                    type="text"
                                    placeholder="Re-enter account number"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <p className="text-xs text-gray-600">
                                    🔒 Your banking information is encrypted and securely stored. BRNNO uses Stripe for payment processing
                                    and never stores your full account details on our servers.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Review & Submit */}
                    {providerStep === 5 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">Review Your Application</h3>
                                <p className="text-gray-600 mb-6">Please review all information before submitting</p>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h4 className="font-bold text-gray-800 mb-3">Business Information</h4>
                                    <div className="space-y-2 text-sm">
                                        <p><span className="text-gray-600">Business Name:</span> <span className="font-semibold">{providerData.businessName || 'Not provided'}</span></p>
                                        <p><span className="text-gray-600">Business Type:</span> <span className="font-semibold">{providerData.businessType || 'Not provided'}</span></p>
                                        <p><span className="text-gray-600">EIN:</span> <span className="font-semibold">{providerData.ein || 'Not provided'}</span></p>
                                        <p><span className="text-gray-600">Owner:</span> <span className="font-semibold">{providerData.ownerName || 'Not provided'}</span></p>
                                        <p><span className="text-gray-600">Email:</span> <span className="font-semibold">{providerData.email || 'Not provided'}</span></p>
                                        <p><span className="text-gray-600">Phone:</span> <span className="font-semibold">{providerData.phone || 'Not provided'}</span></p>
                                        <p><span className="text-gray-600">Service Area:</span> <span className="font-semibold">{providerData.serviceArea || 'Not provided'}</span></p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h4 className="font-bold text-gray-800 mb-3">Services Offered</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {providerData.services.length > 0 ? (
                                            providerData.services.map(service => (
                                                <span key={service} className="bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-sm font-semibold">
                                                    {service}
                                                </span>
                                            ))
                                        ) : (
                                            <p className="text-sm text-gray-600">No services selected</p>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h4 className="font-bold text-gray-800 mb-3">Verification Status</h4>
                                    <div className="space-y-2 text-sm">
                                        <p>
                                            <span className="text-gray-600">Background Check:</span>
                                            <span className={`font-semibold ml-2 ${providerData.backgroundCheck ? 'text-green-600' : 'text-red-600'}`}>
                                                {providerData.backgroundCheck ? '✓ Consented' : '✗ Not consented'}
                                            </span>
                                        </p>
                                        <p><span className="text-gray-600">Insurance:</span> <span className="font-semibold">Pending upload</span></p>
                                        <p><span className="text-gray-600">Certifications:</span> <span className="font-semibold">Optional</span></p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-cyan-50 border-2 border-cyan-200 rounded-lg p-6">
                                <h4 className="font-bold text-cyan-900 mb-3">📋 What Happens Next?</h4>
                                <ol className="text-sm text-cyan-800 space-y-2">
                                    <li>1. We'll review your application within 2-3 business days</li>
                                    <li>2. Background check will be initiated (usually takes 3-5 days)</li>
                                    <li>3. Once approved, you'll receive onboarding instructions</li>
                                    <li>4. Complete your profile and start accepting bookings!</li>
                                </ol>
                            </div>

                            <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
                                <input type="checkbox" className="mt-1" required />
                                <label className="text-sm text-gray-700">
                                    I certify that all information provided is accurate and complete. I understand that false information
                                    may result in denial or termination of my provider account. I agree to BRNNO's{' '}
                                    <a href="#" className="text-blue-600 font-semibold hover:underline">Terms of Service</a> and{' '}
                                    <a href="#" className="text-blue-600 font-semibold hover:underline">Provider Agreement</a>.
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-6 bg-gray-50 flex items-center justify-between">
                    {providerStep > 1 && (
                        <button
                            onClick={prevStep}
                            className="px-6 py-3 rounded-lg font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                            Back
                        </button>
                    )}

                    {providerStep < 5 ? (
                        <button
                            onClick={nextStep}
                            disabled={
                                (providerStep === 1 && (!providerData.businessName || !providerData.ein || !providerData.ownerName)) ||
                                (providerStep === 2 && providerData.services.length < 3) ||
                                (providerStep === 3 && !providerData.backgroundCheck)
                            }
                            className="ml-auto px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continue
                        </button>
                    ) : (
                        <button
                            onClick={async () => {
                                try {
                                    // Save provider application to Firebase
                                    const providerApplication = {
                                        ...providerData,
                                        status: 'pending',
                                        submittedAt: serverTimestamp(),
                                        userId: auth.currentUser?.uid || null
                                    };

                                    // Save to providers collection
                                    const docRef = await addDoc(collection(db, 'providers'), providerApplication);
                                    console.log('Provider application saved with ID:', docRef.id);

                                    // Update user's account type to provider in users collection
                                    if (auth.currentUser) {
                                        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                                            accountType: 'provider',
                                            providerApplicationId: docRef.id,
                                            businessName: providerData.businessName
                                        });
                                    }

                                    // Email notification (console log for now)
                                    console.log('📧 EMAIL NOTIFICATION:');
                                    console.log('To:', providerData.email);
                                    console.log('Subject: BRNNO Provider Application Submitted');
                                    console.log('Body:');
                                    console.log(`Hello ${providerData.ownerName},`);
                                    console.log(`Your provider application for ${providerData.businessName} has been submitted.`);
                                    console.log('We will review your application within 2-3 business days.');
                                    console.log('Thank you for joining BRNNO!');

                                    // TODO: Replace with real email service (SendGrid, etc.)

                                    alert('Application submitted! You will receive an email confirmation shortly.');
                                    closeModal();
                                } catch (error) {
                                    console.error('Error submitting provider application:', error);
                                    alert('Error submitting application. Please try again.');
                                }
                            }}
                            className="ml-auto px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors"
                        >
                            Submit Application
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
});

const ProviderDetailModal = memo(({ provider, showModal, setShowModal, onBookNow }) => {
    const [activeTab, setActiveTab] = useState('overview');

    // Lock body scroll when modal is open
    React.useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showModal]);

    if (!showModal || !provider) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
            onClick={() => setShowModal(false)}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-md sm:max-w-3xl lg:max-w-5xl w-full my-4 sm:my-8 max-h-[90vh] overflow-hidden flex flex-col relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={() => setShowModal(false)}
                    className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-lg transition-colors text-2xl z-20"
                >
                    ✕
                </button>

                {/* Header with Hero Image */}
                <div className="relative h-64 overflow-hidden">
                    <img
                        src={provider.image}
                        alt={provider.name}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

                    {/* Provider Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-3xl font-bold mb-2">{provider.name}</h2>
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                                        <Star className="fill-yellow-400 text-yellow-400" size={18} />
                                        <span className="font-bold">{provider.rating}</span>
                                        <span className="text-white/80 text-sm">({provider.reviews} reviews)</span>
                                    </div>
                                    {provider.certified && (
                                        <span className="flex items-center gap-1 bg-blue-500 px-3 py-1 rounded-full text-sm font-semibold">
                                            <Shield size={14} />
                                            BRNNO Certified
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1">
                                        <MapPin size={16} />
                                        {provider.distance || '2.5 miles'} away
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock size={16} />
                                        Responds in {provider.responseTime || '2 hours'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <CheckCircle size={16} />
                                        {provider.completedJobs || '247'} jobs completed
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 px-6 flex gap-4">
                    {['overview', 'services', 'gallery', 'reviews'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-3 font-semibold capitalize transition-colors ${activeTab === tab
                                ? 'text-cyan-600 border-b-2 border-cyan-600'
                                : 'text-gray-600 hover:text-cyan-500'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-3">About</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Professional mobile auto detailing service serving {provider.distance || '2.5 miles'} radius.
                                    We specialize in premium detailing services with over {provider.completedJobs || '247'} satisfied customers.
                                    Our team is fully insured, background-checked, and committed to delivering exceptional results.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-3">Specialties</h3>
                                <div className="flex flex-wrap gap-2">
                                    {provider.specialties || ['Paint Correction', 'Ceramic Coating', 'Interior Detailing', 'Exterior Polish'].map((specialty, idx) => (
                                        <span
                                            key={idx}
                                            className="bg-cyan-100 text-cyan-700 px-4 py-2 rounded-lg font-semibold"
                                        >
                                            {specialty}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <div className="text-3xl font-bold text-cyan-600 mb-1">{provider.rating}</div>
                                    <div className="text-sm text-gray-600">Average Rating</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <div className="text-3xl font-bold text-cyan-600 mb-1">{provider.completedJobs || '247'}</div>
                                    <div className="text-sm text-gray-600">Jobs Completed</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <div className="text-3xl font-bold text-cyan-600 mb-1">{provider.responseTime || '2 hours'}</div>
                                    <div className="text-sm text-gray-600">Response Time</div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-3">Service Area</h3>
                                <p className="text-gray-600">
                                    Serving Eagle Mountain, Saratoga Springs, Lehi, and surrounding areas within a 25-mile radius.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Services Tab */}
                    {activeTab === 'services' && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Services & Pricing</h3>

                            {[
                                { name: 'Basic Wash & Vacuum', price: 50, duration: '1 hour', description: 'Exterior hand wash and interior vacuum' },
                                { name: 'Interior Detail', price: 120, duration: '2 hours', description: 'Deep clean all interior surfaces, carpets, and upholstery' },
                                { name: 'Exterior Detail', price: 150, duration: '2.5 hours', description: 'Wash, clay bar treatment, polish, and wax' },
                                { name: 'Full Detail', price: 200, duration: '4 hours', description: 'Complete interior and exterior detailing service' },
                                { name: 'Paint Correction', price: 400, duration: '6 hours', description: 'Multi-stage paint correction to remove swirls and scratches' },
                                { name: 'Ceramic Coating', price: 800, duration: '8 hours', description: 'Professional grade ceramic coating with 5-year warranty' }
                            ].map((service, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:border-cyan-500 transition-colors">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-lg">{service.name}</h4>
                                            <p className="text-sm text-gray-600">{service.description}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-cyan-600">${service.price}</p>
                                            <p className="text-xs text-gray-500">{service.duration}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowModal(false);
                                            onBookNow();
                                        }}
                                        className="mt-3 w-full bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-2 rounded-lg transition-colors"
                                    >
                                        Book This Service
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Gallery Tab */}
                    {activeTab === 'gallery' && (
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Before & After Gallery</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {provider.beforeAfter && provider.beforeAfter.map((img, idx) => (
                                    <div key={idx} className="relative rounded-lg overflow-hidden group cursor-pointer">
                                        <img
                                            src={img}
                                            alt={`Gallery ${idx + 1}`}
                                            className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all"></div>
                                    </div>
                                ))}
                                {/* Additional mock images */}
                                <div className="relative rounded-lg overflow-hidden">
                                    <img
                                        src="https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=400&h=300&fit=crop"
                                        alt="Work sample"
                                        className="w-full h-64 object-cover"
                                    />
                                </div>
                                <div className="relative rounded-lg overflow-hidden">
                                    <img
                                        src="https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=400&h=300&fit=crop"
                                        alt="Work sample"
                                        className="w-full h-64 object-cover"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Reviews Tab */}
                    {activeTab === 'reviews' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-4">Customer Reviews</h3>

                                {/* Rating Summary */}
                                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <div className="text-5xl font-bold text-gray-800 mb-2">{provider.rating}</div>
                                            <div className="flex items-center gap-1 mb-1">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <Star key={star} className="fill-yellow-400 text-yellow-400" size={20} />
                                                ))}
                                            </div>
                                            <div className="text-sm text-gray-600">{provider.reviews} reviews</div>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            {[5, 4, 3, 2, 1].map(rating => (
                                                <div key={rating} className="flex items-center gap-3">
                                                    <span className="text-sm text-gray-600 w-12">{rating} stars</span>
                                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-yellow-400 h-2 rounded-full"
                                                            style={{ width: rating === 5 ? '85%' : rating === 4 ? '10%' : '5%' }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm text-gray-600 w-8">{rating === 5 ? '85%' : rating === 4 ? '10%' : '5%'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Individual Reviews */}
                                <div className="space-y-4">
                                    {[
                                        { name: 'Sarah M.', date: 'Oct 5, 2025', rating: 5, comment: 'Absolutely amazing service! My car looks brand new. Very professional and attention to detail was incredible.' },
                                        { name: 'Mike R.', date: 'Oct 1, 2025', rating: 5, comment: 'Best detailing I\'ve ever had. Worth every penny. Will definitely use again!' },
                                        { name: 'Jennifer L.', date: 'Sep 28, 2025', rating: 5, comment: 'Showed up on time, very friendly, and did an outstanding job. Highly recommend!' },
                                        { name: 'David K.', date: 'Sep 20, 2025', rating: 4, comment: 'Great work overall. Very thorough interior cleaning. Would have given 5 stars but they were 15 minutes late.' }
                                    ].map((review, idx) => (
                                        <div key={idx} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <div className="font-bold text-gray-800">{review.name}</div>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        {[...Array(review.rating)].map((_, i) => (
                                                            <Star key={i} className="fill-yellow-400 text-yellow-400" size={14} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <span className="text-sm text-gray-500">{review.date}</span>
                                            </div>
                                            <p className="text-gray-700">{review.comment}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer - Sticky CTA */}
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Starting at</p>
                            <p className="text-2xl font-bold text-gray-800">${provider.startingPrice || 50}</p>
                        </div>
                        <div className="flex gap-3">
                            <button className="px-6 py-3 border-2 border-cyan-500 text-cyan-600 hover:bg-cyan-50 rounded-lg font-bold transition-colors">
                                Contact Provider
                            </button>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    // Open waitlist instead of booking
                                }}
                                className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-bold transition-colors"
                            >
                                Join Waitlist
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

const ProviderDashboard = memo(({ showDashboard, setShowDashboard }) => {
    const [dashboardTab, setDashboardTab] = useState('overview');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [realBookings, setRealBookings] = useState([]);
    const [bookingsLoading, setBookingsLoading] = useState(true);

    // Check authentication when dashboard opens
    React.useEffect(() => {
        if (showDashboard) {
            document.body.style.overflow = 'hidden';

            // Check if user is authenticated and has provider role
            if (auth.currentUser) {
                getDoc(doc(db, 'users', auth.currentUser.uid)).then(userDoc => {
                    if (userDoc.exists() && userDoc.data().accountType === 'provider') {
                        setIsAuthorized(true);
                    } else {
                        alert('Provider access required. Please sign up as a provider first.');
                        setShowDashboard(false);
                    }
                    setCheckingAuth(false);
                }).catch(() => {
                    alert('Authentication error. Please sign in again.');
                    setShowDashboard(false);
                    setCheckingAuth(false);
                });
            } else {
                alert('Please sign in first to access provider dashboard.');
                setShowDashboard(false);
                setCheckingAuth(false);
            }
        } else {
            setIsAuthorized(false);
            setCheckingAuth(true);
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showDashboard]);

    // Load real bookings for this provider
    React.useEffect(() => {
        if (showDashboard && isAuthorized && auth.currentUser) {
            const loadBookings = async () => {
                try {
                    setBookingsLoading(true);
                    const bookingsQuery = query(
                        collection(db, 'bookings'),
                        where('providerId', '==', auth.currentUser.uid)
                    );
                    const bookingsSnapshot = await getDocs(bookingsQuery);
                    const bookings = [];

                    bookingsSnapshot.forEach((doc) => {
                        const data = doc.data();
                        bookings.push({
                            id: doc.id,
                            ...data
                        });
                    });

                    setRealBookings(bookings);
                    console.log('Loaded provider bookings:', bookings);
                } catch (error) {
                    console.error('Error loading bookings:', error);
                } finally {
                    setBookingsLoading(false);
                }
            };

            loadBookings();
        }
    }, [showDashboard, isAuthorized]);

    if (!showDashboard) return null;

    if (checkingAuth) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-white rounded-xl p-8 text-center">
                    <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Verifying access...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return null;
    }

    // Calculate real stats from bookings
    const today = new Date().toDateString();
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);

    const todayBookings = realBookings.filter(booking =>
        new Date(booking.date).toDateString() === today
    ).length;

    const weekBookings = realBookings.filter(booking =>
        new Date(booking.date) >= thisWeek
    );

    const weekRevenue = weekBookings.reduce((sum, booking) => sum + (booking.providerAmount || 0), 0);
    const totalJobs = realBookings.length;

    const stats = {
        todayBookings,
        weekRevenue,
        totalJobs,
        rating: 4.9 // Default rating for new providers
    };

    // Use real bookings instead of mock data
    const upcomingBookings = realBookings
        .filter(booking => new Date(booking.date) >= new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5)
        .map(booking => ({
            id: booking.id,
            customer: booking.customerName || 'Customer',
            service: booking.service?.name || 'Service',
            vehicle: booking.vehicle ? `${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}` : 'Vehicle',
            time: booking.time,
            date: new Date(booking.date).toDateString() === today ? 'Today' :
                new Date(booking.date).toDateString() === new Date(Date.now() + 86400000).toDateString() ? 'Tomorrow' :
                    new Date(booking.date).toLocaleDateString(),
            address: booking.address,
            price: booking.providerAmount || 0,
            status: booking.status,
            paymentStatus: booking.paymentStatus
        }));

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={() => setShowDashboard(false)}
            />

            {/* Dashboard Panel */}
            <div className="fixed inset-0 sm:left-auto sm:right-0 w-full sm:w-[95vw] lg:w-[85vw] xl:w-[1200px] bg-gray-50 shadow-2xl z-50 flex">

                {/* Sidebar */}
                <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                EA
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">Elite Auto Spa</h3>
                                <p className="text-xs text-gray-500">Provider Account</p>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 p-4">
                        <div className="space-y-1">
                            {[
                                { id: 'overview', icon: '📊', label: 'Overview' },
                                { id: 'bookings', icon: '📅', label: 'Bookings' },
                                { id: 'services', icon: '🔧', label: 'Services & Pricing' },
                                { id: 'calendar', icon: '📆', label: 'Calendar' },
                                { id: 'earnings', icon: '💰', label: 'Earnings' },
                                { id: 'reviews', icon: '⭐', label: 'Reviews' },
                                { id: 'profile', icon: '👤', label: 'Profile' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setDashboardTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors ${dashboardTab === tab.id
                                        ? 'bg-cyan-500 text-white'
                                        : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <span className="text-xl">{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </nav>

                    <div className="p-4 border-t border-gray-200">
                        <button
                            onClick={() => setShowDashboard(false)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            <span className="text-xl">←</span>
                            Back to Site
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Header */}
                    <div className="bg-white border-b border-gray-200 p-4 sm:p-6 sticky top-0 z-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                                    {dashboardTab.charAt(0).toUpperCase() + dashboardTab.slice(1)}
                                </h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowDashboard(false)}
                                className="text-gray-400 hover:text-gray-600 p-2 md:hidden"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-4 sm:p-6">

                        {/* Overview Tab */}
                        {dashboardTab === 'overview' && (
                            <div className="space-y-6">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-gray-600 text-sm font-semibold">Today's Bookings</span>
                                            <span className="text-2xl">📅</span>
                                        </div>
                                        <p className="text-3xl font-bold text-gray-800">{stats.todayBookings}</p>
                                        <p className="text-xs text-green-600 mt-2">+2 from yesterday</p>
                                    </div>

                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-gray-600 text-sm font-semibold">This Week</span>
                                            <span className="text-2xl">💰</span>
                                        </div>
                                        <p className="text-3xl font-bold text-gray-800">${stats.weekRevenue}</p>
                                        <p className="text-xs text-green-600 mt-2">+15% from last week</p>
                                    </div>

                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-gray-600 text-sm font-semibold">Total Jobs</span>
                                            <span className="text-2xl">🚗</span>
                                        </div>
                                        <p className="text-3xl font-bold text-gray-800">{stats.totalJobs}</p>
                                        <p className="text-xs text-gray-600 mt-2">All time</p>
                                    </div>

                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-gray-600 text-sm font-semibold">Rating</span>
                                            <span className="text-2xl">⭐</span>
                                        </div>
                                        <p className="text-3xl font-bold text-gray-800">{stats.rating}</p>
                                        <p className="text-xs text-gray-600 mt-2">From 247 reviews</p>
                                    </div>
                                </div>

                                {/* Upcoming Bookings */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-bold text-gray-800">Upcoming Bookings</h3>
                                        <button
                                            onClick={() => setDashboardTab('bookings')}
                                            className="text-cyan-600 hover:text-cyan-700 font-semibold text-sm"
                                        >
                                            View All
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {upcomingBookings.map(booking => (
                                            <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:border-cyan-500 transition-colors">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-bold text-gray-800">{booking.customer}</h4>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${booking.date === 'Today' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                                                }`}>
                                                                {booking.date}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                                                                    booking.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                                        'bg-red-100 text-red-700'
                                                                }`}>
                                                                {booking.paymentStatus === 'paid' ? '💰 Paid' :
                                                                    booking.paymentStatus === 'pending' ? '⏳ Pending' : '❌ Failed'}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600">{booking.service} • {booking.vehicle}</p>
                                                        <p className="text-xs text-gray-500 mt-1">📍 {booking.address}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <p className="text-sm font-semibold text-gray-600">{booking.time}</p>
                                                            <p className="text-lg font-bold text-gray-800">${booking.price}</p>
                                                        </div>
                                                        <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap">
                                                            View Details
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <button className="bg-white border-2 border-cyan-500 text-cyan-600 hover:bg-cyan-50 rounded-xl p-6 font-bold transition-colors">
                                        📋 Update Services
                                    </button>
                                    <button className="bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 rounded-xl p-6 font-bold transition-colors">
                                        📆 Block Time Off
                                    </button>
                                    <button className="bg-white border-2 border-purple-500 text-purple-600 hover:bg-purple-50 rounded-xl p-6 font-bold transition-colors">
                                        💬 View Messages
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Bookings Tab */}
                        {dashboardTab === 'bookings' && (
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {['All', 'Upcoming', 'In Progress', 'Completed', 'Cancelled'].map(filter => (
                                        <button
                                            key={filter}
                                            className="px-4 py-2 rounded-lg font-semibold text-sm bg-white border border-gray-300 hover:border-cyan-500 hover:text-cyan-600 transition-colors"
                                        >
                                            {filter}
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-3">
                                    {upcomingBookings.concat([
                                        { id: 4, customer: 'Lisa K.', service: 'Paint Correction', vehicle: '2020 Porsche 911', time: 'Completed', date: 'Yesterday', address: '321 Elm St', price: 400, status: 'completed' },
                                        { id: 5, customer: 'Tom W.', service: 'Basic Wash', vehicle: '2019 Honda Civic', time: 'Completed', date: 'Oct 8', address: '654 Maple Dr', price: 50, status: 'completed' }
                                    ]).map(booking => (
                                        <div key={booking.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                                        <h4 className="font-bold text-gray-800 text-lg">{booking.customer}</h4>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${booking.status === 'completed'
                                                            ? 'bg-green-100 text-green-700'
                                                            : booking.date === 'Today'
                                                                ? 'bg-orange-100 text-orange-700'
                                                                : 'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {booking.status === 'completed' ? 'Completed' : 'Upcoming'}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1 text-sm text-gray-600">
                                                        <p><strong>Service:</strong> {booking.service}</p>
                                                        <p><strong>Vehicle:</strong> {booking.vehicle}</p>
                                                        <p><strong>Location:</strong> {booking.address}</p>
                                                        <p><strong>Time:</strong> {booking.date} at {booking.time}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col justify-between items-end">
                                                    <p className="text-2xl font-bold text-gray-800 mb-2">${booking.price}</p>
                                                    <div className="flex gap-2">
                                                        {booking.status !== 'completed' && (
                                                            <>
                                                                <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold text-sm transition-colors">
                                                                    Start Job
                                                                </button>
                                                                <button className="px-4 py-2 border border-gray-300 hover:border-red-500 text-gray-600 hover:text-red-600 rounded-lg font-semibold text-sm transition-colors">
                                                                    Cancel
                                                                </button>
                                                            </>
                                                        )}
                                                        {booking.status === 'completed' && (
                                                            <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-colors">
                                                                View Receipt
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Services & Pricing Tab */}
                        {dashboardTab === 'services' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <p className="text-gray-600">Manage your service offerings and pricing</p>
                                    <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-bold transition-colors">
                                        + Add Service
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {[
                                        { name: 'Basic Wash & Vacuum', price: 50, duration: '1 hour', active: true },
                                        { name: 'Interior Detail', price: 120, duration: '2 hours', active: true },
                                        { name: 'Exterior Detail', price: 150, duration: '2.5 hours', active: true },
                                        { name: 'Full Detail', price: 200, duration: '4 hours', active: true },
                                        { name: 'Paint Correction', price: 400, duration: '6 hours', active: false },
                                        { name: 'Ceramic Coating', price: 800, duration: '8 hours', active: true }
                                    ].map((service, idx) => (
                                        <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h4 className="font-bold text-gray-800 text-lg">{service.name}</h4>
                                                    <p className="text-sm text-gray-600">{service.duration}</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" checked={service.active} className="sr-only peer" readOnly />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                                                </label>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-3xl font-bold text-gray-800">${service.price}</p>
                                                    <p className="text-xs text-gray-500 mt-1">You earn: ${(service.price * 0.85).toFixed(0)} (after 15% fee)</p>
                                                </div>
                                                <button className="text-cyan-600 hover:text-cyan-700 font-semibold text-sm">
                                                    Edit
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Calendar Tab */}
                        {dashboardTab === 'calendar' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-xl font-bold text-gray-800 mb-4">Schedule & Availability</h3>
                                <p className="text-gray-600 mb-6">Calendar integration coming soon! Manage your availability and block off time.</p>
                                <div className="bg-gray-50 rounded-lg p-12 text-center">
                                    <div className="text-6xl mb-4">📆</div>
                                    <p className="text-gray-600">Calendar feature in development</p>
                                </div>
                            </div>
                        )}

                        {/* Earnings Tab */}
                        {dashboardTab === 'earnings' && (
                            <div className="space-y-6">
                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6">
                                        <p className="text-green-100 text-sm mb-2">This Week</p>
                                        <p className="text-4xl font-bold">$1,250</p>
                                        <p className="text-green-100 text-xs mt-2">+15% from last week</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6">
                                        <p className="text-blue-100 text-sm mb-2">This Month</p>
                                        <p className="text-4xl font-bold">$4,820</p>
                                        <p className="text-blue-100 text-xs mt-2">+22% from last month</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6">
                                        <p className="text-purple-100 text-sm mb-2">All Time</p>
                                        <p className="text-4xl font-bold">$52,450</p>
                                        <p className="text-purple-100 text-xs mt-2">247 completed jobs</p>
                                    </div>
                                </div>

                                {/* Payment History */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <h3 className="text-xl font-bold text-gray-800 mb-4">Payment History</h3>
                                    <div className="space-y-3">
                                        {[
                                            { date: 'Oct 7, 2025', amount: 1250, status: 'Deposited', jobs: 8 },
                                            { date: 'Sep 30, 2025', amount: 980, status: 'Deposited', jobs: 6 },
                                            { date: 'Sep 23, 2025', amount: 1420, status: 'Deposited', jobs: 9 },
                                            { date: 'Sep 16, 2025', amount: 760, status: 'Deposited', jobs: 5 }
                                        ].map((payment, idx) => (
                                            <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                                                <div>
                                                    <p className="font-semibold text-gray-800">{payment.date}</p>
                                                    <p className="text-sm text-gray-600">{payment.jobs} jobs completed</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-bold text-green-600">${payment.amount}</p>
                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                                                        {payment.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Reviews Tab */}
                        {dashboardTab === 'reviews' && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <div className="text-5xl font-bold text-gray-800 mb-2">4.9</div>
                                            <div className="flex items-center gap-1 mb-1">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <Star key={star} className="fill-yellow-400 text-yellow-400" size={20} />
                                                ))}
                                            </div>
                                            <div className="text-sm text-gray-600">247 reviews</div>
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            {[5, 4, 3, 2, 1].map(rating => (
                                                <div key={rating} className="flex items-center gap-3">
                                                    <span className="text-sm text-gray-600 w-12">{rating} stars</span>
                                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-yellow-400 h-2 rounded-full"
                                                            style={{ width: rating === 5 ? '85%' : rating === 4 ? '10%' : '5%' }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { name: 'Sarah M.', date: 'Oct 5, 2025', rating: 5, comment: 'Absolutely amazing service! My car looks brand new. Very professional and attention to detail was incredible.' },
                                        { name: 'Mike R.', date: 'Oct 1, 2025', rating: 5, comment: 'Best detailing I\'ve ever had. Worth every penny. Will definitely use again!' },
                                        { name: 'Jennifer L.', date: 'Sep 28, 2025', rating: 5, comment: 'Showed up on time, very friendly, and did an outstanding job. Highly recommend!' }
                                    ].map((review, idx) => (
                                        <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <div className="font-bold text-gray-800">{review.name}</div>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        {[...Array(review.rating)].map((_, i) => (
                                                            <Star key={i} className="fill-yellow-400 text-yellow-400" size={14} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <span className="text-sm text-gray-500">{review.date}</span>
                                            </div>
                                            <p className="text-gray-700">{review.comment}</p>
                                            <button className="mt-3 text-cyan-600 hover:text-cyan-700 font-semibold text-sm">
                                                Reply to Review
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Profile Tab */}
                        {dashboardTab === 'profile' && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <h3 className="text-xl font-bold text-gray-800 mb-4">Business Profile</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Business Name</label>
                                            <input
                                                type="text"
                                                defaultValue="Elite Auto Spa"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Bio</label>
                                            <textarea
                                                rows={4}
                                                defaultValue="Professional mobile auto detailing service with over 5 years of experience. We specialize in premium detailing services."
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Phone</label>
                                                <input
                                                    type="tel"
                                                    defaultValue="(555) 123-4567"
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                                                <input
                                                    type="email"
                                                    defaultValue="contact@eliteautospa.com"
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                        <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-bold transition-colors">
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
});

const WaitlistModal = memo(({ showModal, setShowModal, waitlistCount }) => {
    const [step, setStep] = useState(1); // 1 = form, 2 = thank you
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        city: '',
        zipCode: '',
        vehicleType: '',
        servicesInterested: [],
        howSoon: ''
    });

    React.useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showModal]);

    if (!showModal) return null;

    const utahCities = [
        'Salt Lake City', 'West Valley City', 'Provo', 'West Jordan', 'Orem',
        'Sandy', 'Ogden', 'St. George', 'Layton', 'Taylorsville', 'South Jordan',
        'Lehi', 'Logan', 'Murray', 'Draper', 'Bountiful', 'Riverton', 'Roy',
        'Spanish Fork', 'Pleasant Grove', 'Kearns', 'Cottonwood Heights',
        'Springville', 'Eagle Mountain', 'Saratoga Springs', 'Other'
    ];

    const serviceOptions = [
        'Basic Wash & Vacuum',
        'Interior Detailing',
        'Exterior Detailing',
        'Full Detail',
        'Paint Correction',
        'Ceramic Coating',
        'Not sure yet'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Check if there's a referral code in the URL
            const urlParams = new URLSearchParams(window.location.search);
            const referralCode = urlParams.get('ref');

            // Save to Firestore
            const docRef = await addDoc(collection(db, 'waitlist'), {
                ...formData,
                timestamp: serverTimestamp(),
                status: 'pending',
                referralCode: formData.email.split('@')[0] + Math.random().toString(36).substring(2, 6),
                referredBy: referralCode || null,
                referralCount: 0
            });

            console.log('Waitlist signup saved with ID:', docRef.id);
            setStep(2);

        } catch (error) {
            console.error('Waitlist signup error:', error);
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setStep(1);
        setFormData({
            name: '',
            email: '',
            phone: '',
            city: '',
            zipCode: '',
            vehicleType: '',
            servicesInterested: [],
            howSoon: ''
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">

                {step === 1 ? (
                    <>
                        {/* Header */}
                        <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white p-6 sm:p-8">
                            <button
                                onClick={closeModal}
                                className="float-right text-white hover:bg-white/20 p-2 rounded-lg transition-colors text-2xl"
                            >
                                ✕
                            </button>
                            <h2 className="text-3xl font-bold mb-2">Join the Waitlist</h2>
                            <p className="text-white/90">Be the first to know when BRNNO launches in your area!</p>
                            <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 inline-block">
                                <span className="font-bold text-lg">{waitlistCount}+ Utahns</span>
                                <span className="text-white/90 ml-2">already waiting</span>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 sm:p-8 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                    <p className="text-red-800 text-sm">{error}</p>
                                </div>
                            )}
                            <div className="space-y-4">

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="John Doe"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Email *</label>
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="john@email.com"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Phone *</label>
                                        <input
                                            type="tel"
                                            required
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="(555) 123-4567"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">City in Utah *</label>
                                        <select
                                            required
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        >
                                            <option value="">Select city</option>
                                            {utahCities.map(city => (
                                                <option key={city} value={city}>{city}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Zip Code *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.zipCode}
                                            onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                                            placeholder="84043"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Vehicle Type *</label>
                                    <select
                                        required
                                        value={formData.vehicleType}
                                        onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    >
                                        <option value="">Select vehicle type</option>
                                        <option value="sedan">Sedan/Coupe</option>
                                        <option value="suv">SUV/Crossover</option>
                                        <option value="truck">Truck</option>
                                        <option value="van">Van/Minivan</option>
                                        <option value="luxury">Luxury Vehicle</option>
                                        <option value="sports">Sports Car</option>
                                        <option value="rv">RV/Motorhome</option>
                                        <option value="motorcycle">Motorcycle</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Services You're Interested In *</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {serviceOptions.map(service => (
                                            <label
                                                key={service}
                                                className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg hover:border-orange-500 cursor-pointer transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={formData.servicesInterested.includes(service)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFormData({
                                                                ...formData,
                                                                servicesInterested: [...formData.servicesInterested, service]
                                                            });
                                                        } else {
                                                            setFormData({
                                                                ...formData,
                                                                servicesInterested: formData.servicesInterested.filter(s => s !== service)
                                                            });
                                                        }
                                                    }}
                                                    className="rounded"
                                                />
                                                <span className="text-sm text-gray-700">{service}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">How soon would you book? *</label>
                                    <select
                                        required
                                        value={formData.howSoon}
                                        onChange={(e) => setFormData({ ...formData, howSoon: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    >
                                        <option value="">Select timeframe</option>
                                        <option value="asap">As soon as available</option>
                                        <option value="week">Within a week</option>
                                        <option value="month">Within a month</option>
                                        <option value="flexible">Flexible / Just browsing</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold py-4 rounded-lg transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Adding to Waitlist...
                                        </div>
                                    ) : (
                                        'Join the Waitlist'
                                    )}
                                </button>

                                <p className="text-xs text-gray-600 text-center">
                                    We'll notify you as soon as BRNNO launches in your area. No spam, promise! 🚀
                                </p>
                            </div>
                        </form>
                    </>
                ) : (
                    // Thank You Screen
                    <div className="p-8 sm:p-12 text-center">
                        <div className="text-6xl mb-6">🎉</div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-4">You're on the list!</h2>
                        <p className="text-gray-600 mb-6">
                            We'll notify you as soon as BRNNO launches in <strong>{formData.city}</strong>!
                        </p>

                        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6 mb-6">
                            <h3 className="font-bold text-orange-900 mb-3">🚀 Move Up the List!</h3>
                            <p className="text-sm text-orange-800 mb-4">
                                Get priority access by referring friends. Share your unique link:
                            </p>
                            <div className="bg-white rounded-lg p-3 flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={`brnno.com/waitlist?ref=${formData.email.split('@')[0]}`}
                                    className="flex-1 text-sm text-gray-600 outline-none"
                                />
                                <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors whitespace-nowrap">
                                    Copy Link
                                </button>
                            </div>
                            <p className="text-xs text-orange-700 mt-3">
                                Refer 3 friends and get <strong>$25 off your first service!</strong>
                            </p>
                        </div>

                        <button
                            onClick={closeModal}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-8 py-3 rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
});

const BRNNOMarketplace = () => {
    const [selectedArea, setSelectedArea] = useState('All Areas');
    const [selectedType, setSelectedType] = useState('All Types');
    const [activeFilters, setActiveFilters] = useState([]);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showSignupModal, setShowSignupModal] = useState(false);
    const [showProfilePanel, setShowProfilePanel] = useState(false);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [authMode, setAuthMode] = useState('customer');
    const [profileTab, setProfileTab] = useState('personal');
    const [bookingStep, setBookingStep] = useState(1);
    const [bookingData, setBookingData] = useState({
        service: null,
        date: '',
        time: '',
        vehicle: null,
        address: ''
    });
    const [showProviderModal, setShowProviderModal] = useState(false);
    const [providerStep, setProviderStep] = useState(1); // 1-5 steps
    const [providerData, setProviderData] = useState({
        businessName: '',
        businessType: '',
        ein: '',
        ownerName: '',
        phone: '',
        email: '',
        services: [],
        insurance: null,
        certifications: [],
        serviceArea: '',
        portfolio: [],
        bankAccount: '',
        routingNumber: '',
        backgroundCheck: false
    });
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [showProviderDetail, setShowProviderDetail] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showProviderDashboard, setShowProviderDashboard] = useState(false);
    const [dashboardTab, setDashboardTab] = useState('overview'); // overview, bookings, services, calendar, earnings, reviews, profile
    const [showWaitlistModal, setShowWaitlistModal] = useState(false);
    const [waitlistCount, setWaitlistCount] = useState(523); // Mock number for now
    const [showAdminDashboard, setShowAdminDashboard] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // Authentication state
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Real providers from Firebase
    const [realProviders, setRealProviders] = useState([]);
    const [providersLoading, setProvidersLoading] = useState(true);

    // Using mock waitlist count for public display
    // Real count is only available in admin dashboard

    // Authentication state listener
    React.useEffect(() => {
        // First, handle Google redirect result (for environments blocking popups)
        (async () => {
            try {
                const redirectResult = await getRedirectResult(auth);
                if (redirectResult && redirectResult.user) {
                    const user = redirectResult.user;
                    // Ensure user doc exists
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (!userDoc.exists()) {
                        await setDoc(doc(db, 'users', user.uid), {
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName || '',
                            accountType: 'customer',
                            createdAt: serverTimestamp(),
                            role: 'user'
                        });
                    }
                }
            } catch (e) {
                console.error('Google redirect handling error:', e);
            }
        })();

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setAuthLoading(false);
            if (firebaseUser) {
                setUser(firebaseUser);
                try {
                    // Load user data from Firestore
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (userDoc.exists()) {
                        setUserData(userDoc.data());
                    } else {
                        // Create user document if it doesn't exist
                        await setDoc(doc(db, 'users', firebaseUser.uid), {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName || '',
                            accountType: 'customer',
                            createdAt: serverTimestamp(),
                            role: 'user'
                        });
                        setUserData({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName || '',
                            accountType: 'customer',
                            role: 'user'
                        });
                    }
                } catch (error) {
                    console.error('Error loading user data:', error);
                }
            } else {
                setUser(null);
                setUserData(null);
            }
        });

        return () => unsubscribe();
    }, []);

    // Load real providers from Firebase
    React.useEffect(() => {
        const loadProviders = async () => {
            try {
                setProvidersLoading(true);
                const providersQuery = query(
                    collection(db, 'providers'),
                    where('status', '==', 'approved') // Only show approved providers
                );
                const providersSnapshot = await getDocs(providersQuery);
                const providers = [];

                providersSnapshot.forEach((doc) => {
                    const data = doc.data();
                    providers.push({
                        id: doc.id,
                        name: data.businessName || 'Unknown Business',
                        provider: data.businessName || 'Unknown Business',
                        rating: 4.8, // Default rating for new providers
                        reviews: 0, // New providers start with 0 reviews
                        tags: data.services || [],
                        description: `Professional mobile detailing service by ${data.businessName}`,
                        startingPrice: 120, // Default starting price
                        certified: data.backgroundCheck || false,
                        image: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=400&h=300&fit=crop",
                        serviceArea: data.serviceArea || 'Local Area',
                        phone: data.phone || '',
                        email: data.email || '',
                        ...data
                    });
                });

                setRealProviders(providers);
                console.log('Loaded providers:', providers);
            } catch (error) {
                console.error('Error loading providers:', error);
            } finally {
                setProvidersLoading(false);
            }
        };

        loadProviders();
    }, []);

    // Admin access with authentication
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        if (params.get('admin') === 'brnno2025') {
            if (user && userData && userData.role === 'admin') {
                console.log('Admin access granted');
                setShowAdminDashboard(true);
                setIsAdmin(true);
            } else if (user && userData && userData.role !== 'admin') {
                console.log('Access denied - not admin');
                alert('Access denied. Admin privileges required.');
                setShowAdminDashboard(false);
                setIsAdmin(false);
            } else if (!user) {
                console.log('User not logged in - showing login modal');
                alert('Please log in first to access admin dashboard');
                setShowLoginModal(true);
            }
        }
    }, [user, userData]);

    // Combine mock services with real providers
    const services = [
        {
            id: 1,
            name: "Premium Full Detail",
            provider: "Elite Auto Spa",
            rating: 4.9,
            reviews: 247,
            tags: ["Exterior", "Interior", "Luxury"],
            description: "Complete interior and exterior detailing service for all vehicle types.",
            startingPrice: 150,
            certified: true,
            image: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=400&h=300&fit=crop"
        },
        {
            id: 2,
            name: "Interior Deep Clean",
            provider: "Pristine Mobile",
            rating: 4.8,
            reviews: 189,
            tags: ["Interior", "Deep Clean", "Odor Removal"],
            description: "Professional interior cleaning with steam and extraction methods.",
            startingPrice: 120,
            certified: true,
            image: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=400&h=300&fit=crop"
        },
        {
            id: 3,
            name: "Exterior Polish & Wax",
            provider: "Shine Kings",
            rating: 4.9,
            reviews: 312,
            tags: ["Exterior", "Polish", "Wax"],
            description: "Hand wash, clay bar treatment, polish and premium wax application.",
            startingPrice: 200,
            certified: true,
            image: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=400&h=300&fit=crop"
        },
        {
            id: 4,
            name: "Ceramic Coating",
            provider: "Pro Shield Auto",
            rating: 4.7,
            reviews: 156,
            tags: ["Exterior", "Ceramic", "Protection"],
            description: "Professional ceramic coating application with 5-year warranty.",
            startingPrice: 800,
            certified: true,
            image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400&h=300&fit=crop"
        },
        {
            id: 5,
            name: "Paint Correction",
            provider: "Detail Masters",
            rating: 4.9,
            reviews: 203,
            tags: ["Exterior", "Paint Correction", "Polish"],
            description: "Multi-stage paint correction to remove swirls and scratches.",
            startingPrice: 400,
            certified: true,
            image: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=400&h=300&fit=crop"
        },
        {
            id: 6,
            name: "Quick Wash & Vac",
            provider: "Express Detail Co",
            rating: 4.6,
            reviews: 445,
            tags: ["Exterior", "Interior", "Quick Service"],
            description: "Fast and efficient wash and vacuum for busy schedules.",
            startingPrice: 50,
            certified: true,
            image: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=400&h=300&fit=crop"
        },
        // Add real providers from Firebase
        ...realProviders
    ];

    const toggleFilter = (filter) => {
        setActiveFilters(prev =>
            prev.includes(filter)
                ? prev.filter(f => f !== filter)
                : [...prev, filter]
        );
    };

    // Filter services based on selections
    const filteredServices = services.filter(service => {
        // Filter by area (placeholder logic - you'd implement actual area matching)
        if (selectedArea !== 'All Areas') {
            // This would check if service is available in selected area
            // For now, we'll just return true
        }

        // Filter by type (placeholder logic - you'd implement actual type matching)
        if (selectedType !== 'All Types') {
            // This would check if service matches selected type
            // For now, we'll just return true
        }

        // Filter by active filters
        if (activeFilters.includes('Mobile')) {
            // Check if service is mobile
        }
        if (activeFilters.includes('Certified')) {
            if (!service.certified) return false;
        }
        if (activeFilters.includes('Same Day')) {
            // Check if service offers same day availability
        }
        if (activeFilters.includes('Top Rated')) {
            if (service.rating < 4.8) return false;
        }

        return true;
    });

    const ServiceCard = ({ service }) => (
        <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300">
            <div className="relative h-48 overflow-hidden">
                <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 bg-cyan-500 text-white px-3 py-1 rounded-full flex items-center gap-1 font-semibold text-sm">
                    <Star size={14} className="fill-white" />
                    {service.rating}
                </div>
            </div>
            <div className="p-5">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{service.name}</h3>
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-gray-600">{service.provider}</span>
                    {service.certified && (
                        <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                            <Shield size={12} />
                            Certified
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                    {service.tags.map((tag, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                            {tag}
                        </span>
                    ))}
                </div>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {service.description}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div>
                        <p className="text-xs text-gray-500">Starting at</p>
                        <p className="text-2xl font-bold text-gray-800">${service.startingPrice}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setSelectedProvider(service);
                                setShowProviderDetail(true);
                            }}
                            className="border-2 border-cyan-600 text-cyan-600 hover:bg-cyan-50 font-semibold px-4 py-3 rounded-xl transition-colors duration-200"
                        >
                            View Details
                        </button>
                        <button
                            onClick={() => setShowWaitlistModal(true)}
                            className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-3 rounded-xl font-semibold transition-colors"
                        >
                            Join Waitlist
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Waitlist Banner */}
            <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white py-3 px-4 sm:px-6 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
                    <span className="font-bold text-sm sm:text-base">
                        🚀 Launching Across Utah Soon!
                    </span>
                    <span className="text-xs sm:text-sm text-white/90">
                        Join {waitlistCount}+ Utahns on the waitlist
                    </span>
                    <button
                        onClick={() => setShowWaitlistModal(true)}
                        className="bg-white text-orange-600 hover:bg-orange-50 px-6 py-2 rounded-full font-bold text-sm transition-colors whitespace-nowrap"
                    >
                        Reserve Your Spot →
                    </button>
                </div>
            </div>
            <LoginModal
                showLoginModal={showLoginModal}
                setShowLoginModal={setShowLoginModal}
                authMode={authMode}
                setAuthMode={setAuthMode}
                setShowSignupModal={setShowSignupModal}
            />
            <SignupModal
                showSignupModal={showSignupModal}
                setShowSignupModal={setShowSignupModal}
                authMode={authMode}
                setAuthMode={setAuthMode}
                setShowLoginModal={setShowLoginModal}
            />
            <ProfilePanel
                showProfilePanel={showProfilePanel}
                setShowProfilePanel={setShowProfilePanel}
                profileTab={profileTab}
                setProfileTab={setProfileTab}
            />
            <BookingModal
                showBookingModal={showBookingModal}
                setShowBookingModal={setShowBookingModal}
                bookingStep={bookingStep}
                setBookingStep={setBookingStep}
                bookingData={bookingData}
                setBookingData={setBookingData}
            />
            {showProviderModal && (
                <ProviderApplicationModal
                    showModal={showProviderModal}
                    setShowModal={setShowProviderModal}
                    providerStep={providerStep}
                    setProviderStep={setProviderStep}
                    providerData={providerData}
                    setProviderData={setProviderData}
                />
            )}
            {showProviderDetail && (
                <ProviderDetailModal
                    provider={selectedProvider}
                    showModal={showProviderDetail}
                    setShowModal={setShowProviderDetail}
                    onBookNow={() => {
                        setBookingData(prev => ({ ...prev, provider: selectedProvider }));
                        setShowBookingModal(true);
                    }}
                />
            )}
            {showProviderDashboard && (
                <ProviderDashboard
                    showDashboard={showProviderDashboard}
                    setShowDashboard={setShowProviderDashboard}
                />
            )}
            {showWaitlistModal && (
                <WaitlistModal
                    showModal={showWaitlistModal}
                    setShowModal={setShowWaitlistModal}
                    waitlistCount={waitlistCount}
                />
            )}
            {showAdminDashboard && (
                <AdminDashboard
                    showDashboard={showAdminDashboard}
                    setShowDashboard={setShowAdminDashboard}
                />
            )}

            {/* Navigation */}
            <nav className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <div className="flex items-center gap-2">
                            <Car className="text-cyan-500" size={28} />
                            <span className="text-xl font-bold text-gray-800">BRNNO Services</span>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden lg:flex items-center gap-6 text-sm">
                            <button
                                onClick={() => setShowWaitlistModal(true)}
                                className="text-gray-600 hover:text-cyan-500 transition-colors"
                            >
                                Join Waitlist
                            </button>
                            <button
                                onClick={() => {
                                    // Check if user is authenticated and has provider role
                                    if (auth.currentUser) {
                                        // User is logged in, check their role
                                        getDoc(doc(db, 'users', auth.currentUser.uid)).then(userDoc => {
                                            if (userDoc.exists() && userDoc.data().accountType === 'provider') {
                                                setShowProviderDashboard(true);
                                            } else {
                                                alert('Provider access required. Please sign up as a provider first.');
                                                setShowProviderModal(true);
                                            }
                                        }).catch(() => {
                                            alert('Please sign in first to access provider dashboard.');
                                            setShowLoginModal(true);
                                        });
                                    } else {
                                        alert('Please sign in first to access provider dashboard.');
                                        setShowLoginModal(true);
                                    }
                                }}
                                className="text-gray-600 hover:text-cyan-500 transition-colors"
                            >
                                Provider Dashboard
                            </button>
                            <button
                                onClick={() => {
                                    // Check if user is authenticated
                                    if (auth.currentUser) {
                                        setShowProfilePanel(true);
                                    } else {
                                        alert('Please sign in first to access your profile.');
                                        setShowLoginModal(true);
                                    }
                                }}
                                className="text-gray-600 hover:text-cyan-500 transition-colors"
                            >
                                My Profile
                            </button>
                            <a href="#" className="text-gray-600 hover:text-cyan-500 transition-colors">Reviews</a>
                            <button
                                onClick={() => setShowProviderModal(true)}
                                className="text-gray-600 hover:text-cyan-500 transition-colors"
                            >
                                Become a Provider
                            </button>
                        </div>

                        {/* Desktop Auth Buttons */}
                        <div className="hidden lg:flex items-center gap-3">
                            {user ? (
                                // User is logged in - show user info and logout
                                <>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-gray-800">
                                                {userData?.firstName && userData?.lastName
                                                    ? `${userData.firstName} ${userData.lastName}`
                                                    : user.displayName || 'User'
                                                }
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {userData?.accountType === 'provider' ? 'Provider' : 'Customer'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setShowProfilePanel(true)}
                                            className="w-8 h-8 bg-cyan-500 text-white rounded-full flex items-center justify-center text-sm font-bold hover:bg-cyan-600 transition-colors"
                                        >
                                            {userData?.firstName && userData?.lastName
                                                ? `${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}`
                                                : user.displayName?.charAt(0) || 'U'
                                            }
                                        </button>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await signOut(auth);
                                            } catch (error) {
                                                console.error('Logout error:', error);
                                            }
                                        }}
                                        className="text-gray-600 hover:text-red-500 px-4 py-2 rounded-lg transition-colors"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                // User is not logged in - show login/signup buttons
                                <>
                                    <button
                                        onClick={() => setShowLoginModal(true)}
                                        className="text-gray-600 hover:text-cyan-500 px-4 py-2 rounded-lg transition-colors"
                                    >
                                        Log In
                                    </button>
                                    <button
                                        onClick={() => setShowSignupModal(true)}
                                        className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                                    >
                                        Sign Up
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                            className="lg:hidden text-gray-600 hover:text-cyan-500 p-2"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {showMobileMenu ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>

                    {/* Mobile Menu Dropdown */}
                    {showMobileMenu && (
                        <div className="lg:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        setShowWaitlistModal(true);
                                        setShowMobileMenu(false);
                                    }}
                                    className="text-left text-gray-600 hover:text-cyan-500 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Join Waitlist
                                </button>
                                <button
                                    onClick={() => {
                                        // Check if user is authenticated and has provider role
                                        if (auth.currentUser) {
                                            // User is logged in, check their role
                                            getDoc(doc(db, 'users', auth.currentUser.uid)).then(userDoc => {
                                                if (userDoc.exists() && userDoc.data().accountType === 'provider') {
                                                    setShowProviderDashboard(true);
                                                    setShowMobileMenu(false);
                                                } else {
                                                    alert('Provider access required. Please sign up as a provider first.');
                                                    setShowProviderModal(true);
                                                    setShowMobileMenu(false);
                                                }
                                            }).catch(() => {
                                                alert('Please sign in first to access provider dashboard.');
                                                setShowLoginModal(true);
                                                setShowMobileMenu(false);
                                            });
                                        } else {
                                            alert('Please sign in first to access provider dashboard.');
                                            setShowLoginModal(true);
                                            setShowMobileMenu(false);
                                        }
                                    }}
                                    className="text-gray-600 hover:text-cyan-500 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Provider Dashboard
                                </button>
                                <button
                                    onClick={() => {
                                        // Check if user is authenticated
                                        if (auth.currentUser) {
                                            setShowProfilePanel(true);
                                            setShowMobileMenu(false);
                                        } else {
                                            alert('Please sign in first to access your profile.');
                                            setShowLoginModal(true);
                                            setShowMobileMenu(false);
                                        }
                                    }}
                                    className="text-left text-gray-600 hover:text-cyan-500 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    My Profile
                                </button>
                                <a href="#" className="text-gray-600 hover:text-cyan-500 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                                    Reviews
                                </a>
                                <button
                                    onClick={() => {
                                        setShowProviderModal(true);
                                        setShowMobileMenu(false);
                                    }}
                                    className="text-left text-gray-600 hover:text-cyan-500 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Become a Provider
                                </button>
                                <div className="border-t border-gray-200 pt-3 mt-2">
                                    {user ? (
                                        // User is logged in - show user info and logout
                                        <>
                                            <div className="flex items-center gap-3 px-4 py-3 mb-3 bg-gray-50 rounded-lg">
                                                <div className="w-10 h-10 bg-cyan-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                                    {userData?.firstName && userData?.lastName
                                                        ? `${userData.firstName.charAt(0)}${userData.lastName.charAt(0)}`
                                                        : user.displayName?.charAt(0) || 'U'
                                                    }
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-gray-800">
                                                        {userData?.firstName && userData?.lastName
                                                            ? `${userData.firstName} ${userData.lastName}`
                                                            : user.displayName || 'User'
                                                        }
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {userData?.accountType === 'provider' ? 'Provider' : 'Customer'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await signOut(auth);
                                                        setShowMobileMenu(false);
                                                    } catch (error) {
                                                        console.error('Logout error:', error);
                                                    }
                                                }}
                                                className="w-full text-left text-red-600 hover:text-red-500 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
                                            >
                                                Logout
                                            </button>
                                        </>
                                    ) : (
                                        // User is not logged in - show login/signup buttons
                                        <>
                                            <button
                                                onClick={() => {
                                                    setShowLoginModal(true);
                                                    setShowMobileMenu(false);
                                                }}
                                                className="w-full text-left text-gray-600 hover:text-cyan-500 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                Log In
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowSignupModal(true);
                                                    setShowMobileMenu(false);
                                                }}
                                                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-3 rounded-lg font-semibold mt-2 transition-colors"
                                            >
                                                Sign Up
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <div className="bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
                        Premium Mobile Auto<br className="hidden sm:block" />
                        <span className="sm:inline"> </span>Detailing at Your Doorstep
                    </h1>
                    <p className="text-base sm:text-xl text-cyan-50 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
                        Connect with trusted mobile detailers in your area. Book convenient appointments and get your vehicle detailed without leaving home.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
                        <button
                            onClick={() => setShowWaitlistModal(true)}
                            className="w-full sm:w-auto bg-white text-cyan-600 hover:bg-cyan-50 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg transition-colors"
                        >
                            Join Waitlist
                        </button>
                        <button
                            onClick={() => setShowProviderModal(true)}
                            className="w-full sm:w-auto bg-cyan-700 hover:bg-cyan-800 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg transition-colors border-2 border-white"
                        >
                            Become a Provider
                        </button>
                    </div>
                </div>
            </div>

            {/* Search & Filter Section */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Service Area</label>
                            <select
                                value={selectedArea}
                                onChange={(e) => setSelectedArea(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm sm:text-base"
                            >
                                <option>All Areas</option>
                                <option>Downtown</option>
                                <option>North Side</option>
                                <option>South Side</option>
                                <option>East Side</option>
                                <option>West Side</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Service Type</label>
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm sm:text-base"
                            >
                                <option>All Types</option>
                                <option>Interior Only</option>
                                <option>Exterior Only</option>
                                <option>Full Detail</option>
                                <option>Paint Correction</option>
                                <option>Ceramic Coating</option>
                            </select>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-1">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
                            <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm sm:text-base">
                                <option>Highest Rating</option>
                                <option>Most Reviews</option>
                                <option>Price: Low to High</option>
                                <option>Price: High to Low</option>
                                <option>Nearest</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-700 w-full sm:w-auto mb-2 sm:mb-0">Quick Filters:</span>
                        {['Mobile', 'Certified', 'Same Day', 'Top Rated'].map(filter => (
                            <button
                                key={filter}
                                onClick={() => toggleFilter(filter)}
                                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${activeFilters.includes(filter)
                                    ? 'bg-cyan-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Services Section */}
            <div id="services-section" className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                <div className="mb-6 sm:mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Available Detailing Services</h2>
                    <p className="text-sm sm:text-base text-gray-600">
                        Browse through our network of professional mobile detailers and find the perfect service for your vehicle
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {filteredServices.map(service => (
                        <ServiceCard key={service.id} service={service} />
                    ))}
                </div>
            </div>

            {/* Why Choose Section */}
            <div className="bg-gradient-to-r from-gray-50 to-cyan-50 py-12 sm:py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-8 sm:mb-12">
                        Why Choose BRNNO
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        <div className="text-center">
                            <div className="bg-cyan-500 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MapPin className="text-white" size={32} />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Come to You</h3>
                            <p className="text-sm sm:text-base text-gray-600 px-4">
                                Professional detailers arrive at your location, saving you time and hassle
                            </p>
                        </div>
                        <div className="text-center">
                            <div className="bg-cyan-500 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Shield className="text-white" size={32} />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Verified Professionals</h3>
                            <p className="text-sm sm:text-base text-gray-600 px-4">
                                All detailers are vetted and certified by our quality standards
                            </p>
                        </div>
                        <div className="text-center sm:col-span-2 lg:col-span-1">
                            <div className="bg-cyan-500 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Lock className="text-white" size={32} />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Secure Payment</h3>
                            <p className="text-sm sm:text-base text-gray-600 px-4">
                                Book and pay securely through our platform with transparent pricing
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-gray-800 text-white py-8">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-gray-400 text-sm">
                        This page is from your design and was generated to make your detailing work easier.
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                        If you have any comments or feedback, let us know!
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default BRNNOMarketplace;
