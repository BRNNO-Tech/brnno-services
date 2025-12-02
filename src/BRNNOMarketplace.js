import React, { useState, useEffect, useMemo, useCallback } from 'react';
import config from './config';
import {
    MapPin, Car, Calendar, Star, CheckCircle2, X, ChevronRight,
    Clock, DollarSign, Shield, User, CreditCard, Home, Package,
    Edit2, Trash2, Plus, LogOut, Menu, Search, Mail, Phone, MessageSquare,
    Bell, CheckCircle
} from 'lucide-react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail
} from 'firebase/auth';
import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    query,
    where,
    updateDoc,
    deleteDoc,
    doc,
    setDoc,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './firebase/config';
import { GoogleAuthProvider } from 'firebase/auth';
import PaymentForm from './components/PaymentForm';
import { PACKAGES_DATA, ADD_ONS, importPackagesToFirestore, initializePackagesIfEmpty } from './data/packages';
import {
    requestNotificationPermission,
    saveFCMToken,
    subscribeToNotifications,
    subscribeToUnreadCount,
    markNotificationAsRead,
    markAllAsRead,
    setupForegroundMessageHandler,
    notifyNewBooking,
    notifyBookingConfirmed,
    notifyBookingCancelled,
    notifyPaymentReceived
} from './services/notificationService';
// Import extracted modals
import {
    AddressModal,
    ZipCodeModal,
    LoginModal,
    GuestCheckoutModal,
    ProviderOnboardingModal,
    SignupModal
} from './components/modals';
// Import extracted utilities
import {
    geocodeAddress,
    loadGoogleMapsApi,
    calculateRealDistance,
    generateAvailableTimesForDate,
    generateTimeSlots,
    getProviderHours,
    formatTime,
    isDateAvailable
} from './utils';
// Import extracted pages
import { LandingPage, MarketplacePage } from './components/pages';
// Import extracted marketplace components
import { DetailerCard } from './components/marketplace';
// Import extracted common components
import { ProfileDropdown } from './components/common';
// Import extracted booking components
import { BookingSidebar } from './components/booking';
// Import extracted dashboard components
import CustomerDashboard from './components/dashboard/CustomerDashboard';
import ProviderDashboard from './components/dashboard/ProviderDashboard';

// Use centralized Firebase config
const googleProvider = new GoogleAuthProvider();

