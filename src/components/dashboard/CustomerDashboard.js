import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Car, CreditCard, Home, Edit2, Trash2, Plus, X, Shield, Bell, CheckCircle, DollarSign } from 'lucide-react';
import { collection, addDoc, getDocs, getDoc, query, where, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { ProfileDropdown } from '../common';
import {
    requestNotificationPermission,
    saveFCMToken,
    subscribeToNotifications,
    subscribeToUnreadCount,
    setupForegroundMessageHandler
} from '../../services/notificationService';
import UpcomingAppointments from './UpcomingAppointments';
import SavedVehicles from './SavedVehicles';

// These sub-components will be extracted later
function PaymentMethods({ methods, currentUser }) {
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Payment Methods</h2>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                    <Plus className="w-5 h-5" />
                    Add Payment Method
                </button>
            </div>
            {(!methods || methods.length === 0) ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No payment methods</h3>
                    <p className="text-gray-600 mb-4">Add a payment method to make booking easier</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {methods.map((method) => (
                        <div key={method.id} className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <CreditCard className="w-8 h-8 text-gray-400" />
                                    <div>
                                        <div className="font-semibold text-gray-900">{method.type} •••• {method.last4}</div>
                                        <div className="text-sm text-gray-500">Expires {method.expiry}</div>
                                    </div>
                                </div>
                                <button className="px-3 py-2 border-2 border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function SavedAddresses({ addresses, userData, onRefresh }) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [addressData, setAddressData] = useState({ label: '', address: '' });

    async function handleSaveAddress() {
        if (!userData?.id) {
            alert('User data not loaded');
            return;
        }
        if (!addressData.label || !addressData.address) {
            alert('Please fill in all fields');
            return;
        }
        try {
            if (editingAddress) {
                await updateDoc(doc(db, 'customer', userData.id, 'addresses', editingAddress.id), addressData);
                alert('Address updated successfully!');
            } else {
                await addDoc(collection(db, 'customer', userData.id, 'addresses'), { ...addressData, createdAt: serverTimestamp() });
                alert('Address added successfully!');
            }
            setShowAddModal(false);
            setEditingAddress(null);
            setAddressData({ label: '', address: '' });
            onRefresh();
        } catch (error) {
            console.error('Error saving address:', error);
            alert('Failed to save address');
        }
    }

    async function handleDeleteAddress(addressId) {
        if (!confirm('Are you sure you want to delete this address?')) return;
        try {
            await deleteDoc(doc(db, 'customer', userData.id, 'addresses', addressId));
            alert('Address deleted successfully!');
            onRefresh();
        } catch (error) {
            console.error('Error deleting address:', error);
            alert('Failed to delete address');
        }
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Saved Addresses</h2>
                <button onClick={() => { setEditingAddress(null); setAddressData({ label: '', address: '' }); setShowAddModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                    <Plus className="w-5 h-5" />
                    Add Address
                </button>
            </div>
            {addresses.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No saved addresses</h3>
                    <p className="text-gray-600 mb-4">Save addresses for faster booking</p>
                    <button onClick={() => setShowAddModal(true)} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Add Your First Address</button>
                </div>
            ) : (
                <div className="space-y-4">
                    {addresses.map((addr) => (
                        <div key={addr.id} className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Home className="w-8 h-8 text-gray-400" />
                                    <div>
                                        <div className="font-semibold text-gray-900">{addr.label}</div>
                                        <div className="text-sm text-gray-500">{addr.address}</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditingAddress(addr); setAddressData({ label: addr.label, address: addr.address }); setShowAddModal(true); }} className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">Edit</button>
                                    <button onClick={() => handleDeleteAddress(addr.id)} className="px-3 py-2 border-2 border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50">Remove</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-8 relative">
                        <button onClick={() => { setShowAddModal(false); setEditingAddress(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingAddress ? 'Edit Address' : 'Add Address'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
                                <input type="text" value={addressData.label} onChange={(e) => setAddressData({ ...addressData, label: e.target.value })} placeholder="Home, Work, Parent's House..." className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                                <textarea value={addressData.address} onChange={(e) => setAddressData({ ...addressData, address: e.target.value })} placeholder="123 Main St, City, ST 12345" rows="3" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none" />
                            </div>
                        </div>
                        <button onClick={handleSaveAddress} className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700">{editingAddress ? 'Update Address' : 'Add Address'}</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function UserProfile({ userData, currentUser, address, answers, userCoordinates }) {
    const [isEditingPreferences, setIsEditingPreferences] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editedAddress, setEditedAddress] = useState('');
    const [editedProfile, setEditedProfile] = useState({ firstName: '', lastName: '', phone: '' });
    const [editedPreferences, setEditedPreferences] = useState({ vehicleType: '', serviceType: '', timeSlot: '' });

    useEffect(() => {
        if (userData) {
            setEditedAddress(userData.address || '');
            setEditedProfile({ firstName: userData.firstName || '', lastName: userData.lastName || '', phone: userData.phone || '' });
            setEditedPreferences(userData.preferences || { vehicleType: '', serviceType: '', timeSlot: '' });
        }
    }, [userData]);

    async function handleSaveProfile() {
        if (!userData?.id) return;
        try {
            await updateDoc(doc(db, 'customer', userData.id), {
                firstName: editedProfile.firstName,
                lastName: editedProfile.lastName,
                displayName: `${editedProfile.firstName} ${editedProfile.lastName}`.trim(),
                phone: editedProfile.phone,
                updatedAt: serverTimestamp()
            });
            alert('Profile updated successfully!');
            setIsEditingProfile(false);
            window.location.reload();
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile');
        }
    }

    async function handleResetPassword() {
        if (!currentUser?.email) {
            alert('Email address not found. Please contact support.');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, currentUser.email);
            alert('Password reset email sent! Please check your inbox and follow the instructions to reset your password.');
        } catch (error) {
            console.error('Error sending password reset email:', error);
            alert(`Failed to send password reset email: ${error.message}`);
        }
    }

    async function handleSavePreferences() {
        if (!userData?.id) return;
        try {
            await updateDoc(doc(db, 'customer', userData.id), {
                address: editedAddress,
                preferences: editedPreferences,
                updatedAt: serverTimestamp()
            });
            alert('Preferences updated successfully!');
            setIsEditingPreferences(false);
            window.location.reload();
        } catch (error) {
            console.error('Error updating preferences:', error);
            alert('Failed to update preferences');
        }
    }

    if (!userData) {
        return <div className="bg-white rounded-xl border border-gray-200 p-12 text-center"><p className="text-gray-600">Loading profile...</p></div>;
    }

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Information</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
                    {!isEditingProfile && <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 rounded-lg font-semibold hover:bg-gray-50"><Edit2 className="w-4 h-4" />Edit</button>}
                </div>
                <div className="max-w-2xl">
                    {!isEditingProfile ? (
                        <>
                            <div className="grid grid-cols-2 gap-6">
                                <div><label className="block text-sm font-medium text-gray-500 mb-1">First Name</label><div className="text-lg font-semibold text-gray-900">{userData.firstName || 'Not set'}</div></div>
                                <div><label className="block text-sm font-medium text-gray-500 mb-1">Last Name</label><div className="text-lg font-semibold text-gray-900">{userData.lastName || 'Not set'}</div></div>
                                <div><label className="block text-sm font-medium text-gray-500 mb-1">Email</label><div className="text-lg font-semibold text-gray-900">{userData.email}</div><p className="text-xs text-gray-500 mt-1">Email cannot be changed</p></div>
                                <div><label className="block text-sm font-medium text-gray-500 mb-1">Phone</label><div className="text-lg font-semibold text-gray-900">{userData.phone || 'Not set'}</div></div>
                                <div><label className="block text-sm font-medium text-gray-500 mb-1">Account Type</label><div className="text-lg font-semibold text-gray-900 capitalize">{userData.accountType || 'customer'}</div></div>
                                <div><label className="block text-sm font-medium text-gray-500 mb-1">Member Since</label><div className="text-lg font-semibold text-gray-900">{userData.createdAt ? new Date(userData.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</div></div>
                            </div>
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <button onClick={handleResetPassword} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"><Shield className="w-4 h-4" />Reset Password</button>
                                <p className="text-xs text-gray-500 mt-2">We'll send a password reset link to your email address.</p>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">First Name</label><input type="text" value={editedProfile.firstName} onChange={(e) => setEditedProfile({ ...editedProfile, firstName: e.target.value })} placeholder="First Name" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label><input type="text" value={editedProfile.lastName} onChange={(e) => setEditedProfile({ ...editedProfile, lastName: e.target.value })} placeholder="Last Name" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none" /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-gray-700 mb-2">Phone</label><input type="tel" value={editedProfile.phone} onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })} placeholder="(555) 123-4567" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none" /></div>
                            <div className="flex gap-3 pt-4">
                                <button onClick={handleSaveProfile} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Save Changes</button>
                                <button onClick={() => { setIsEditingProfile(false); setEditedProfile({ firstName: userData.firstName || '', lastName: userData.lastName || '', phone: userData.phone || '' }); }} className="px-6 py-3 border-2 border-gray-200 rounded-lg font-semibold hover:bg-gray-50">Cancel</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Booking Preferences</h3>
                    {!isEditingPreferences && <button onClick={() => setIsEditingPreferences(true)} className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 rounded-lg font-semibold hover:bg-gray-50"><Edit2 className="w-4 h-4" />Edit</button>}
                </div>
                {!isEditingPreferences ? (
                    <div className="max-w-2xl space-y-4">
                        <div><label className="block text-sm font-medium text-gray-500 mb-1">Default Address</label><div className="text-lg text-gray-900">{userData.address || 'Not set'}</div></div>
                        {userData.preferences && (
                            <>
                                <div><label className="block text-sm font-medium text-gray-500 mb-1">Preferred Vehicle Type</label><div className="text-lg text-gray-900">{userData.preferences.vehicleType || 'Not set'}</div></div>
                                <div><label className="block text-sm font-medium text-gray-500 mb-1">Preferred Service Type</label><div className="text-lg text-gray-900">{userData.preferences.serviceType || 'Not set'}</div></div>
                                <div><label className="block text-sm font-medium text-gray-500 mb-1">Preferred Time Slot</label><div className="text-lg text-gray-900">{userData.preferences.timeSlot || 'Not set'}</div></div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="max-w-2xl space-y-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Default Address</label><input type="text" value={editedAddress} onChange={(e) => setEditedAddress(e.target.value)} placeholder="123 Main St, City, State ZIP" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none" /></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Preferred Vehicle Type</label><select value={editedPreferences.vehicleType} onChange={(e) => setEditedPreferences({ ...editedPreferences, vehicleType: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"><option value="">Select vehicle type</option><option value="Sedan">Sedan</option><option value="SUV">SUV</option><option value="Truck">Truck</option><option value="Sports Car">Sports Car</option><option value="Van">Van</option><option value="Motorcycle">Motorcycle</option></select></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Preferred Service Type</label><select value={editedPreferences.serviceType} onChange={(e) => setEditedPreferences({ ...editedPreferences, serviceType: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"><option value="">Select service type</option><option value="Full Detail">Full Detail</option><option value="Exterior Only">Exterior Only</option><option value="Interior Only">Interior Only</option><option value="Paint Correction">Paint Correction</option><option value="Ceramic Coating">Ceramic Coating</option><option value="Basic Wash">Basic Wash</option></select></div>
                        <div><label className="block text-sm font-medium text-gray-700 mb-2">Preferred Time Slot</label><select value={editedPreferences.timeSlot} onChange={(e) => setEditedPreferences({ ...editedPreferences, timeSlot: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"><option value="">Select time slot</option><option value="Morning (8am-12pm)">Morning (8am-12pm)</option><option value="Afternoon (12pm-4pm)">Afternoon (12pm-4pm)</option><option value="Evening (4pm-8pm)">Evening (4pm-8pm)</option><option value="Flexible">Flexible</option></select></div>
                        <div className="flex gap-3 pt-4">
                            <button onClick={handleSavePreferences} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Save Changes</button>
                            <button onClick={() => setIsEditingPreferences(false)} className="px-6 py-3 border-2 border-gray-200 rounded-lg font-semibold hover:bg-gray-50">Cancel</button>
                        </div>
                    </div>
                )}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900">💡 <strong>Tip:</strong> These preferences are used to pre-fill your booking information. You can always change them when making a booking.</p>
                </div>
            </div>
        </div>
    );
}

export default function CustomerDashboard({ currentUser, onBackToMarketplace, onLogout, showProfileDropdown, setShowProfileDropdown, address, answers, userCoordinates }) {
    const [activeTab, setActiveTab] = useState('upcoming');
    const [loading, setLoading] = useState(true);
    const profileDropdownRef = React.useRef(null);
    const [upcomingAppointments, setUpcomingAppointments] = useState([]);
    const [savedVehicles, setSavedVehicles] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
                setShowProfileDropdown(false);
            }
        }
        if (showProfileDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showProfileDropdown, setShowProfileDropdown]);

    useEffect(() => {
        if (currentUser) {
            loadDashboardData();
        }
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser) return;
        let unsubscribeNotifications = null;
        let unsubscribeUnread = null;
        async function initializeNotifications() {
            try {
                const token = await requestNotificationPermission();
                if (token) {
                    await saveFCMToken(currentUser.uid, token);
                }
                setupForegroundMessageHandler();
                try {
                    unsubscribeNotifications = subscribeToNotifications(currentUser.uid, (notifs) => {
                        try {
                            // Handle customer notifications if needed
                        } catch (error) {
                            console.error('Error handling customer notifications:', error);
                        }
                    });
                    unsubscribeUnread = subscribeToUnreadCount(currentUser.uid, (count) => {
                        try {
                            // Handle unread count if needed
                        } catch (error) {
                            console.error('Error handling unread count:', error);
                        }
                    });
                } catch (subscriptionError) {
                    console.error('Error setting up notification subscriptions:', subscriptionError);
                }
            } catch (error) {
                console.error('Error initializing customer notifications:', error);
            }
        }
        initializeNotifications();
        return () => {
            try {
                if (typeof unsubscribeNotifications === 'function') unsubscribeNotifications();
                if (typeof unsubscribeUnread === 'function') unsubscribeUnread();
            } catch (error) {
                console.warn('Error unsubscribing from notifications:', error);
            }
        };
    }, [currentUser]);

    async function loadDashboardData() {
        setLoading(true);
        try {
            const customerDoc = await getDoc(doc(db, 'customer', currentUser.uid));
            const detailerDoc = await getDoc(doc(db, 'detailer', currentUser.uid));
            let userId = null;
            if (customerDoc.exists()) {
                userId = customerDoc.id;
                setUserData({ id: customerDoc.id, ...customerDoc.data() });
            } else if (detailerDoc.exists()) {
                userId = detailerDoc.id;
                setUserData({ id: detailerDoc.id, ...detailerDoc.data() });
            }
            await loadUpcomingAppointments();
            if (userId) {
                await loadSavedVehicles(userId);
            }
            if (userId) {
                await loadSavedAddresses(userId);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadUpcomingAppointments() {
        try {
            const bookingsQuery = query(collection(db, 'bookings'), where('customerId', '==', currentUser.uid), where('status', 'in', ['pending', 'confirmed', 'scheduled']));
            const bookingsSnapshot = await getDocs(bookingsQuery);
            const appointments = await Promise.all(
                bookingsSnapshot.docs.map(async (bookingDoc) => {
                    const booking = bookingDoc.data();
                    let providerName = 'Unknown Provider';
                    let providerData = null;
                    if (booking.providerUserId) {
                        const providerDoc = await getDoc(doc(db, 'detailer', booking.providerUserId));
                        if (providerDoc.exists()) {
                            providerName = providerDoc.data().businessName || providerDoc.data().displayName || 'Unknown Provider';
                            providerData = providerDoc.data();
                        }
                    }
                    return {
                        id: bookingDoc.id,
                        detailerName: providerName,
                        service: booking.services && booking.services.length > 0 ? booking.services.map(s => s.name).join(', ') : booking.serviceName || 'Service',
                        services: booking.services || (booking.serviceName ? [{ name: booking.serviceName, price: booking.price }] : []),
                        date: booking.date ? new Date(booking.date).toLocaleDateString() : 'TBD',
                        dateRaw: booking.date || null,
                        time: booking.time || 'TBD',
                        price: booking.price || 0,
                        address: booking.address || 'N/A',
                        status: booking.status,
                        providerUserId: booking.providerUserId || null,
                        providerId: booking.providerId || null,
                        providerData: providerData
                    };
                })
            );
            setUpcomingAppointments(appointments);
        } catch (error) {
            console.error('Error loading appointments:', error);
            setUpcomingAppointments([]);
        }
    }

    async function loadSavedVehicles(userId) {
        if (!userId) {
            setSavedVehicles([]);
            return;
        }
        try {
            const vehiclesSnapshot = await getDocs(collection(db, 'customer', userId, 'vehicles'));
            const vehicles = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSavedVehicles(vehicles);
        } catch (error) {
            setSavedVehicles([]);
        }
    }

    async function loadSavedAddresses(userId) {
        if (!userId) {
            setSavedAddresses([]);
            return;
        }
        try {
            const addressesSnapshot = await getDocs(collection(db, 'customer', userId, 'addresses'));
            const addresses = addressesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSavedAddresses(addresses);
        } catch (error) {
            setSavedAddresses([]);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="sticky top-0 z-40 backdrop-blur-xl bg-gradient-to-r from-blue-600/90 via-blue-700/90 to-indigo-600/90 border-b border-blue-400/20 shadow-lg">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={onBackToMarketplace} className="text-white font-semibold hover:text-blue-100 transition-colors drop-shadow-sm">← Back</button>
                            <h1 className="text-2xl font-bold text-white drop-shadow-md">My Dashboard</h1>
                        </div>
                        <div className="relative" ref={profileDropdownRef}>
                            <button onClick={() => setShowProfileDropdown(!showProfileDropdown)} className="w-11 h-11 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 ring-2 ring-white/30">
                                {currentUser?.initials || (currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'ME')}
                            </button>
                            {showProfileDropdown && <ProfileDropdown currentUser={currentUser} onGoToDashboard={() => { setShowProfileDropdown(false); }} onLogout={onLogout} />}
                        </div>
                    </div>
                </div>
            </div>
            {userData && (
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <div className="max-w-6xl mx-auto px-4 py-6">
                        <h2 className="text-3xl font-bold mb-2">Welcome back, {userData.firstName || currentUser.name}!</h2>
                        <div className="flex items-center gap-4 text-blue-100">
                            <span>{userData.email}</span>
                            {userData.phone && <><span>•</span><span>{userData.phone}</span></>}
                        </div>
                    </div>
                </div>
            )}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex gap-8">
                        <button onClick={() => setActiveTab('upcoming')} className={`py-4 border-b-2 font-semibold transition-colors ${activeTab === 'upcoming' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>Upcoming</button>
                        <button onClick={() => setActiveTab('vehicles')} className={`py-4 border-b-2 font-semibold transition-colors ${activeTab === 'vehicles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>Vehicles</button>
                        <button onClick={() => setActiveTab('addresses')} className={`py-4 border-b-2 font-semibold transition-colors ${activeTab === 'addresses' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>Addresses</button>
                        <button onClick={() => setActiveTab('profile')} className={`py-4 border-b-2 font-semibold transition-colors ${activeTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>Profile</button>
                        <button onClick={() => setActiveTab('payment')} className={`py-4 border-b-2 font-semibold transition-colors ${activeTab === 'payment' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>Payment Methods</button>
                    </div>
                </div>
            </div>
            <div className="max-w-6xl mx-auto px-4 py-8">
                {activeTab === 'upcoming' && <UpcomingAppointments appointments={upcomingAppointments} onRefresh={loadUpcomingAppointments} />}
                {activeTab === 'vehicles' && <SavedVehicles vehicles={savedVehicles} userData={userData} onRefresh={() => userData?.id && loadSavedVehicles(userData.id)} />}
                {activeTab === 'addresses' && <SavedAddresses addresses={savedAddresses} userData={userData} onRefresh={() => userData?.id && loadSavedAddresses(userData.id)} />}
                {activeTab === 'profile' && <UserProfile userData={userData} currentUser={currentUser} address={address} answers={answers} userCoordinates={userCoordinates} />}
                {activeTab === 'payment' && <PaymentMethods methods={paymentMethods} currentUser={currentUser} />}
            </div>
        </div>
    );
}

