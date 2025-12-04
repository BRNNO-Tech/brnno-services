import React, { useState, useEffect, useRef } from 'react';
import {
    MapPin, Car, Calendar, Star, CheckCircle2, X,
    Clock, DollarSign, Shield, User, Package,
    Edit2, Plus, Mail, Phone, Bell, CheckCircle
} from 'lucide-react';
import {
    collection,
    getDocs,
    getDoc,
    query,
    where,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../firebase/config';
import { sendPasswordResetEmail } from 'firebase/auth';
import { PACKAGES_DATA, ADD_ONS, importPackagesToFirestore } from '../../data/packages';
import {
    requestNotificationPermission,
    saveFCMToken,
    subscribeToNotifications,
    subscribeToUnreadCount,
    markNotificationAsRead,
    markAllAsRead,
    setupForegroundMessageHandler
} from '../../services/notificationService';

// Notification Center Component
function NotificationCenter({ notifications = [], unreadCount = 0, onMarkAsRead, onMarkAllAsRead }) {
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'new_booking':
                return <Calendar className="w-5 h-5 text-blue-600" />;
            case 'booking_confirmed':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'booking_cancelled':
                return <X className="w-5 h-5 text-red-600" />;
            case 'payment_received':
                return <DollarSign className="w-5 h-5 text-green-600" />;
            case 'booking_reminder':
                return <Clock className="w-5 h-5 text-yellow-600" />;
            default:
                return <Bell className="w-5 h-5 text-gray-600" />;
        }
    };

    const getNotificationColor = (type) => {
        switch (type) {
            case 'new_booking':
                return 'bg-blue-50 border-blue-200';
            case 'booking_confirmed':
                return 'bg-green-50 border-green-200';
            case 'booking_cancelled':
                return 'bg-red-50 border-red-200';
            case 'payment_received':
                return 'bg-green-50 border-green-200';
            case 'booking_reminder':
                return 'bg-yellow-50 border-yellow-200';
            default:
                return 'bg-gray-50 border-gray-200';
        }
    };

    const formatDate = (timestamp) => {
        try {
            if (!timestamp) return 'Just now';

            let date;
            if (timestamp && typeof timestamp.toDate === 'function') {
                date = timestamp.toDate();
            } else if (timestamp && timestamp.seconds) {
                date = new Date(timestamp.seconds * 1000);
            } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
                date = new Date(timestamp);
            } else {
                return 'Just now';
            }

            if (isNaN(date.getTime())) {
                return 'Just now';
            }

            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            return date.toLocaleDateString();
        } catch (error) {
            console.warn('Error formatting date:', error);
            return 'Just now';
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                    {unreadCount > 0 && (
                        <p className="text-sm text-gray-600 mt-1">
                            {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
                        </p>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={onMarkAllAsRead}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            {!notifications || notifications.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No notifications</h3>
                    <p className="text-gray-600">You'll see notifications about bookings, payments, and updates here</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((notification) => {
                        if (!notification) return null;
                        return (
                            <div
                                key={notification.id || Math.random()}
                                className={`bg-white rounded-xl border-2 p-5 transition-all cursor-pointer hover:shadow-md ${notification.read ? 'opacity-75' : getNotificationColor(notification.type || 'default')
                                    }`}
                                onClick={() => !notification.read && onMarkAsRead && onMarkAsRead(notification.id)}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 mt-0.5">
                                        {getNotificationIcon(notification.type || 'default')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900 mb-1">
                                                    {notification.title || 'Notification'}
                                                </h3>
                                                <p className="text-gray-600 text-sm mb-2">
                                                    {notification.message || ''}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {formatDate(notification.createdAt)}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <div className="flex-shrink-0">
                                                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function ProviderDashboard({ currentUser, onBackToMarketplace, onLogout, showProfileDropdown, setShowProfileDropdown }) {
    const [activeTab, setActiveTab] = useState('bookings');
    const [loading, setLoading] = useState(true);
    const [bookings, setBookings] = useState([]);
    const [providerDocId, setProviderDocId] = useState(null);
    const [userData, setUserData] = useState(null);
    const [availablePackages, setAvailablePackages] = useState([]);
    const [selectedPackages, setSelectedPackages] = useState([]);
    const [selectedAddOns, setSelectedAddOns] = useState([]);
    const [packagePrices, setPackagePrices] = useState({});
    const [savingPackages, setSavingPackages] = useState(false);
    const [weeklySchedule, setWeeklySchedule] = useState({});
    const [blackoutDates, setBlackoutDates] = useState([]);
    const [selectedBlackoutDate, setSelectedBlackoutDate] = useState('');
    const [showBlackoutModal, setShowBlackoutModal] = useState(false);
    const [pendingProviders, setPendingProviders] = useState([]);
    const [rejectedProviders, setRejectedProviders] = useState([]);
    const [loadingPending, setLoadingPending] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editedProviderProfile, setEditedProviderProfile] = useState({
        businessName: '',
        serviceArea: '',
        businessAddress: '',
        phone: '',
        email: ''
    });
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const profileDropdownRef = useRef(null);

    // Close dropdown when clicking outside
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

    async function loadPendingProviders() {
        if (userData?.role !== 'admin') return;

        setLoadingPending(true);
        try {
            const pendingQuery = query(
                collection(db, 'detailer'),
                where('status', '==', 'pending')
            );
            const snapshot = await getDocs(pendingQuery);

            const pending = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setPendingProviders(pending);
        } catch (error) {
            console.error('Error loading pending providers:', error);
        } finally {
            setLoadingPending(false);
        }
    }

    async function loadRejectedProviders() {
        if (userData?.role !== 'admin') return;

        try {
            const rejectedQuery = query(
                collection(db, 'detailer'),
                where('status', '==', 'rejected')
            );
            const snapshot = await getDocs(rejectedQuery);

            const rejected = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setRejectedProviders(rejected);
        } catch (error) {
            console.error('Error loading rejected providers:', error);
        }
    }

    useEffect(() => {
        if (currentUser) {
            loadProviderData();
        }
    }, [currentUser]);

    // Initialize notifications with proper cleanup
    useEffect(() => {
        if (!currentUser) return;

        let unsubscribeNotifications = null;
        let unsubscribeUnread = null;
        let isMounted = true;

        async function initializeNotifications() {
            try {
                const token = await requestNotificationPermission();
                if (token && isMounted) {
                    await saveFCMToken(currentUser.uid, token);
                }

                if (!isMounted) return;

                setupForegroundMessageHandler();

                try {
                    unsubscribeNotifications = subscribeToNotifications(currentUser.uid, (notifs) => {
                        if (!isMounted) return;
                        try {
                            setNotifications(Array.isArray(notifs) ? notifs : []);
                        } catch (error) {
                            console.error('Error setting notifications state:', error);
                            setNotifications([]);
                        }
                    });

                    unsubscribeUnread = subscribeToUnreadCount(currentUser.uid, (count) => {
                        if (!isMounted) return;
                        try {
                            setUnreadCount(typeof count === 'number' ? count : 0);
                        } catch (error) {
                            console.error('Error setting unread count state:', error);
                            setUnreadCount(0);
                        }
                    });
                } catch (subscriptionError) {
                    console.error('Error setting up notification subscriptions:', subscriptionError);
                    if (isMounted) {
                        setNotifications([]);
                        setUnreadCount(0);
                    }
                }
            } catch (error) {
                console.error('Error initializing notifications:', error);
                if (isMounted) {
                    setNotifications([]);
                    setUnreadCount(0);
                }
            }
        }

        initializeNotifications();

        // Cleanup function - properly attached to useEffect
        return () => {
            isMounted = false;
            try {
                if (typeof unsubscribeNotifications === 'function') {
                    unsubscribeNotifications();
                }
                if (typeof unsubscribeUnread === 'function') {
                    unsubscribeUnread();
                }
            } catch (error) {
                console.warn('Error unsubscribing from notifications:', error);
            }
        };
    }, [currentUser]);

    useEffect(() => {
        if (userData?.role === 'admin') {
            loadPendingProviders();
        }
    }, [userData]);

    useEffect(() => {
        if (activeTab === 'admin' && userData?.role === 'admin') {
            loadPendingProviders();
            loadRejectedProviders();
        }
    }, [activeTab, userData]);

    async function loadProviderData() {
        setLoading(true);
        try {
            const detailerDoc = await getDoc(doc(db, 'detailer', currentUser.uid));

            if (!detailerDoc.exists()) {
                console.error('Detailer document not found');
                return;
            }

            const data = detailerDoc.data();
            setUserData({ id: detailerDoc.id, ...data });
            setProviderDocId(detailerDoc.id);

            setSelectedPackages(data.offeredPackages || []);
            setSelectedAddOns(data.addOns || []);
            setPackagePrices(data.packagePrices || {});

            setEditedProviderProfile({
                businessName: data.businessName || '',
                serviceArea: data.serviceArea || '',
                businessAddress: data.businessAddress || data.address || '',
                phone: data.phone || '',
                email: data.email || ''
            });

            const defaultAvail = data.defaultAvailability || {};
            const normalizedSchedule = {};
            Object.keys(defaultAvail).forEach(day => {
                const daySchedule = defaultAvail[day];
                if (daySchedule && daySchedule.enabled) {
                    normalizedSchedule[day] = {
                        enabled: true,
                        start: daySchedule.start || '09:00',
                        end: daySchedule.end || '17:00'
                    };
                } else {
                    normalizedSchedule[day] = daySchedule;
                }
            });
            setWeeklySchedule(normalizedSchedule);

            const overrides = data.dateOverrides || {};
            const blackouts = Object.keys(overrides)
                .filter(date => overrides[date]?.type === 'unavailable')
                .map(date => ({ date, type: 'unavailable' }));
            setBlackoutDates(blackouts);

            const packagesQuery = collection(db, 'packages');
            const packagesSnapshot = await getDocs(packagesQuery);
            if (!packagesSnapshot.empty) {
                const packages = packagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAvailablePackages(packages);
            } else {
                setAvailablePackages(PACKAGES_DATA);
            }

            await loadBookings();
        } catch (error) {
            console.error('Error loading provider data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadBookings() {
        try {
            console.log('Current user UID:', auth.currentUser?.uid);

            const providerUserId = currentUser.uid;
            const providerDocId = currentUser.uid;

            console.log('Loading bookings for provider:', providerUserId);

            let bookingsByUserId = { docs: [] };
            try {
                const bookingsQueryByUserId = query(
                    collection(db, 'bookings'),
                    where('providerUserId', '==', providerUserId)
                );
                bookingsByUserId = await getDocs(bookingsQueryByUserId);
                console.log(`Found ${bookingsByUserId.docs.length} bookings by providerUserId`);
            } catch (err) {
                console.error('Error querying by providerUserId:', err);
            }

            let bookingsById = { docs: [] };
            if (providerDocId) {
                try {
                    const bookingsQueryById = query(
                        collection(db, 'bookings'),
                        where('providerId', '==', providerDocId)
                    );
                    bookingsById = await getDocs(bookingsQueryById);
                    console.log(`Found ${bookingsById.docs.length} bookings by providerId`);
                } catch (err) {
                    if (err.code !== 'permission-denied') {
                        console.warn('Could not query by providerId:', err);
                    }
                }
            }

            let allBookingDocs = [...bookingsByUserId.docs];
            const existingIds = new Set(bookingsByUserId.docs.map(d => d.id));

            bookingsById.docs.forEach(doc => {
                if (!existingIds.has(doc.id)) {
                    allBookingDocs.push(doc);
                }
            });

            console.log(`Total unique bookings found: ${allBookingDocs.length}`);

            const bookingsSnapshot = {
                docs: allBookingDocs
            };

            const bookingsList = await Promise.all(
                bookingsSnapshot.docs.map(async (bookingDoc) => {
                    const booking = bookingDoc.data();

                    let customerName = 'Unknown Customer';
                    let customerEmail = '';
                    let customerPhone = '';
                    if (booking.customerId) {
                        try {
                            const customerDoc = await getDoc(doc(db, 'customer', booking.customerId));
                            if (customerDoc.exists()) {
                                const customerData = customerDoc.data();
                                customerName = customerData.firstName && customerData.lastName
                                    ? `${customerData.firstName} ${customerData.lastName}`
                                    : customerData.displayName || customerData.email || 'Unknown';
                                customerEmail = customerData.email || '';
                                customerPhone = customerData.phone || '';
                            }
                        } catch (customerError) {
                            console.warn('Could not read customer document (expected for providers):', customerError);
                            customerEmail = booking.customerEmail || '';
                            customerName = booking.customerEmail || 'Customer';
                        }
                    }

                    return {
                        id: bookingDoc.id,
                        customerName,
                        customerEmail,
                        customerPhone,
                        service: booking.services && booking.services.length > 0
                            ? booking.services.map(s => s.name).join(', ')
                            : booking.serviceName || 'Service',
                        services: booking.services || (booking.serviceName ? [{ name: booking.serviceName, price: booking.price }] : []),
                        packageName: booking.packageName,
                        packagePrice: booking.packagePrice,
                        addOns: booking.addOns || [],
                        date: booking.date ? new Date(booking.date.seconds ? booking.date.seconds * 1000 : booking.date).toLocaleDateString() : 'TBD',
                        time: booking.time || 'TBD',
                        price: booking.price || 0,
                        address: booking.address || 'N/A',
                        vehicleType: booking.vehicleType || 'Not specified',
                        status: booking.status || 'pending',
                        createdAt: booking.createdAt
                    };
                })
            );

            bookingsList.sort((a, b) => {
                if (a.date === 'TBD') return 1;
                if (b.date === 'TBD') return -1;
                return new Date(a.date) - new Date(b.date);
            });

            setBookings(bookingsList);
        } catch (error) {
            console.error('Error loading bookings:', error);
            setBookings([]);
        }
    }

    async function handleUpdateBookingStatus(bookingId, newStatus) {
        try {
            await updateDoc(doc(db, 'bookings', bookingId), {
                status: newStatus,
                updatedAt: serverTimestamp()
            });

            alert(`Booking ${newStatus} successfully`);
            loadBookings();
        } catch (error) {
            console.error('Error updating booking:', error);
            alert('Failed to update booking');
        }
    }

    async function handleSaveWeeklySchedule() {
        try {
            await updateDoc(doc(db, 'detailer', currentUser.uid), {
                defaultAvailability: weeklySchedule,
                updatedAt: serverTimestamp()
            });
            alert('Weekly schedule saved successfully!');
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('Failed to save schedule');
            loadProviderData();
        }
    }

    function handleDayScheduleChange(day, field, value) {
        setWeeklySchedule(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                [field]: value
            }
        }));
    }

    function handleToggleDay(day) {
        setWeeklySchedule(prev => {
            const currentDay = prev[day] || {};
            const isCurrentlyEnabled = currentDay.enabled || false;

            return {
                ...prev,
                [day]: {
                    ...currentDay,
                    enabled: !isCurrentlyEnabled,
                    start: currentDay.start || '09:00',
                    end: currentDay.end || '17:00'
                }
            };
        });
    }

    async function handleAddBlackoutDate() {
        if (!selectedBlackoutDate) {
            alert('Please select a date');
            return;
        }

        if (blackoutDates.find(b => b.date === selectedBlackoutDate)) {
            alert('This date is already blocked out');
            return;
        }

        try {
            const newBlackout = { date: selectedBlackoutDate, type: 'unavailable' };
            const updatedBlackouts = [...blackoutDates, newBlackout];
            setBlackoutDates(updatedBlackouts);

            const detailerDoc = await getDoc(doc(db, 'detailer', currentUser.uid));

            if (detailerDoc.exists()) {
                const detailerData = detailerDoc.data();
                const dateOverrides = detailerData.dateOverrides || {};

                dateOverrides[selectedBlackoutDate] = { type: 'unavailable' };

                await updateDoc(doc(db, 'detailer', currentUser.uid), {
                    dateOverrides: dateOverrides,
                    updatedAt: serverTimestamp()
                });

                setSelectedBlackoutDate('');
                setShowBlackoutModal(false);
                alert('Blackout date added successfully!');
            }
        } catch (error) {
            console.error('Error adding blackout date:', error);
            alert('Failed to add blackout date');
            loadProviderData();
        }
    }

    async function handleRemoveBlackoutDate(dateToRemove) {
        if (!confirm('Are you sure you want to remove this blackout date?')) return;

        try {
            const updatedBlackouts = blackoutDates.filter(b => b.date !== dateToRemove);
            setBlackoutDates(updatedBlackouts);

            const detailerDoc = await getDoc(doc(db, 'detailer', currentUser.uid));

            if (detailerDoc.exists()) {
                const detailerData = detailerDoc.data();
                const dateOverrides = detailerData.dateOverrides || {};

                delete dateOverrides[dateToRemove];

                await updateDoc(doc(db, 'detailer', currentUser.uid), {
                    dateOverrides: dateOverrides,
                    updatedAt: serverTimestamp()
                });

                alert('Blackout date removed successfully!');
            }
        } catch (error) {
            console.error('Error removing blackout date:', error);
            alert('Failed to remove blackout date');
            loadProviderData();
        }
    }

    async function handleApproveProvider(providerId) {
        if (!confirm('Approve this provider? They will be able to accept bookings.')) return;

        try {
            const detailerDoc = await getDoc(doc(db, 'detailer', providerId));

            if (!detailerDoc.exists()) {
                alert('Error: Provider document not found!');
                return;
            }

            const detailerData = detailerDoc.data();

            const updateData = {
                status: 'approved',
                approvedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            if (!detailerData.offeredPackages || detailerData.offeredPackages.length === 0) {
                updateData.offeredPackages = PACKAGES_DATA.map(pkg => pkg.id);
            }

            await updateDoc(doc(db, 'detailer', providerId), updateData);

            const verifyDoc = await getDoc(doc(db, 'detailer', providerId));
            const verifyData = verifyDoc.data();

            if (verifyData.status !== 'approved') {
                throw new Error('Update verification failed: status is still not approved');
            }

            alert('Provider approved successfully!');
            await loadPendingProviders();
        } catch (error) {
            console.error('Error approving provider:', error);
            alert(`Failed to approve provider: ${error.message || 'Unknown error'}`);
        }
    }

    async function handleRejectProvider(providerId) {
        const reason = prompt('Reason for rejection (optional):');
        if (reason === null) return;

        try {
            await updateDoc(doc(db, 'detailer', providerId), {
                status: 'rejected',
                rejectionReason: reason || '',
                rejectedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            alert('Provider rejected.');
            loadPendingProviders();
            loadRejectedProviders();
        } catch (error) {
            console.error('Error rejecting provider:', error);
            alert('Failed to reject provider');
        }
    }

    async function handleDeleteProvider(providerId) {
        if (!confirm('Are you sure you want to permanently delete this provider account? This action cannot be undone.')) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'detailer', providerId));
            alert('Provider account deleted successfully.');
            loadPendingProviders();
            loadRejectedProviders();
        } catch (error) {
            console.error('Error deleting provider:', error);
            alert(`Failed to delete provider: ${error.message || 'Unknown error'}`);
        }
    }

    async function listAllProviders() {
        try {
            const providersQuery = query(
                collection(db, 'detailer')
            );
            const providersSnapshot = await getDocs(providersQuery);

            const providersList = providersSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    userId: data.uid,
                    email: data.email,
                    businessName: data.businessName || data.name || 'N/A',
                    status: data.status,
                    hasPackages: (data.offeredPackages || []).length > 0,
                    packageCount: (data.offeredPackages || []).length,
                    createdAt: data.createdAt?.toDate?.() || 'N/A'
                };
            });

            console.table(providersList);

            const details = providersList.map((p, idx) =>
                `${idx + 1}. ${p.businessName}\n   Email: ${p.email || 'N/A'}\n   Status: ${p.status}\n   Packages: ${p.packageCount}\n   UserId: ${p.userId}\n   DocId: ${p.id}`
            ).join('\n\n');

            alert(`Found ${providersList.length} provider(s):\n\n${details}\n\nCheck console for table view.`);
        } catch (error) {
            console.error('Error listing providers:', error);
            alert(`Error: ${error.message}`);
        }
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                alert('Image size must be less than 5MB');
                return;
            }

            setLogoFile(file);

            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    }

    async function handleLogoUpload() {
        if (!logoFile) return;

        try {
            setUploadingLogo(true);

            const storageRef = ref(storage, `provider-logos/${currentUser.uid}/${Date.now()}_${logoFile.name}`);

            await uploadBytes(storageRef, logoFile);

            const downloadURL = await getDownloadURL(storageRef);

            await updateDoc(doc(db, 'detailer', currentUser.uid), {
                image: downloadURL,
                updatedAt: serverTimestamp()
            });

            alert('Logo uploaded successfully!');
            setLogoFile(null);
            setLogoPreview(null);
            await loadProviderData();
        } catch (error) {
            console.error('Error uploading logo:', error);
            alert(`Failed to upload logo: ${error.message}`);
        } finally {
            setUploadingLogo(false);
        }
    }

    if (loading || !userData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const upcomingBookings = bookings.filter(b => ['pending', 'confirmed', 'scheduled'].includes(b.status));
    const completedBookings = bookings.filter(b => ['completed', 'cancelled'].includes(b.status));

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Glassmorphic Header */}
            <div className="sticky top-0 z-40 backdrop-blur-xl bg-gradient-to-r from-blue-600/90 via-blue-700/90 to-indigo-600/90 border-b border-blue-400/20 shadow-lg">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white drop-shadow-md">
                                Provider Dashboard
                            </h1>
                            {userData && (
                                <p className="text-blue-100 mt-1 drop-shadow-sm">
                                    {userData.businessName || userData.name || 'Your Business'}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onBackToMarketplace}
                                className="px-4 py-2 text-white hover:text-blue-100 font-medium transition-colors drop-shadow-sm"
                            >
                                Marketplace
                            </button>
                            <button
                                onClick={onLogout}
                                className="px-4 py-2 bg-red-500/90 backdrop-blur-sm text-white rounded-lg hover:bg-red-600/90 font-medium shadow-md transition-all"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex gap-8">
                        <button
                            onClick={() => setActiveTab('bookings')}
                            className={`py-4 border-b-2 font-semibold transition-colors ${activeTab === 'bookings'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Bookings ({upcomingBookings.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`py-4 border-b-2 font-semibold transition-colors ${activeTab === 'history'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            History ({completedBookings.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('packages')}
                            className={`py-4 border-b-2 font-semibold transition-colors ${activeTab === 'packages'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Packages
                        </button>
                        <button
                            onClick={() => setActiveTab('availability')}
                            className={`py-4 border-b-2 font-semibold transition-colors ${activeTab === 'availability'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Availability
                        </button>
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`py-4 border-b-2 font-semibold transition-colors ${activeTab === 'profile'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Profile
                        </button>
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={`py-4 border-b-2 font-semibold transition-colors relative ${activeTab === 'notifications'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Notifications
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
                        {userData?.role === 'admin' && (
                            <button
                                onClick={() => setActiveTab('admin')}
                                className={`py-4 border-b-2 font-semibold transition-colors ${activeTab === 'admin'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                Admin {pendingProviders.length > 0 && `(${pendingProviders.length})`}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                {activeTab === 'bookings' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Upcoming Bookings</h2>
                            <button
                                onClick={loadBookings}
                                className="px-4 py-2 text-sm border-2 border-gray-200 rounded-lg font-medium hover:bg-gray-50"
                            >
                                Refresh
                            </button>
                        </div>
                        {upcomingBookings.length === 0 ? (
                            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">No upcoming bookings</h3>
                                <p className="text-gray-600">New bookings will appear here</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {upcomingBookings.map((booking) => (
                                    <div key={booking.id} className="bg-white rounded-xl border border-gray-200 p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                                    {booking.customerName}
                                                </h3>

                                                <div className="flex flex-wrap gap-4 mb-4 text-sm">
                                                    {booking.customerEmail && (
                                                        <div className="flex items-center gap-2 text-gray-600">
                                                            <Mail className="w-4 h-4" />
                                                            <a href={`mailto:${booking.customerEmail}`} className="hover:text-blue-600">
                                                                {booking.customerEmail}
                                                            </a>
                                                        </div>
                                                    )}
                                                    {booking.customerPhone && (
                                                        <div className="flex items-center gap-2 text-gray-600">
                                                            <Phone className="w-4 h-4" />
                                                            <a href={`tel:${booking.customerPhone}`} className="hover:text-blue-600">
                                                                {booking.customerPhone}
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mb-4">
                                                    {booking.packageName ? (
                                                        <div className="space-y-2 mb-2">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-lg font-semibold text-gray-900">{booking.packageName}</p>
                                                                {booking.packagePrice && (
                                                                    <span className="text-sm font-medium text-gray-600">
                                                                        ${booking.packagePrice}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {booking.addOns && booking.addOns.length > 0 && (
                                                                <div className="ml-4 space-y-1">
                                                                    {booking.addOns.map((addOn, idx) => (
                                                                        <div key={idx} className="flex items-center justify-between text-sm">
                                                                            <span className="text-gray-600">+ {addOn.name}</span>
                                                                            {addOn.price && (
                                                                                <span className="text-gray-600">${addOn.price}</span>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : booking.services && booking.services.length > 0 ? (
                                                        <div className="space-y-2 mb-2">
                                                            {booking.services.map((service, idx) => (
                                                                <div key={idx} className="flex items-center justify-between">
                                                                    <p className="text-lg font-semibold text-gray-900">{service.name}</p>
                                                                    {service.price && (
                                                                        <span className="text-sm font-medium text-gray-600">${service.price}</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-lg font-semibold text-gray-900 mb-2">{booking.service || booking.serviceName || 'Service'}</p>
                                                    )}
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Car className="w-4 h-4" />
                                                        <span className="font-medium">Vehicle:</span>
                                                        <span>{booking.vehicleType || 'Not specified'}</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 text-sm">
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <Calendar className="w-4 h-4" />
                                                        <span className="font-medium">{booking.date}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <Clock className="w-4 h-4" />
                                                        <span className="font-medium">{booking.time}</span>
                                                    </div>
                                                    <div className="flex items-start gap-2 text-gray-600">
                                                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                        <span className="font-medium">{booking.address}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right ml-6">
                                                <p className="text-2xl font-bold text-gray-900 mb-2">
                                                    ${booking.price.toFixed(2)}
                                                </p>
                                                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${booking.status === 'confirmed'
                                                    ? 'bg-green-100 text-green-800'
                                                    : booking.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                </span>
                                            </div>
                                        </div>

                                        {booking.status === 'pending' && (
                                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                                <button
                                                    onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Are you sure you want to reject this booking?')) {
                                                            handleUpdateBookingStatus(booking.id, 'cancelled');
                                                        }
                                                    }}
                                                    className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        )}

                                        {booking.status === 'confirmed' && (
                                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                                <button
                                                    onClick={() => handleUpdateBookingStatus(booking.id, 'completed')}
                                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                                                >
                                                    Mark Complete
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Are you sure you want to cancel this booking?')) {
                                                            handleUpdateBookingStatus(booking.id, 'cancelled');
                                                        }
                                                    }}
                                                    className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Booking History</h2>
                        {completedBookings.length === 0 ? (
                            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                                <p className="text-gray-600">No completed bookings yet</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {completedBookings.map((booking) => (
                                    <div key={booking.id} className="bg-white rounded-xl border border-gray-200 p-6">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                                    {booking.customerName}
                                                </h3>

                                                {(booking.customerEmail || booking.customerPhone) && (
                                                    <div className="flex flex-wrap gap-4 mb-3 text-sm">
                                                        {booking.customerEmail && (
                                                            <div className="flex items-center gap-2 text-gray-600">
                                                                <Mail className="w-4 h-4" />
                                                                <span>{booking.customerEmail}</span>
                                                            </div>
                                                        )}
                                                        {booking.customerPhone && (
                                                            <div className="flex items-center gap-2 text-gray-600">
                                                                <Phone className="w-4 h-4" />
                                                                <span>{booking.customerPhone}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {booking.packageName ? (
                                                    <div className="mb-2">
                                                        <p className="text-gray-600 mb-1 font-semibold">{booking.packageName}</p>
                                                        {booking.packagePrice && (
                                                            <p className="text-gray-500 text-sm mb-1">
                                                                ${booking.packagePrice}
                                                            </p>
                                                        )}
                                                        {booking.addOns && booking.addOns.length > 0 && (
                                                            <div className="ml-2 mt-1">
                                                                {booking.addOns.map((addOn, idx) => (
                                                                    <p key={idx} className="text-gray-500 text-sm">
                                                                        + {addOn.name} {addOn.price ? `($${addOn.price})` : ''}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : booking.services && booking.services.length > 0 ? (
                                                    <div className="mb-2">
                                                        {booking.services.map((service, idx) => (
                                                            <p key={idx} className="text-gray-600 mb-1">
                                                                {service.name} {service.price ? `- $${service.price}` : ''}
                                                            </p>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-600 mb-1">{booking.service || booking.serviceName || 'Service'}</p>
                                                )}
                                                <p className="text-sm text-gray-500 mb-2">
                                                    <span className="font-medium">Vehicle:</span> {booking.vehicleType || 'Not specified'}
                                                </p>
                                                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-2">
                                                    <span>{booking.date} at {booking.time}</span>
                                                    {booking.address && booking.address !== 'N/A' && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {booking.address}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right ml-6">
                                                <p className="text-xl font-bold text-gray-900">
                                                    ${booking.price.toFixed(2)}
                                                </p>
                                                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm ${booking.status === 'completed'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'packages' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Manage Packages</h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Select which packages you want to offer to customers
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    if (savingPackages) {
                                        return;
                                    }

                                    try {
                                        setSavingPackages(true);

                                        if (!currentUser || !currentUser.uid) {
                                            alert('Error: You must be logged in to save changes.');
                                            setSavingPackages(false);
                                            return;
                                        }

                                        const detailerDocRef = doc(db, 'detailer', currentUser.uid);
                                        const detailerDocSnap = await getDoc(detailerDocRef);

                                        if (!detailerDocSnap.exists()) {
                                            alert('Error: Your detailer account was not found. Please contact support.');
                                            return;
                                        }

                                        const safePackagePrices = packagePrices || {};

                                        await updateDoc(detailerDocRef, {
                                            offeredPackages: selectedPackages,
                                            addOns: selectedAddOns,
                                            packagePrices: safePackagePrices,
                                            updatedAt: serverTimestamp()
                                        });

                                        alert('Packages saved successfully!');
                                        await loadProviderData();
                                    } catch (error) {
                                        console.error('Error saving packages:', error);
                                        alert(`Failed to save packages: ${error.message || 'Unknown error'}`);
                                    } finally {
                                        setSavingPackages(false);
                                    }
                                }}
                                disabled={savingPackages}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                            >
                                {savingPackages ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </div>

                        <div className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Packages</h3>
                            {availablePackages.length === 0 ? (
                                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No packages available</h3>
                                    <p className="text-gray-600">Packages will appear here once they're added to the system.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {availablePackages.map((pkg) => {
                                        const isSelected = selectedPackages.includes(pkg.id);
                                        return (
                                            <div
                                                key={pkg.id}
                                                className={`bg-white rounded-xl border-2 p-6 transition-all ${isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                                                            {isSelected && (
                                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                    Offered
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                                                        <div className="flex flex-wrap items-center justify-between gap-4 text-sm mb-3 p-3 bg-gray-50 rounded-lg">
                                                            <div className="flex items-center gap-4">
                                                                <div className="flex items-center gap-2">
                                                                    <DollarSign className="w-4 h-4 text-gray-600" />
                                                                    <span className={`font-bold text-lg ${isSelected && packagePrices[pkg.id] ? 'text-blue-600' : 'text-gray-900'}`}>
                                                                        ${packagePrices[pkg.id]?.price ?? pkg.price}
                                                                    </span>
                                                                    {isSelected && packagePrices[pkg.id] && (
                                                                        <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">Custom</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {isSelected && (
                                                                <button
                                                                    onClick={() => {
                                                                        if (!packagePrices[pkg.id]) {
                                                                            setPackagePrices(prev => ({
                                                                                ...prev,
                                                                                [pkg.id]: {
                                                                                    price: pkg.price
                                                                                }
                                                                            }));
                                                                        }
                                                                    }}
                                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2 text-sm"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                    {packagePrices[pkg.id] ? 'Edit Prices' : 'Set Custom Prices'}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {isSelected && packagePrices[pkg.id] && (
                                                            <div className="mb-3 p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <label className="block text-sm font-semibold text-gray-900">
                                                                        <Edit2 className="w-4 h-4 inline mr-1" />
                                                                        Custom Pricing
                                                                    </label>
                                                                    <button
                                                                        onClick={() => {
                                                                            setPackagePrices(prev => {
                                                                                const updated = { ...prev };
                                                                                delete updated[pkg.id];
                                                                                return updated;
                                                                            });
                                                                        }}
                                                                        className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 px-2 py-1 hover:bg-red-50 rounded"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                        Reset to Default
                                                                    </button>
                                                                </div>
                                                                <p className="text-xs text-gray-600 mb-3">Set your price for this package</p>
                                                                <div>
                                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Price ($)</label>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="1"
                                                                        value={packagePrices[pkg.id]?.price ?? pkg.price}
                                                                        onChange={(e) => {
                                                                            const value = parseInt(e.target.value) || pkg.price;
                                                                            setPackagePrices(prev => ({
                                                                                ...prev,
                                                                                [pkg.id]: {
                                                                                    price: value
                                                                                }
                                                                            }));
                                                                        }}
                                                                        className="w-full px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium"
                                                                        placeholder={pkg.price?.toString() || '0'}
                                                                    />
                                                                </div>
                                                                <div className="mt-3 pt-3 border-t border-blue-200">
                                                                    <div className="flex items-center gap-2 text-sm">
                                                                        <DollarSign className="w-4 h-4 text-blue-600" />
                                                                        <span className="font-bold text-blue-700">
                                                                            Your Price: ${packagePrices[pkg.id]?.price ?? pkg.price}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                                                            <div>
                                                                <div className="text-xs font-semibold text-gray-700 mb-1">Exterior Services:</div>
                                                                <ul className="text-xs text-gray-600 space-y-1">
                                                                    {pkg.exteriorServices.map((svc, idx) => (
                                                                        <li key={idx} className="flex items-start">
                                                                            <CheckCircle2 className="w-3 h-3 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                                                                            <span>{svc}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-semibold text-gray-700 mb-1">Interior Services:</div>
                                                                <ul className="text-xs text-gray-600 space-y-1">
                                                                    {pkg.interiorServices.map((svc, idx) => (
                                                                        <li key={idx} className="flex items-start">
                                                                            <CheckCircle2 className="w-3 h-3 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                                                                            <span>{svc}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => {
                                                                    if (isSelected) {
                                                                        setSelectedPackages(prev => prev.filter(id => id !== pkg.id));
                                                                        setPackagePrices(prev => {
                                                                            const updated = { ...prev };
                                                                            delete updated[pkg.id];
                                                                            return updated;
                                                                        });
                                                                    } else {
                                                                        setSelectedPackages(prev => [...prev, pkg.id]);
                                                                    }
                                                                }}
                                                                className="sr-only peer"
                                                            />
                                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Add-ons</h3>
                            <p className="text-sm text-gray-500 mb-4">Select which add-ons you want to offer with your packages</p>
                            <div className="space-y-3">
                                {ADD_ONS.map((addOn) => {
                                    const isSelected = selectedAddOns.includes(addOn.id);
                                    return (
                                        <div
                                            key={addOn.id}
                                            className={`bg-white rounded-xl border-2 p-4 transition-all ${isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h4 className="font-semibold text-gray-900">{addOn.name}</h4>
                                                        <span className="text-sm font-medium text-gray-600">+${addOn.price}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600">{addOn.description}</p>
                                                </div>
                                                <div className="ml-4">
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => {
                                                                if (isSelected) {
                                                                    setSelectedAddOns(prev => prev.filter(id => id !== addOn.id));
                                                                } else {
                                                                    setSelectedAddOns(prev => [...prev, addOn.id]);
                                                                }
                                                            }}
                                                            className="sr-only peer"
                                                        />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'availability' && (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Manage Availability</h2>

                        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Weekly Schedule</h3>
                                <button
                                    onClick={handleSaveWeeklySchedule}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                                >
                                    Save Schedule
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">
                                Set your default working hours for each day of the week. This schedule will remain constant until you change it.
                            </p>

                            <div className="space-y-3">
                                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                                    const daySchedule = weeklySchedule[day] || { enabled: false, start: '09:00', end: '17:00' };
                                    const dayName = day.charAt(0).toUpperCase() + day.slice(1);

                                    return (
                                        <div key={day} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                                            <div className="flex items-center gap-3 w-32">
                                                <input
                                                    type="checkbox"
                                                    checked={daySchedule.enabled || false}
                                                    onChange={() => handleToggleDay(day)}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                                <label className="font-medium text-gray-900">{dayName}</label>
                                            </div>

                                            {daySchedule.enabled ? (
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-sm text-gray-600">Start:</label>
                                                        <input
                                                            type="time"
                                                            value={daySchedule.start || '09:00'}
                                                            onChange={(e) => handleDayScheduleChange(day, 'start', e.target.value)}
                                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                    </div>
                                                    <span className="text-gray-400">to</span>
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-sm text-gray-600">End:</label>
                                                        <input
                                                            type="time"
                                                            value={daySchedule.end || '17:00'}
                                                            onChange={(e) => handleDayScheduleChange(day, 'end', e.target.value)}
                                                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">Not available</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Blackout Dates</h3>
                                <button
                                    onClick={() => setShowBlackoutModal(true)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Blackout Date
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 mb-4">
                                Block out dates when you're unavailable (holidays, emergencies, etc.). No bookings will be available on these dates.
                            </p>

                            {blackoutDates.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                    <p>No blackout dates set</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {blackoutDates.map((blackout) => {
                                        const date = new Date(blackout.date + 'T00:00:00');
                                        const formattedDate = date.toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        });

                                        return (
                                            <div key={blackout.date} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <Calendar className="w-5 h-5 text-red-600" />
                                                    <span className="font-medium text-gray-900">{formattedDate}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveBlackoutDate(blackout.date)}
                                                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-100 rounded-lg font-medium"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {showBlackoutModal && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-xl max-w-md w-full">
                                    <div className="p-6 border-b border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xl font-bold text-gray-900">Add Blackout Date</h3>
                                            <button
                                                onClick={() => {
                                                    setShowBlackoutModal(false);
                                                    setSelectedBlackoutDate('');
                                                }}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <X className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Select Date
                                            </label>
                                            <input
                                                type="date"
                                                value={selectedBlackoutDate}
                                                onChange={(e) => setSelectedBlackoutDate(e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            This date will be blocked out and no bookings will be available.
                                        </p>
                                    </div>

                                    <div className="p-6 border-t border-gray-200 flex gap-3">
                                        <button
                                            onClick={handleAddBlackoutDate}
                                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
                                        >
                                            Add Blackout Date
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowBlackoutModal(false);
                                                setSelectedBlackoutDate('');
                                            }}
                                            className="px-6 py-2 border-2 border-gray-200 rounded-lg font-semibold hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'admin' && userData?.role === 'admin' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        if (confirm('This will import all packages to Firestore. Continue?')) {
                                            try {
                                                await importPackagesToFirestore();
                                            } catch (error) {
                                                console.error('Import error:', error);
                                            }
                                        }
                                    }}
                                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                                >
                                    Import Packages
                                </button>
                                <button
                                    onClick={listAllProviders}
                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                                >
                                    List All Providers
                                </button>
                                <button
                                    onClick={loadPendingProviders}
                                    className="px-4 py-2 text-sm border-2 border-gray-200 rounded-lg font-medium hover:bg-gray-50"
                                >
                                    Refresh
                                </button>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Provider Approvals</h3>

                            {loadingPending ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-600">Loading pending applications...</p>
                                </div>
                            ) : pendingProviders.length === 0 ? (
                                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                                    <CheckCircle2 className="w-16 h-16 text-green-300 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No pending applications</h3>
                                    <p className="text-gray-600">All provider applications have been reviewed.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingProviders.map((provider) => (
                                        <div key={provider.id} className="bg-white rounded-xl border-2 border-yellow-200 p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                                        {provider.businessName}
                                                    </h3>
                                                    <div className="space-y-2 text-sm text-gray-600">
                                                        <div className="flex items-center gap-2">
                                                            <Mail className="w-4 h-4" />
                                                            <span>{provider.email}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Phone className="w-4 h-4" />
                                                            <span>{provider.phone}</span>
                                                        </div>
                                                        {provider.ownerName && (
                                                            <div className="flex items-center gap-2">
                                                                <User className="w-4 h-4" />
                                                                <span>Owner: {provider.ownerName}</span>
                                                            </div>
                                                        )}
                                                        {provider.address && (
                                                            <div className="flex items-center gap-2">
                                                                <MapPin className="w-4 h-4" />
                                                                <span>{provider.address}</span>
                                                            </div>
                                                        )}
                                                        {provider.serviceArea && (
                                                            <div className="flex items-center gap-2">
                                                                <MapPin className="w-4 h-4" />
                                                                <span>Service Area: {provider.serviceArea}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                                                    Pending
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500">Business License</label>
                                                    <p className="text-sm font-semibold text-gray-900">{provider.businessLicenseNumber || 'N/A'}</p>
                                                </div>
                                                {provider.ein && (
                                                    <div>
                                                        <label className="text-xs font-medium text-gray-500">EIN</label>
                                                        <p className="text-sm font-semibold text-gray-900">{provider.ein}</p>
                                                    </div>
                                                )}
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500">Insurance Provider</label>
                                                    <p className="text-sm font-semibold text-gray-900">{provider.insuranceProvider || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500">Insurance Number</label>
                                                    <p className="text-sm font-semibold text-gray-900">{provider.insuranceNumber || 'N/A'}</p>
                                                </div>
                                            </div>

                                            {provider.about && (
                                                <div className="mb-4">
                                                    <label className="text-xs font-medium text-gray-500">About</label>
                                                    <p className="text-sm text-gray-700 mt-1">{provider.about}</p>
                                                </div>
                                            )}

                                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                                <button
                                                    onClick={() => handleApproveProvider(provider.id)}
                                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleRejectProvider(provider.id)}
                                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Rejected Providers</h3>
                                <button
                                    onClick={loadRejectedProviders}
                                    className="px-4 py-2 text-sm border-2 border-gray-200 rounded-lg font-semibold hover:bg-gray-50"
                                >
                                    Refresh
                                </button>
                            </div>
                            {rejectedProviders.length === 0 ? (
                                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                                    <p className="text-gray-600">No rejected providers.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {rejectedProviders.map((provider) => (
                                        <div key={provider.id} className="bg-white rounded-xl border-2 border-red-200 p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <h4 className="text-lg font-bold text-gray-900 mb-2">
                                                        {provider.businessName || provider.name || 'N/A'}
                                                    </h4>
                                                    <div className="space-y-1 text-sm text-gray-600">
                                                        <div className="flex items-center gap-2">
                                                            <Mail className="w-4 h-4" />
                                                            <span>{provider.email}</span>
                                                        </div>
                                                        {provider.phone && (
                                                            <div className="flex items-center gap-2">
                                                                <Phone className="w-4 h-4" />
                                                                <span>{provider.phone}</span>
                                                            </div>
                                                        )}
                                                        {provider.rejectionReason && (
                                                            <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-800">
                                                                <strong>Reason:</strong> {provider.rejectionReason}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                                                    Rejected
                                                </span>
                                            </div>
                                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                                <button
                                                    onClick={() => handleDeleteProvider(provider.id)}
                                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
                                                >
                                                    Delete Account
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <NotificationCenter
                        notifications={notifications}
                        unreadCount={unreadCount}
                        onMarkAsRead={markNotificationAsRead}
                        onMarkAllAsRead={() => markAllAsRead(currentUser.uid)}
                    />
                )}

                {activeTab === 'profile' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Provider Profile</h2>
                            {!isEditingProfile && userData && (
                                <button
                                    onClick={() => setIsEditingProfile(true)}
                                    className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 rounded-lg font-semibold hover:bg-gray-50"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Edit Profile
                                </button>
                            )}
                        </div>
                        {userData ? (
                            <div className="bg-white rounded-xl border border-gray-200 p-8">
                                {!isEditingProfile ? (
                                    <>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 mb-2">
                                                    Business Logo
                                                </label>
                                                <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 flex items-center justify-center">
                                                    {userData.image ? (
                                                        <img src={userData.image} alt="Business logo" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-gray-400 text-3xl font-bold">
                                                            {userData.businessName?.charAt(0) || userData.name?.charAt(0) || '?'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 mb-1">
                                                    Business Name
                                                </label>
                                                <div className="text-lg font-semibold text-gray-900">
                                                    {userData.businessName || 'Not set'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 mb-1">
                                                    Service Area
                                                </label>
                                                <div className="text-lg font-semibold text-gray-900">
                                                    {userData.serviceArea || userData.businessAddress || 'Not set'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 mb-1">
                                                    Business Address
                                                </label>
                                                <div className="text-lg font-semibold text-gray-900">
                                                    {userData.businessAddress || userData.address || 'Not set'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 mb-1">
                                                    Primary Service
                                                </label>
                                                <div className="text-lg font-semibold text-gray-900">
                                                    {userData.primaryService || 'Not set'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 mb-1">
                                                    Phone
                                                </label>
                                                <div className="text-lg font-semibold text-gray-900">
                                                    {userData.phone || 'Not set'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-500 mb-1">
                                                    Email
                                                </label>
                                                <div className="text-lg font-semibold text-gray-900">
                                                    {userData.email || 'Not set'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-6 pt-6 border-t border-gray-200">
                                            <button
                                                onClick={async () => {
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
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                                            >
                                                <Shield className="w-4 h-4" />
                                                Reset Password
                                            </button>
                                            <p className="text-xs text-gray-500 mt-2">
                                                We'll send a password reset link to your email address.
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Business Logo
                                            </label>

                                            <div className="flex items-center gap-4">
                                                <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
                                                    {logoPreview ? (
                                                        <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                                                    ) : userData?.image ? (
                                                        <img src={userData.image} alt="Current logo" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-gray-400 text-3xl font-bold">
                                                            {userData?.businessName?.charAt(0) || userData?.name?.charAt(0) || '?'}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex-1">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleFileSelect}
                                                        className="hidden"
                                                        id="logo-upload"
                                                        disabled={uploadingLogo}
                                                    />
                                                    <label
                                                        htmlFor="logo-upload"
                                                        className={`inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 cursor-pointer transition-colors ${uploadingLogo ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        {uploadingLogo ? 'Uploading...' : 'Choose Logo'}
                                                    </label>

                                                    {logoFile && (
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <button
                                                                onClick={handleLogoUpload}
                                                                disabled={uploadingLogo}
                                                                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setLogoFile(null);
                                                                    setLogoPreview(null);
                                                                }}
                                                                disabled={uploadingLogo}
                                                                className="px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    )}

                                                    <p className="text-xs text-gray-500 mt-2">
                                                        Recommended: Square image, max 5MB. Will appear on your detailer card.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Business Name
                                            </label>
                                            <input
                                                type="text"
                                                value={editedProviderProfile.businessName}
                                                onChange={(e) => setEditedProviderProfile({ ...editedProviderProfile, businessName: e.target.value })}
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                                                placeholder="Business Name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Service Area
                                            </label>
                                            <input
                                                type="text"
                                                value={editedProviderProfile.serviceArea}
                                                onChange={(e) => setEditedProviderProfile({ ...editedProviderProfile, serviceArea: e.target.value })}
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                                                placeholder="City, State or ZIP codes"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Business Address
                                            </label>
                                            <input
                                                type="text"
                                                value={editedProviderProfile.businessAddress}
                                                onChange={(e) => setEditedProviderProfile({ ...editedProviderProfile, businessAddress: e.target.value })}
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                                                placeholder="123 Main St, City, State ZIP"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Phone
                                            </label>
                                            <input
                                                type="tel"
                                                value={editedProviderProfile.phone}
                                                onChange={(e) => setEditedProviderProfile({ ...editedProviderProfile, phone: e.target.value })}
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                                                placeholder="(555) 123-4567"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                value={editedProviderProfile.email}
                                                onChange={(e) => setEditedProviderProfile({ ...editedProviderProfile, email: e.target.value })}
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                                                placeholder="business@example.com"
                                            />
                                        </div>
                                        <div className="flex gap-3 pt-4">
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await updateDoc(doc(db, 'detailer', currentUser.uid), {
                                                            businessName: editedProviderProfile.businessName,
                                                            serviceArea: editedProviderProfile.serviceArea,
                                                            businessAddress: editedProviderProfile.businessAddress,
                                                            phone: editedProviderProfile.phone,
                                                            email: editedProviderProfile.email,
                                                            updatedAt: serverTimestamp()
                                                        });
                                                        alert('Profile updated successfully!');
                                                        setIsEditingProfile(false);
                                                        loadProviderData();
                                                    } catch (error) {
                                                        console.error('Error updating provider profile:', error);
                                                        alert('Failed to update profile');
                                                    }
                                                }}
                                                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                                            >
                                                Save Changes
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsEditingProfile(false);
                                                    setEditedProviderProfile({
                                                        businessName: userData?.businessName || '',
                                                        serviceArea: userData?.serviceArea || '',
                                                        businessAddress: userData?.businessAddress || userData?.address || '',
                                                        phone: userData?.phone || '',
                                                        email: userData?.email || ''
                                                    });
                                                    setLogoFile(null);
                                                    setLogoPreview(null);
                                                }}
                                                className="px-6 py-3 border-2 border-gray-200 rounded-lg font-semibold hover:bg-gray-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                                <p className="text-gray-600">Provider profile not found</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}