// ==================== MAIN APP COMPONENT ====================
export default function BrnnoMarketplace() {
    // Auth state
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userAccountType, setUserAccountType] = useState(null);
    const [isProvider, setIsProvider] = useState(false);
    const isCreatingAccountRef = React.useRef(false); // Flag to prevent auth listener from signing out during account creation

    // User location
    const [userCoordinates, setUserCoordinates] = useState(null);

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [distanceFilter, setDistanceFilter] = useState(50); // miles
    const [sortBy, setSortBy] = useState('distance'); // distance, price, rating, reviews

    // Page state
    const [currentPage, setCurrentPage] = useState('landing'); // landing, marketplace, detailerProfile, dashboard

    // Modal/flow state
    const [modalType, setModalType] = useState(null); // 'address', 'signup', 'login', 'providerOnboarding', 'guestCheckout'
    const [guestBookingInfo, setGuestBookingInfo] = useState(null); // { email, name } for guest bookings

    // Login form state
    const [loginData, setLoginData] = useState({
        email: '',
        password: ''
    });

    // Form data
    const [address, setAddress] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [answers, setAnswers] = useState({
        vehicleType: '',
        serviceType: '',
        timeSlot: ''
    });
    const [signupData, setSignupData] = useState({
        name: '',
        email: '',
        password: '',
        accountType: 'customer'
    });

    // Provider onboarding form state
    const [providerOnboardingData, setProviderOnboardingData] = useState({
        businessName: '',
        businessAddress: '',
        serviceArea: '',
        phone: '',
        email: ''
    });

    // Reference for address input and autocomplete
    const addressInputRef = React.useRef(null);
    const autocompleteRef = React.useRef(null);

    // Track when Google Maps JS API is loaded
    const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

    // Marketplace data
    const [selectedDetailer, setSelectedDetailer] = useState(null);
    const [detailers, setDetailers] = useState([]);

    // Filter and sort detailers based on search query, distance filter, and sort option
    const filteredDetailers = React.useMemo(() => {
        let filtered = [...detailers];

        // Search filter (by service area/city/zip code)
        if (searchQuery.trim()) {
            const queryLower = searchQuery.toLowerCase().trim();

            // Check if it's a zip code (5 digits)
            const isZipCode = /^\d{5}$/.test(queryLower);

            if (isZipCode) {
                // If it's a zip code, don't filter by text - let distance filtering handle it
                // The zip code should have been geocoded and set as userCoordinates
                // So we'll just rely on distance filtering
            } else {
                // Regular text search (city, service area, name)
                filtered = filtered.filter(d =>
                    d.serviceArea?.toLowerCase().includes(queryLower) ||
                    d.name?.toLowerCase().includes(queryLower) ||
                    d.about?.toLowerCase().includes(queryLower)
                );
            }
        }

        // Distance filter
        if (distanceFilter < 999) {
            filtered = filtered.filter(d => d.distance <= distanceFilter);
        }

        // Sort
        switch (sortBy) {
            case 'distance':
                filtered.sort((a, b) => a.distance - b.distance);
                break;
            case 'price':
                filtered.sort((a, b) => a.price - b.price);
                break;
            case 'rating':
                filtered.sort((a, b) => b.rating - a.rating);
                break;
            case 'reviews':
                filtered.sort((a, b) => b.reviews - a.reviews);
                break;
            default:
                // Default to distance
                filtered.sort((a, b) => a.distance - b.distance);
        }

        return filtered;
    }, [detailers, searchQuery, distanceFilter, sortBy]);

    // Load Google Maps script once and set loaded flag
    useEffect(() => {
        let isActive = true;
        (async () => {
            try {
                await loadGoogleMapsApi();
                if (isActive) {
                    setGoogleMapsLoaded(true);
                }
            } catch (e) {
                console.error('Failed to load Google Maps:', e);
            }
        })();
        return () => { isActive = false; };
    }, []);

    // Initialize Google Places Autocomplete on the address input (for both address and provider onboarding modals)
    useEffect(() => {
        if ((modalType !== 'address' && modalType !== 'providerOnboarding') || !googleMapsLoaded) return;

        let listener = null;
        try {
            if (!addressInputRef.current || !window.google?.maps?.places) return;

            const ac = new window.google.maps.places.Autocomplete(addressInputRef.current, {
                componentRestrictions: { country: 'us' },
                fields: ['formatted_address', 'geometry', 'address_components']
            });
            autocompleteRef.current = ac;

            listener = ac.addListener('place_changed', () => {
                const place = ac.getPlace();
                if (place?.formatted_address) {
                    const formattedAddr = place.formatted_address;
                    // Get full coordinate details from Places API (includes city, state, zip)
                    const byType = (type) => place.address_components?.find(c => c.types.includes(type));
                    const coords = place.geometry ? {
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                        formattedAddress: formattedAddr,
                        city: byType('locality')?.long_name || '',
                        state: byType('administrative_area_level_1')?.short_name || '',
                        zip: byType('postal_code')?.long_name || ''
                    } : null;

                    // Update based on which modal is open
                    if (modalType === 'providerOnboarding') {
                        setProviderOnboardingData(prev => ({
                            ...prev,
                            businessAddress: formattedAddr
                        }));
                        if (coords) {
                            setUserCoordinates(coords);
                        }
                    } else {
                        // Address modal
                        setAddress(formattedAddr);
                        if (coords) {
                            setUserCoordinates(coords);
                        }
                    }
                }
            });
        } catch (e) {
            console.error('Autocomplete init failed:', e);
        }

        return () => {
            if (listener && listener.remove) listener.remove();
            autocompleteRef.current = null;
        };
    }, [modalType, googleMapsLoaded]); // Don't include providerOnboardingData to avoid recreating autocomplete

    // Profile dropdown
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);

    // Questions removed - users go directly from address to signup

    // ==================== CLEAR ORPHANED SESSIONS ON LOAD ====================
    // Check and clear any orphaned Firebase Auth sessions on page load
    useEffect(() => {
        const checkAndClearOrphanedSession = async () => {
            try {
                const currentAuthUser = auth.currentUser;
                if (currentAuthUser) {
                    // Check both customer and detailer collections
                    const customerDoc = await getDoc(doc(db, 'customer', currentAuthUser.uid));
                    const detailerDoc = await getDoc(doc(db, 'detailer', currentAuthUser.uid));

                    if (!customerDoc.exists() && !detailerDoc.exists()) {
                        // Clear Firebase Auth storage
                        try {
                            if (window.indexedDB) {
                                indexedDB.deleteDatabase('firebaseLocalStorageDb');
                            }
                            Object.keys(localStorage).forEach(key => {
                                if (key.startsWith('firebase:authUser:')) {
                                    localStorage.removeItem(key);
                                }
                            });
                        } catch (e) {
                            console.warn('Could not clear storage:', e);
                        }
                        // Sign out
                        await signOut(auth);
                    }
                }
            } catch (error) {
                console.error('Error checking orphaned session:', error);
            }
        };

        // Run check after a short delay to ensure Firebase is initialized
        const timeout = setTimeout(checkAndClearOrphanedSession, 500);
        return () => clearTimeout(timeout);
    }, []);

    // ==================== AUTH LISTENER ====================
    useEffect(() => {
        let isSigningOut = false; // Flag to prevent infinite loop

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            // Prevent infinite loop if we're already signing out
            if (isSigningOut) {
                return;
            }
            if (user) {
                try {
                    // 1. Check if they exist as a CUSTOMER
                    const customerRef = doc(db, 'customer', user.uid);
                    const customerDoc = await getDoc(customerRef);

                    // 2. Check if they exist as a DETAILER
                    const detailerRef = doc(db, 'detailer', user.uid);
                    const detailerDoc = await getDoc(detailerRef);

                    // 3. Check if they are a NEW USER
                    if (!customerDoc.exists() && !detailerDoc.exists()) {
                        // This is a BRAND NEW user. They don't exist in either collection.

                        // 4. Get the role we saved from the button click
                        const role = localStorage.getItem('pendingUserRole') || 'customer'; // Default to 'customer'

                        // 5. IMPORTANT: Clear the note
                        localStorage.removeItem('pendingUserRole');

                        // 6. Set flag to prevent auth listener from signing out during creation
                        isCreatingAccountRef.current = true;

                        // 7. Create their document in the correct collection
                        const userData = {
                            uid: user.uid,
                            email: user.email,
                            displayName: user.displayName,
                            photoURL: user.photoURL,
                            createdAt: serverTimestamp(),
                        };

                        if (role === 'detailer') {
                            // Create a new DETAILER document
                            await setDoc(detailerRef, {
                                ...userData,
                                businessName: user.displayName || 'New Business',
                                businessAddress: '',
                                serviceArea: '',
                                phone: '',
                                services: [],
                                offeredPackages: [],
                                addOns: [],
                                packagePrices: {},
                                defaultAvailability: {
                                    monday: { enabled: false, start: '09:00', end: '17:00' },
                                    tuesday: { enabled: false, start: '09:00', end: '17:00' },
                                    wednesday: { enabled: false, start: '09:00', end: '17:00' },
                                    thursday: { enabled: false, start: '09:00', end: '17:00' },
                                    friday: { enabled: false, start: '09:00', end: '17:00' },
                                    saturday: { enabled: false, start: '09:00', end: '17:00' },
                                    sunday: { enabled: false, start: '09:00', end: '17:00' }
                                },
                                dateOverrides: {},
                                rating: 0,
                                reviewCount: 0,
                                employeeCount: 1,
                                backgroundCheck: false,
                                status: 'pending',
                                onboarded: false
                            });

                            // Set user info and route to detailer onboarding
                            const userInfo = {
                                uid: user.uid,
                                email: user.email,
                                name: user.displayName || user.email.split('@')[0],
                                photoURL: user.photoURL,
                                initials: getInitials(user.displayName || user.email)
                            };
                            setCurrentUser(userInfo);
                            setUserAccountType('detailer');
                            setIsProvider(true);
                            setCurrentPage('landing');
                            setProviderOnboardingData({
                                businessName: '',
                                businessAddress: '',
                                serviceArea: '',
                                phone: '',
                                email: user.email || ''
                            });
                            setModalType('providerOnboarding');

                            // Clear the flag after a delay
                            setTimeout(() => {
                                isCreatingAccountRef.current = false;
                            }, 3000);
                        } else {
                            // Create a new CUSTOMER document
                            await setDoc(customerRef, {
                                ...userData,
                                savedAddresses: [],
                                favoriteProviders: [],
                                address: '',
                                coordinates: null,
                                preferences: {},
                                onboarded: false
                            });

                            // Set user info and route to address modal
                            const userInfo = {
                                uid: user.uid,
                                email: user.email,
                                name: user.displayName || user.email.split('@')[0],
                                photoURL: user.photoURL,
                                initials: getInitials(user.displayName || user.email)
                            };
                            setCurrentUser(userInfo);
                            setUserAccountType('customer');
                            setIsProvider(false);
                            setCurrentPage('landing');
                            setModalType('address');

                            // Clear the flag after a delay
                            setTimeout(() => {
                                isCreatingAccountRef.current = false;
                            }, 3000);
                        }
                    } else {
                        // This is an EXISTING user.
                        const userInfo = {
                            uid: user.uid,
                            email: user.email,
                            name: user.displayName || user.email.split('@')[0],
                            photoURL: user.photoURL,
                            initials: getInitials(user.displayName || user.email)
                        };
                        setCurrentUser(userInfo);

                        if (customerDoc.exists()) {
                            setUserAccountType('customer');
                            setIsProvider(false);
                            // Check onboarding will handle routing
                            if (!isCreatingAccountRef.current) {
                                await checkUserOnboarding(user.uid, 'customer');
                            }
                        } else if (detailerDoc.exists()) {
                            setUserAccountType('detailer');
                            setIsProvider(true);
                            // Check onboarding will handle routing
                            if (!isCreatingAccountRef.current) {
                                await checkUserOnboarding(user.uid, 'detailer');
                            }
                        }
                    }
                } catch (error) {
                    console.error('❌ Error checking user documents on auth:', error);
                    // Set flag to prevent loop
                    isSigningOut = true;
                    // If we can't check, sign out to be safe
                    await signOut(auth);
                    setCurrentUser(null);
                    setUserAccountType(null);
                    setIsProvider(false);
                    setCurrentPage('landing');
                    setLoading(false);
                    // Reset flag after a delay
                    setTimeout(() => { isSigningOut = false; }, 2000);
                    return;
                }
            } else {
                // User is not logged in - show landing page
                setCurrentUser(null);
                setUserAccountType(null);
                setIsProvider(false);
                setCurrentPage('landing');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // ==================== AUTO-INITIALIZE PACKAGES ====================
    useEffect(() => {
        // Auto-create packages if they don't exist (runs once on app load)
        initializePackagesIfEmpty().catch(error => {
            console.error('Failed to auto-initialize packages:', error);
        });
    }, []);

    // Check if returning user has already completed onboarding
    async function checkUserOnboarding(uid, role) {
        try {
            // Determine which collection to check based on role
            const collectionName = role === 'detailer' ? 'detailer' : 'customer';
            const userDocRef = doc(db, collectionName, uid);

            let userDoc;
            try {
                userDoc = await getDoc(userDocRef);
            } catch (docError) {
                console.error('❌ Error reading user document:', docError);
                console.error('Document read error details:', {
                    code: docError.code,
                    message: docError.message,
                    stack: docError.stack
                });
                throw docError;
            }

            if (!userDoc.exists()) {
                // User is authenticated but has no Firestore document - sign them out
                // This happens when Firebase Auth session exists but Firestore document was deleted
                await signOut(auth);
                setCurrentPage('landing');
                setCurrentUser(null);
                setUserAccountType(null);
                setIsProvider(false);
                return;
            }

            const userData = userDoc.data();

            if (role === 'detailer') {
                // Detailer/Provider flow
                setIsProvider(true);
                setAddress(
                    userData.businessAddress ||
                    userData.serviceArea ||
                    ''
                );
                setUserCoordinates(userData.coordinates || null);
                setAnswers({
                    vehicleType: userData.vehicleSpecialty || 'All Vehicles',
                    serviceType: userData.primaryService || 'Multiple Services',
                    timeSlot: 'Flexible'
                });

                // Check if detailer needs to complete onboarding
                if (!userData.onboarded || !userData.businessName || !userData.businessAddress) {
                    setCurrentPage('landing');
                    setModalType('providerOnboarding');
                    return;
                }

                setCurrentPage('dashboard');
            } else {
                // Customer flow
                setIsProvider(false);

                // Customers - check if they have an address
                if (userData.address || userData.coordinates) {
                    setAddress(userData.coordinates?.formattedAddress || userData.address || '');
                    setUserCoordinates(userData.coordinates || null);
                    setAnswers({
                        vehicleType: userData.preferences?.vehicleType || 'Sedan',
                        serviceType: userData.preferences?.serviceType || 'Full Detail',
                        timeSlot: userData.preferences?.timeSlot || 'Flexible'
                    });

                    setCurrentPage('marketplace');
                } else {
                    // Customer exists but needs to enter address - show address modal
                    setCurrentPage('landing');
                    setModalType('address');
                }
            }
        } catch (error) {
            console.error('❌ Error checking user onboarding:', error);
            console.error('Onboarding error details:', {
                code: error.code,
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            console.error('🔐 Auth state at error:', {
                isAuthenticated: !!auth.currentUser,
                uid: auth.currentUser?.uid,
                email: auth.currentUser?.email
            });

            if (error.code === 'permission-denied') {
                console.error('🚨 PERMISSION DENIED when reading own user document!');
                console.error('This suggests Firestore rules may not be deployed or are incorrect.');
                console.error('Please deploy the updated firestore.rules file to Firebase Console.');
            }

            // On error, default to landing page
            setCurrentPage('landing');
        }
    }

    // Check for stored zip code on mount
    useEffect(() => {
        const storedZipCode = localStorage.getItem('brnno_zip_code');
        if (storedZipCode && !userCoordinates) {
            setZipCode(storedZipCode);
            // Auto-load coordinates from stored zip code
            handleZipCodeSubmit(storedZipCode, false).catch(error => {
                console.error('Error loading stored zip code:', error);
            });
        }
    }, []); // Only run once on mount

    // Show zip code modal when entering marketplace without coordinates
    useEffect(() => {
        if (currentPage === 'marketplace' && !userCoordinates && !modalType) {
            const storedZipCode = localStorage.getItem('brnno_zip_code');
            const skippedZipCode = localStorage.getItem('brnno_zip_code_skipped');
            if (!storedZipCode && !skippedZipCode) {
                // Show zip code modal if no stored zip code and user hasn't skipped
                setModalType('zipCode');
            }
        }
    }, [currentPage, userCoordinates, modalType]);

    // Load detailers when marketplace opens (and when coordinates become available)
    useEffect(() => {
        if (currentPage === 'marketplace') {
            // Always reload when navigating to marketplace to get latest data
            // Use a small delay to ensure Firebase is ready
            const loadTimeout = setTimeout(() => {
                loadDetailers().catch(error => {
                    console.error('Error loading detailers:', error);
                });
            }, 100);

            return () => clearTimeout(loadTimeout);
        }
    }, [currentPage, userCoordinates]);

    // Real-time listener for provider updates - reloads detailers when providers change
    useEffect(() => {
        if (currentPage === 'marketplace') {
            let isInitialLoad = true;
            let loadTimeout = null;

            // Listen for changes to users collection (providers) - unified structure

            const unsubscribe = onSnapshot(
                query(collection(db, 'detailer')),
                async (snapshot) => {
                    // Skip the initial load - let the manual loadDetailers() handle it
                    if (isInitialLoad) {
                        isInitialLoad = false;
                        return;
                    }

                    // Debounce rapid updates
                    if (loadTimeout) {
                        clearTimeout(loadTimeout);
                    }

                    loadTimeout = setTimeout(async () => {
                        try {
                            await loadDetailers();
                        } catch (error) {
                            console.error('❌ Error reloading detailers from listener:', error);
                            console.error('Error details:', {
                                code: error.code,
                                message: error.message,
                                stack: error.stack
                            });
                        }
                    }, 500); // Wait 500ms before reloading
                },
                (error) => {
                    console.error('❌ Error in real-time listener:', error);
                    console.error('Listener error details:', {
                        code: error.code,
                        message: error.message,
                        stack: error.stack,
                        name: error.name
                    });
                    console.error('🔐 Auth state at listener error:', {
                        isAuthenticated: !!auth.currentUser,
                        uid: auth.currentUser?.uid
                    });
                    // Don't reload on error - let manual load handle it
                }
            );

            // Mark initial load as complete after a short delay
            setTimeout(() => {
                isInitialLoad = false;
            }, 1000);

            // Cleanup listener when leaving marketplace
            return () => {
                if (loadTimeout) {
                    clearTimeout(loadTimeout);
                }
                unsubscribe();
            };
        }
    }, [currentPage, address, userCoordinates]);

    // ==================== HELPER FUNCTIONS ====================
    function getInitials(name) {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    async function loadDetailers() {
        try {
            // Load packages from Firestore
            const packagesQuery = collection(db, 'packages');
            const packagesSnapshot = await getDocs(packagesQuery);
            const packagesMap = {};
            packagesSnapshot.docs.forEach(doc => {
                packagesMap[doc.id] = { id: doc.id, ...doc.data() };
            });

            // Fallback to local packages if Firestore is empty
            if (Object.keys(packagesMap).length === 0) {

                // Try to auto-create packages
                try {
                    await initializePackagesIfEmpty();
                    // Reload packages after creation
                    const retrySnapshot = await getDocs(collection(db, 'packages'));
                    retrySnapshot.docs.forEach(doc => {
                        packagesMap[doc.id] = { id: doc.id, ...doc.data() };
                    });

                    if (Object.keys(packagesMap).length === 0) {
                        // Still empty, use local fallback
                        PACKAGES_DATA.forEach(pkg => {
                            packagesMap[pkg.id] = pkg;
                        });
                    }
                } catch (error) {
                    console.error('Error auto-creating packages:', error);
                    // Fallback to local packages
                    PACKAGES_DATA.forEach(pkg => {
                        packagesMap[pkg.id] = pkg;
                    });
                }
            }

            // Query detailer collection

            const providersQuery = query(
                collection(db, 'detailer')
            );

            let snapshot;
            try {
                snapshot = await getDocs(providersQuery);
            } catch (queryError) {
                console.error('Firestore Query Error:', queryError);
                throw queryError; // Re-throw to be caught by outer catch
            }

            const loadedDetailers = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
                const data = docSnapshot.data();

                // Load packages for this provider
                const offeredPackages = data.offeredPackages || [];
                const customPrices = data.packagePrices || {};

                const packages = offeredPackages
                    .map(pkgId => {
                        const pkg = packagesMap[pkgId];
                        if (!pkg) {
                            console.warn(`⚠️ Package ${pkgId} not found in packagesMap for provider ${data.businessName}`);
                            return undefined;
                        }
                        // Merge custom prices if they exist
                        if (customPrices[pkgId]) {
                            return {
                                ...pkg,
                                price: customPrices[pkgId].price
                            };
                        }
                        return pkg;
                    })
                    .filter(pkg => pkg !== undefined);

                // Calculate real distance if both user and provider have coordinates
                let distance = 999; // Default high value
                if (userCoordinates && data.coordinates) {
                    distance = calculateRealDistance(
                        userCoordinates.lat,
                        userCoordinates.lng,
                        data.coordinates.lat,
                        data.coordinates.lng
                    );
                }
                // Only log warning if user has coordinates but provider doesn't (data issue)
                // Don't log if user doesn't have coordinates (expected when browsing without zip code)
                else if (userCoordinates && !data.coordinates) {
                    console.warn(`Provider missing coordinates:`, data.businessName);
                }

                // Generate available times based on defaultAvailability
                const availableTimes = generateAvailableTimes(data.defaultAvailability);

                // Use bio field if it exists, otherwise use a neutral default without provider address
                const aboutText = data.bio || data.about ||
                    'Professional mobile detailing service. Background checked and insured.';

                return {
                    id: docSnapshot.id,
                    userId: data.uid, // Provider's user UID (now same as document ID)
                    name: data.businessName || data.name || 'Professional Detailer',
                    ownerName: data.name,
                    rating: (data.reviewCount && data.reviewCount > 0) ? (data.rating || null) : null,
                    reviews: data.reviewCount || 0,
                    distance: distance,
                    available: data.status === 'approved' && packages.length > 0, // Must be approved and have packages!
                    price: getStartingPriceFromPackages(packages),
                    image: data.image || null,
                    about: aboutText,
                    packages: packages, // New: packages array
                    addOns: data.addOns || [], // Available add-ons
                    photos: data.portfolio || [],
                    availableTimes: availableTimes,
                    status: data.status,
                    phone: data.phone,
                    email: data.email,
                    serviceArea: data.serviceArea,
                    employeeCount: data.employeeCount || 1,
                    backgroundCheck: data.backgroundCheck,
                    defaultAvailability: data.defaultAvailability,
                    dateOverrides: data.dateOverrides || {},
                    coordinates: data.coordinates,
                    hasPackages: packages.length > 0
                };
            }));

            // Show providers that are APPROVED
            // Note: We'll show approved providers even if they don't have packages yet
            // (they can add packages in their dashboard)
            let availableDetailers = loadedDetailers.filter(d => {
                const isApproved = d.status === 'approved';
                if (!isApproved) {
                    console.log(`❌ Filtered out: ${d.name} - Status: ${d.status}`);
                } else if (!d.hasPackages) {
                    console.warn(`⚠️ Approved provider ${d.name} has no packages yet`);
                }
                return isApproved;
            });

            console.log('✅ Filtered detailers:', {
                total: loadedDetailers.length,
                approved: availableDetailers.length,
                withPackages: availableDetailers.filter(d => d.hasPackages).length,
                withoutPackages: availableDetailers.filter(d => !d.hasPackages).length,
                detailerNames: availableDetailers.map(d => d.name),
                detailerIds: availableDetailers.map(d => d.id)
            });

            // Sort by distance (closest first) by default
            availableDetailers.sort((a, b) => a.distance - b.distance);

            setDetailers(availableDetailers);
        } catch (error) {
            // Enhanced error logging
            console.error('Error loading detailers:', error);

            // More specific error messages
            let errorMessage = 'Error loading detailers. ';
            if (error.code === 'permission-denied') {
                errorMessage += 'Permission denied. Check Firestore rules.';
                console.error('PERMISSION DENIED - Check Firestore rules and authentication');
            } else if (error.code === 'unavailable') {
                errorMessage += 'Firebase is unavailable. Check your connection.';
            } else if (error.code === 'failed-precondition') {
                errorMessage += 'Query requires an index. Check Firebase Console.';
            } else {
                errorMessage += `Error: ${error.message}`;
            }

            // Always show alert and log to console
            alert(`${errorMessage}\n\nCheck console (F12) for details.`);

            // Fallback to mock data if error
            console.warn('Falling back to mock data');
            setDetailers(getMockDetailers());
        }
    }

    function getStartingPrice(services) {
        if (!services || services.length === 0) return 65;
        const prices = services.map(s => s.price || 0).filter(p => p > 0);
        return prices.length > 0 ? Math.min(...prices) : 65;
    }

    function getStartingPriceFromPackages(packages) {
        if (!packages || packages.length === 0) return 150;
        const prices = packages.map(pkg => pkg.price || 0).filter(p => p > 0);
        return prices.length > 0 ? Math.min(...prices) : 150;
    }

    function generateAvailableTimes(availability) {
        if (!availability) return ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'];

        // Find first enabled day to show times
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        for (const day of days) {
            if (availability[day]?.enabled && availability[day]?.start) {
                const start = availability[day].start; // e.g., "10:00"
                const end = availability[day].end; // e.g., "18:00"

                // Generate time slots between start and end
                const times = [];
                let currentHour = parseInt(start.split(':')[0]);
                const endHour = parseInt(end.split(':')[0]);

                while (currentHour < endHour && times.length < 4) {
                    const hour12 = currentHour > 12 ? currentHour - 12 : currentHour;
                    const ampm = currentHour >= 12 ? 'PM' : 'AM';
                    times.push(`${hour12}:00 ${ampm}`);
                    currentHour += 2; // 2 hour intervals
                }

                return times.length > 0 ? times : ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'];
            }
        }

        return ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'];
    }

    function calculateDistance(userAddress, serviceArea) {
        // Implement actual distance calculation or return estimate
        return (Math.random() * 10 + 0.5).toFixed(1);
    }

    function getMockDetailers() {
        return [
            {
                id: '1',
                name: 'Premium Auto Spa',
                rating: null,
                reviews: 0,
                distance: '2.3',
                available: true,
                price: 75,
                image: null,
                about: 'We specialize in premium detailing services with 10+ years of experience.',
                services: [
                    { name: 'Full Detail', price: 150, duration: '3 hours' },
                    { name: 'Exterior Only', price: 75, duration: '1.5 hours' },
                    { name: 'Interior Only', price: 85, duration: '2 hours' }
                ],
                photos: [],
                availableTimes: ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM']
            },
            {
                id: '2',
                name: 'Elite Mobile Detail',
                rating: null,
                reviews: 0,
                distance: '3.1',
                available: true,
                price: 65,
                image: null,
                about: 'Mobile detailing done right. We come to you with all professional equipment.',
                services: [
                    { name: 'Basic Wash', price: 65, duration: '1 hour' },
                    { name: 'Full Detail', price: 140, duration: '3 hours' },
                    { name: 'Ceramic Coating', price: 350, duration: '5 hours' }
                ],
                photos: [],
                availableTimes: ['8:00 AM', '10:00 AM', '1:00 PM', '3:00 PM']
            }
        ];
    }

    // ==================== AUTH FUNCTIONS ====================
    async function handleEmailSignup() {
        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                signupData.email,
                signupData.password
            );

            // Determine which collection to use based on account type
            const accountType = signupData.accountType || 'customer';
            const collectionName = accountType === 'provider' ? 'detailer' : 'customer';

            // Create user document data
            const userData = {
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                displayName: signupData.name,
                photoURL: userCredential.user.photoURL,
                createdAt: serverTimestamp(),
            };

            // Create document in the appropriate collection
            if (accountType === 'provider') {
                // Create detailer document
                await setDoc(doc(db, 'detailer', userCredential.user.uid), {
                    ...userData,
                    businessName: signupData.name || 'New Business',
                    businessAddress: '',
                    serviceArea: '',
                    phone: '',
                    services: [],
                    offeredPackages: [],
                    addOns: [],
                    packagePrices: {},
                    defaultAvailability: {
                        monday: { enabled: false, start: '09:00', end: '17:00' },
                        tuesday: { enabled: false, start: '09:00', end: '17:00' },
                        wednesday: { enabled: false, start: '09:00', end: '17:00' },
                        thursday: { enabled: false, start: '09:00', end: '17:00' },
                        friday: { enabled: false, start: '09:00', end: '17:00' },
                        saturday: { enabled: false, start: '09:00', end: '17:00' },
                        sunday: { enabled: false, start: '09:00', end: '17:00' }
                    },
                    dateOverrides: {},
                    rating: 0,
                    reviewCount: 0,
                    employeeCount: 1,
                    backgroundCheck: false,
                    status: 'pending',
                    onboarded: false
                });
            } else {
                // Create customer document
                await setDoc(doc(db, 'customer', userCredential.user.uid), {
                    ...userData,
                    savedAddresses: [],
                    favoriteProviders: [],
                    address: address || '',
                    coordinates: userCoordinates || null,
                    preferences: answers || {},
                    onboarded: false
                });
            }

            // Set user info immediately
            const userInfo = {
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                name: signupData.name || userCredential.user.email.split('@')[0],
                photoURL: userCredential.user.photoURL,
                initials: getInitials(signupData.name || userCredential.user.email)
            };
            setCurrentUser(userInfo);

            // Set account type for routing
            setUserAccountType(signupData.accountType || 'customer');
            if (signupData.accountType === 'provider') {
                // Providers need to complete onboarding (business credentials)
                setIsProvider(true);
                setCurrentPage('landing');
                // Pre-fill email in onboarding form
                setProviderOnboardingData({
                    businessName: '',
                    businessAddress: '',
                    serviceArea: '',
                    phone: '',
                    email: signupData.email || userCredential.user.email || ''
                });
                setModalType('providerOnboarding');
            } else {
                // Customers need to enter address after signup
                setModalType('address');
            }
        } catch (error) {
            console.error('Signup error:', error);
            alert(error.message);
        }
    }

    // Email/password login function
    async function handleEmailLogin() {
        try {
            if (!loginData.email || !loginData.password) {
                alert('Please enter your email and password');
                return;
            }

            const result = await signInWithEmailAndPassword(auth, loginData.email, loginData.password);

            // Check if user exists in customer or detailer collection
            const customerDoc = await getDoc(doc(db, 'customer', result.user.uid));
            const detailerDoc = await getDoc(doc(db, 'detailer', result.user.uid));

            if (!customerDoc.exists() && !detailerDoc.exists()) {
                // User doesn't exist - create a basic customer account automatically

                // Set flag to prevent auth listener from signing out during creation
                isCreatingAccountRef.current = true;

                const userData = {
                    uid: result.user.uid,
                    email: result.user.email,
                    displayName: result.user.displayName || loginData.email.split('@')[0],
                    photoURL: result.user.photoURL,
                    createdAt: serverTimestamp(),
                    savedAddresses: [],
                    favoriteProviders: [],
                    address: '',
                    coordinates: null,
                    preferences: {},
                    onboarded: false
                };

                await setDoc(doc(db, 'customer', result.user.uid), userData);

                // Clear the flag after a short delay to allow auth listener to process
                setTimeout(() => {
                    isCreatingAccountRef.current = false;
                }, 2000);

                // Set account type and show address modal (same flow as signup)
                setUserAccountType('customer');
                setModalType('address');
                setLoginData({ email: '', password: '' });
                return;
            }

            // Close login modal - auth listener will handle routing
            setModalType(null);
            setLoginData({ email: '', password: '' });
        } catch (error) {
            console.error('❌ Email login error:', error.code, error.message);

            if (error.code === 'auth/user-not-found') {
                // No account found - redirect to signup with email pre-filled
                setSignupData({ ...signupData, email: loginData.email });
                setModalType('signup');
                // Clear password from login data for security
                setLoginData({ email: loginData.email, password: '' });
            } else {
                // Other errors - show alert
                let errorMessage = 'Login failed. ';
                if (error.code === 'auth/wrong-password') {
                    errorMessage += 'Incorrect password.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage += 'Invalid email address.';
                } else {
                    errorMessage += error.message;
                }
                alert(errorMessage);
            }
        }
    }

    // Generic Google sign-in function
    const startGoogleSignIn = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error('Google Popup Error', error);
            if (error.code === 'permission-denied') {
                alert('Permission error. Please check Firestore rules.');
            } else {
                alert(`Sign-in failed: ${error.message}`);
            }
        }
    };

    // Login function - for existing users
    async function handleGoogleLogin() {
        // Clear any pending role (login doesn't create new accounts)
        localStorage.removeItem('pendingUserRole');
        await startGoogleSignIn();
    }

    // Signup function - for new users going through onboarding
    async function handleGoogleSignup() {
        // Role is already stored in localStorage by SignupModal
        // Just trigger Google sign-in, auth listener will handle account creation
        await startGoogleSignIn();
    }

    async function handleLogout() {
        try {
            // Set loading to false FIRST to prevent stuck loading state
            setLoading(false);

            // Clear all local state
            setCurrentUser(null);
            setUserAccountType(null);
            setIsProvider(false);
            setShowProfileDropdown(false);
            setAddress('');
            setAnswers({
                vehicleType: '',
                serviceType: '',
                timeSlot: ''
            });
            setUserCoordinates(null);
            setDetailers([]);

            // Navigate to landing page BEFORE sign out
            setCurrentPage('landing');
            setModalType(null);

            // Sign out from Firebase
            await signOut(auth);

            // Clear Firebase Auth storage from browser (don't wait for it)
            try {
                if (typeof window !== 'undefined' && window.indexedDB) {
                    const deleteReq = indexedDB.deleteDatabase('firebaseLocalStorageDb');
                    deleteReq.onsuccess = () => {
                        console.log('✅ Firebase Auth storage cleared');
                    };
                    deleteReq.onerror = () => {
                        console.warn('⚠️ Could not clear Firebase Auth storage');
                    };
                }
                // Also clear localStorage Firebase keys
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('firebase:authUser:')) {
                        localStorage.removeItem(key);
                    }
                });
            } catch (storageError) {
                console.warn('⚠️ Could not clear browser storage:', storageError);
            }

            // Force page reload with a small delay to ensure state updates
            // Use setTimeout to ensure reload happens even if something blocks it
            setTimeout(() => {
                window.location.reload();
            }, 100);

        } catch (error) {
            console.error('❌ Error during logout:', error);
            // Ensure loading is false even on error
            setLoading(false);
            // Still navigate to landing page even if signOut fails
            setCurrentPage('landing');
            setCurrentUser(null);
            // Force reload with timeout fallback
            setTimeout(() => {
                window.location.reload();
            }, 100);
        }
    }

    // ==================== ONBOARDING FLOW ====================
    const startOnboarding = useCallback(() => {
        // Navigate directly to marketplace - no signup required to browse
        setCurrentPage('marketplace');

        // Check if we have zip code stored in localStorage
        const storedZipCode = localStorage.getItem('brnno_zip_code');
        if (storedZipCode && !userCoordinates) {
            // Use stored zip code to get coordinates
            handleZipCodeSubmit(storedZipCode, false);
        } else if (!userCoordinates) {
            // Show zip code modal if no coordinates
            setModalType('zipCode');
        }

        // Load detailers if not already loaded (works without auth)
        if (detailers.length === 0) {
            loadDetailers().catch(error => {
                console.error('Error loading detailers:', error);
            });
        }
    }, [detailers.length, userCoordinates]);

    const startLogin = useCallback(() => {
        // Show login modal for returning users
        setModalType('login');
    }, []);

    async function handleAddressSubmit() {
        if (!address.trim()) return;

        // Show loading state
        const originalModalType = modalType;
        setModalType('loading');

        try {
            // Prefer coordinates from autocomplete if available
            let coords = userCoordinates;
            if (!coords || !coords.formattedAddress || coords.formattedAddress !== address) {
                coords = await geocodeAddress(address);
            }

            if (!coords) {
                alert('Could not find that address. Please check and try again.');
                setModalType(originalModalType);
                return;
            }

            // Save coordinates
            setUserCoordinates(coords);

            // Use formatted address from Google
            if (coords.formattedAddress) {
                setAddress(coords.formattedAddress);
            }

            // Save address to customer's document and subcollection if user is logged in
            if (currentUser && currentUser.uid) {
                try {
                    // Update customer document with address (customers only, detailers don't need this)
                    const customerDocRef = doc(db, 'customer', currentUser.uid);
                    const customerDoc = await getDoc(customerDocRef);
                    if (customerDoc.exists()) {
                        await updateDoc(customerDocRef, {
                            address: coords.formattedAddress || address,
                            coordinates: coords,
                            updatedAt: serverTimestamp()
                        });

                        // Save to addresses subcollection
                        const addrDoc = doc(collection(db, 'customer', currentUser.uid, 'addresses'));
                        await setDoc(addrDoc, {
                            label: 'Home',
                            address: coords.formattedAddress || address,
                            coordinates: coords,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp()
                        });
                    }
                } catch (e) {
                    console.warn('Could not save address:', e?.message || e);
                }
            }

            // Close modal and go to marketplace
            setModalType(null);
            setCurrentPage('marketplace');
        } catch (error) {
            console.error('Error geocoding address:', error);
            alert('Error validating address. Please try again.');
            setModalType(originalModalType);
        }
    }

    async function handleZipCodeSubmit(zipCodeValue, showModal = true) {
        if (!zipCodeValue || !zipCodeValue.trim()) {
            console.warn('Empty zip code provided');
            return;
        }

        const trimmedZip = zipCodeValue.trim();

        // Validate zip code format (5 digits)
        if (!/^\d{5}$/.test(trimmedZip)) {
            console.warn('Invalid zip code format:', trimmedZip);
            if (showModal) {
                alert('Please enter a valid 5-digit zip code.');
                setModalType('zipCode');
            }
            return;
        }

        // Show loading state if modal is open
        if (showModal) {
            const originalModalType = modalType;
            setModalType('loading');
        }

        try {
            console.log('Geocoding zip code:', trimmedZip);
            // Geocode zip code to get coordinates
            const coords = await geocodeAddress(trimmedZip);

            if (!coords) {
                console.error('Geocoding failed for zip code:', trimmedZip);
                if (showModal) {
                    // Check if it's an API error vs invalid zip code
                    const apiError = localStorage.getItem('geocoding_api_error');
                    if (apiError) {
                        alert('Geocoding service is not available. Please check your Google Maps API configuration. You can still browse all detailers.');
                        localStorage.removeItem('geocoding_api_error');
                    } else {
                        alert(`Could not find zip code ${trimmedZip}. Please check and try again. You can still browse all detailers.`);
                    }
                    setModalType('zipCode');
                }
                return;
            }

            console.log('Geocoding successful:', coords);

            // Save coordinates
            setUserCoordinates(coords);

            // Store zip code in localStorage
            localStorage.setItem('brnno_zip_code', trimmedZip);
            setZipCode(trimmedZip);

            // Reload detailers with new coordinates
            await loadDetailers();

            // Close modal if it was open
            if (showModal) {
                setModalType(null);
            }
        } catch (error) {
            console.error('Error processing zip code:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                zipCode: trimmedZip
            });
            if (showModal) {
                alert(`Failed to process zip code ${trimmedZip}. Please try again. You can still browse all detailers.`);
                setModalType('zipCode');
            }
        }
    }

    // Handle search query changes - detect and geocode zip codes automatically
    const handleSearchChange = useCallback(async (value) => {
        setSearchQuery(value);

        // If it's a 5-digit zip code, geocode it automatically (with debounce)
        const trimmedValue = value.trim();
        if (/^\d{5}$/.test(trimmedValue)) {
            // Only geocode if it's different from the current zip code
            const currentZip = localStorage.getItem('brnno_zip_code');
            if (trimmedValue !== currentZip) {
                console.log('Auto-geocoding zip code from search:', trimmedValue);
                // Small delay to avoid geocoding while user is still typing
                setTimeout(async () => {
                    // Double-check the value hasn't changed by checking the current searchQuery state
                    // Note: This is a closure, so it will use the value at the time setTimeout was called
                    await handleZipCodeSubmit(trimmedValue, false);
                }, 500);
            }
        }
    }, []);

    // Question handlers removed - questions flow removed

    // ==================== PROVIDER ONBOARDING ====================
    async function handleProviderOnboarding() {
        if (!currentUser || !currentUser.uid) {
            alert('You must be logged in to complete provider onboarding');
            return;
        }

        if (!providerOnboardingData.businessName || !providerOnboardingData.businessAddress) {
            alert('Please fill in all required fields (Business Name and Business Address)');
            return;
        }

        try {
            // Use coordinates from Google Places Autocomplete if available
            let coords = userCoordinates;

            // Check if we already have coordinates from Google Places Autocomplete
            // The coordinates should match the business address if user selected from autocomplete
            if (coords && coords.lat && coords.lng && coords.formattedAddress) {
                // Verify the address matches (allowing for slight variations)
                const addressMatches = coords.formattedAddress === providerOnboardingData.businessAddress ||
                    providerOnboardingData.businessAddress.includes(coords.formattedAddress.split(',')[0]) ||
                    coords.formattedAddress.includes(providerOnboardingData.businessAddress.split(',')[0]);

                if (addressMatches) {
                } else {
                    console.warn('⚠️ Address mismatch, but using existing coordinates');
                    // Still use the coordinates but update the formatted address
                    coords = {
                        ...coords,
                        formattedAddress: providerOnboardingData.businessAddress
                    };
                }
            } else {
                // No coordinates available - user must select from autocomplete
                if (!providerOnboardingData.businessAddress || !providerOnboardingData.businessAddress.trim()) {
                    alert('Please enter a valid business address.');
                    return;
                }

                alert('Please select an address from the suggestions dropdown. This ensures accurate location data.');
                return;
            }

            // Update detailer document with provider business information
            const detailerDocRef = doc(db, 'detailer', currentUser.uid);
            await updateDoc(detailerDocRef, {
                businessName: providerOnboardingData.businessName,
                businessAddress: providerOnboardingData.businessAddress,
                serviceArea: providerOnboardingData.serviceArea || providerOnboardingData.businessAddress,
                phone: providerOnboardingData.phone || '',
                email: providerOnboardingData.email || currentUser.email,
                coordinates: coords,
                onboarded: true,
                updatedAt: serverTimestamp()
            });


            // Close modal and go to dashboard
            setModalType(null);
            setCurrentPage('dashboard');

            // Update local state
            setAddress(providerOnboardingData.businessAddress);
            setUserCoordinates(coords);
        } catch (error) {
            console.error('Error completing provider onboarding:', error);
            alert(`Error saving business information: ${error.message}`);
        }
    }

    // ==================== RENDER FUNCTIONS ====================
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Landing Page */}
            {currentPage === 'landing' && (
                <LandingPage
                    onGetStarted={startOnboarding}
                />
            )}

            {/* Marketplace */}
            {currentPage === 'marketplace' && (
                <MarketplacePage
                    detailers={filteredDetailers}
                    allDetailersCount={detailers.length}
                    onSelectDetailer={(detailer) => {
                        setSelectedDetailer(detailer);
                        setCurrentPage('detailerProfile');
                    }}
                    currentUser={currentUser}
                    onGoToDashboard={() => { setShowProfileDropdown(false); setCurrentPage('dashboard'); }}
                    onLogout={handleLogout}
                    onLogin={startLogin}
                    showProfileDropdown={showProfileDropdown}
                    setShowProfileDropdown={setShowProfileDropdown}
                    address={address}
                    onChangeLocation={() => setModalType('address')}
                    searchQuery={searchQuery}
                    onSearchChange={handleSearchChange}
                    distanceFilter={distanceFilter}
                    onDistanceChange={setDistanceFilter}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                />
            )}

            {/* Detailer Profile */}
            {currentPage === 'detailerProfile' && selectedDetailer && (
                <DetailerProfilePage
                    detailer={selectedDetailer}
                    answers={answers}
                    address={address}
                    setAddress={setAddress}
                    setAnswers={setAnswers}
                    currentUser={currentUser}
                    onBack={() => setCurrentPage('marketplace')}
                    onBook={() => {
                        alert('Booking functionality - integrate with your Stripe!');
                    }}
                    onShowSignup={() => setModalType('signup')}
                    onShowGuestCheckout={() => setModalType('guestCheckout')}
                    guestBookingInfo={guestBookingInfo}
                />
            )}

            {/* Dashboard - conditional based on account type */}
            {currentPage === 'dashboard' && (
                (userAccountType === 'provider' || isProvider || currentUser?.role === 'admin') ? (
                    <ProviderDashboard
                        currentUser={currentUser}
                        onBackToMarketplace={() => setCurrentPage('marketplace')}
                        onLogout={handleLogout}
                        showProfileDropdown={showProfileDropdown}
                        setShowProfileDropdown={setShowProfileDropdown}
                    />
                ) : (
                    <CustomerDashboard
                        currentUser={currentUser}
                        onBackToMarketplace={() => setCurrentPage('marketplace')}
                        onLogout={handleLogout}
                        showProfileDropdown={showProfileDropdown}
                        setShowProfileDropdown={setShowProfileDropdown}
                        address={address}
                        answers={answers}
                        userCoordinates={userCoordinates}
                    />
                )
            )}

            {/* Modals */}
            {modalType === 'address' && (
                <AddressModal
                    address={address}
                    setAddress={setAddress}
                    addressInputRef={addressInputRef}
                    onSubmit={handleAddressSubmit}
                    onClose={() => setModalType(null)}
                />
            )}

            {modalType === 'login' && (
                <LoginModal
                    loginData={loginData}
                    setLoginData={setLoginData}
                    onEmailLogin={handleEmailLogin}
                    onGoogleLogin={handleGoogleLogin}
                    onClose={() => setModalType(null)}
                    onSwitchToSignup={() => {
                        setModalType('signup');
                        // Pre-fill email if they entered it
                        if (loginData.email) {
                            setSignupData({ ...signupData, email: loginData.email });
                        }
                    }}
                />
            )}

            {modalType === 'signup' && (
                <SignupModal
                    signupData={signupData}
                    setSignupData={setSignupData}
                    onEmailSignup={handleEmailSignup}
                    onGoogleSignup={handleGoogleSignup}
                    onBack={null}
                    onClose={() => setModalType(null)}
                    onSwitchToLogin={() => {
                        setModalType('login');
                        // Pre-fill email if they entered it
                        if (signupData.email) {
                            setLoginData({ ...loginData, email: signupData.email });
                        }
                    }}
                />
            )}

            {modalType === 'providerOnboarding' && (
                <ProviderOnboardingModal
                    providerOnboardingData={providerOnboardingData}
                    setProviderOnboardingData={setProviderOnboardingData}
                    addressInputRef={addressInputRef}
                    onSubmit={handleProviderOnboarding}
                    onClose={() => setModalType(null)}
                />
            )}

            {modalType === 'zipCode' && (
                <ZipCodeModal
                    zipCode={zipCode}
                    setZipCode={setZipCode}
                    onSubmit={(zip) => handleZipCodeSubmit(zip, true)}
                    onClose={() => {
                        setModalType(null);
                        // Allow browsing without zip code
                    }}
                    onSkip={() => {
                        // Mark that user skipped zip code entry
                        localStorage.setItem('brnno_zip_code_skipped', 'true');
                        setModalType(null);
                        // Allow browsing without zip code
                    }}
                />
            )}

            {modalType === 'guestCheckout' && (
                <GuestCheckoutModal
                    onContinue={(guestInfo) => {
                        setGuestBookingInfo(guestInfo);
                        setModalType(null);
                    }}
                    onSignUp={() => {
                        setModalType('signup');
                    }}
                    onClose={() => {
                        setModalType(null);
                        setGuestBookingInfo(null);
                    }}
                />
            )}
        </div>
    );
}

// LandingPage is now imported from './components/pages/LandingPage'
// Modals are now imported from './components/modals'

// BookingSidebar is now imported from './components/booking'

// ==================== DETAILER PROFILE PAGE ====================
function DetailerProfilePage({ detailer, answers, address, setAddress, setAnswers, currentUser, onBack, onBook, onShowSignup, onShowGuestCheckout, guestBookingInfo }) {
    const [activeTab, setActiveTab] = useState('about');

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Glassmorphic Header */}
            <div className="sticky top-0 z-40 backdrop-blur-xl bg-gradient-to-r from-blue-600/90 via-blue-700/90 to-indigo-600/90 border-b border-blue-400/20 shadow-lg">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-white font-semibold hover:text-blue-100 transition-colors drop-shadow-sm"
                    >
                        ← Back
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
                {/* Profile Header Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-md p-4 sm:p-6 mb-6">
                    <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                            <span className="text-2xl sm:text-3xl font-bold text-white">
                                {detailer.name.charAt(0)}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 break-words">
                                {detailer.name}
                            </h1>
                            <div className="flex items-center gap-2 mb-2">
                                <Star className={`w-5 h-5 ${detailer.reviews > 0 ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-300 text-gray-300'}`} />
                                {detailer.rating && detailer.reviews > 0 ? (
                                    <>
                                        <span className="font-semibold text-gray-900">{detailer.rating}</span>
                                        <span className="text-gray-500">({detailer.reviews} reviews)</span>
                                    </>
                                ) : (
                                    <span className="text-gray-500">No reviews yet</span>
                                )}
                            </div>
                            {detailer.bio && (
                                <p className="text-gray-600 text-sm sm:text-base">{detailer.bio}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-gray-200">
                    {['about', 'services', 'reviews', 'photos'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 font-semibold transition-colors capitalize ${activeTab === tab
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {activeTab === 'about' && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
                                {detailer.bio ? (
                                    <p className="text-gray-700 whitespace-pre-wrap">{detailer.bio}</p>
                                ) : (
                                    <p className="text-gray-500">No bio available.</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'services' && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Services & Packages</h2>
                                {detailer.packages && detailer.packages.length > 0 ? (
                                    <div className="space-y-4">
                                        {detailer.packages.map((pkg) => (
                                            <div key={pkg.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                                                        <p className="text-sm text-gray-600">{pkg.description}</p>
                                                    </div>
                                                    <div className="text-lg font-bold text-gray-900">${pkg.price}</div>
                                                </div>
                                                {(pkg.exteriorServices || pkg.interiorServices) && (
                                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                        {pkg.exteriorServices && pkg.exteriorServices.length > 0 && (
                                                            <div>
                                                                <div className="font-semibold text-gray-700 mb-1">Exterior:</div>
                                                                <ul className="space-y-1 text-gray-600">
                                                                    {pkg.exteriorServices.map((svc, idx) => (
                                                                        <li key={idx}>• {svc}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {pkg.interiorServices && pkg.interiorServices.length > 0 && (
                                                            <div>
                                                                <div className="font-semibold text-gray-700 mb-1">Interior:</div>
                                                                <ul className="space-y-1 text-gray-600">
                                                                    {pkg.interiorServices.map((svc, idx) => (
                                                                        <li key={idx}>• {svc}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500">No packages available.</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'reviews' && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Reviews</h2>
                                {detailer.reviews > 0 ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Star className={`w-6 h-6 ${detailer.reviews > 0 ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-300 text-gray-300'}`} />
                                            <span className="text-2xl font-bold text-gray-900">{detailer.rating}</span>
                                            <span className="text-gray-500">({detailer.reviews} reviews)</span>
                                        </div>
                                        <p className="text-gray-500">Review details coming soon...</p>
                                    </div>
                                ) : (
                                    <p className="text-gray-500">No reviews yet.</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'photos' && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Photos</h2>
                                {detailer.photos && detailer.photos.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {detailer.photos.map((photo, idx) => (
                                            <img
                                                key={idx}
                                                src={photo}
                                                alt={`${detailer.name} photo ${idx + 1}`}
                                                className="w-full h-48 object-cover rounded-lg"
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">No photos available</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Booking Sidebar */}
                    <div className="lg:col-span-1">
                        <BookingSidebar
                            detailer={detailer}
                            answers={answers}
                            address={address}
                            setAddress={setAddress}
                            setAnswers={setAnswers}
                            currentUser={currentUser}
                            onBook={onBook}
                            onShowSignup={onShowSignup}
                            onShowGuestCheckout={onShowGuestCheckout}
                            guestBookingInfo={guestBookingInfo}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// MarketplacePage, DetailerCard, and ProfileDropdown are now imported from './components/pages', './components/marketplace', and './components/common'
