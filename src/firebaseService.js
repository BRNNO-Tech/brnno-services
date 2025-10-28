import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit,
    where,
    doc,
    updateDoc,
    increment,
    getDoc,
    setDoc,
    deleteDoc
} from 'firebase/firestore';
import { db } from './firebase/config';

// Waitlist analytics function
export const getWaitlistAnalytics = async () => {
    try {
        const waitlistQuery = query(collection(db, 'waitlist'));
        const waitlistSnapshot = await getDocs(waitlistQuery);

        const analytics = {
            totalCount: waitlistSnapshot.size,
            recentSignups: 0,
            byCity: {},
            byService: {},
            byUrgency: {},
            byVehicleType: {}
        };

        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        waitlistSnapshot.forEach((doc) => {
            const data = doc.data();

            // Count recent signups
            if (data.createdAt && data.createdAt.toDate() > oneDayAgo) {
                analytics.recentSignups++;
            }

            // Count by city
            if (data.city) {
                analytics.byCity[data.city] = (analytics.byCity[data.city] || 0) + 1;
            }

            // Count by service
            if (data.service) {
                analytics.byService[data.service] = (analytics.byService[data.service] || 0) + 1;
            }

            // Count by urgency
            if (data.urgency) {
                analytics.byUrgency[data.urgency] = (analytics.byUrgency[data.urgency] || 0) + 1;
            }

            // Count by vehicle type
            if (data.vehicleType) {
                analytics.byVehicleType[data.vehicleType] = (analytics.byVehicleType[data.vehicleType] || 0) + 1;
            }
        });

        return analytics;
    } catch (error) {
        console.error('Error fetching waitlist analytics:', error);
        throw error;
    }
};

// Provider management functions
export const getProviderBookings = async (providerId) => {
    try {
        const bookingsQuery = query(
            collection(db, 'bookings'),
            where('providerId', '==', providerId),
            orderBy('date', 'desc')
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);

        const bookings = [];
        bookingsSnapshot.forEach((doc) => {
            bookings.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return bookings;
    } catch (error) {
        console.error('Error fetching provider bookings:', error);
        throw error;
    }
};

export const updateProviderServices = async (providerId, services) => {
    try {
        // Update in users collection
        await updateDoc(doc(db, 'users', providerId), {
            services: services
        });

        // Also update in providers collection
        const providerQuery = query(collection(db, 'providers'), where('userId', '==', providerId));
        const providerSnapshot = await getDocs(providerQuery);

        if (!providerSnapshot.empty) {
            const providerDoc = providerSnapshot.docs[0];
            await updateDoc(providerDoc.ref, {
                services: services
            });
        }

        return true;
    } catch (error) {
        console.error('Error updating provider services:', error);
        throw error;
    }
};

export const updateProviderAvailability = async (providerId, availability) => {
    try {
        const providerQuery = query(collection(db, 'providers'), where('userId', '==', providerId));
        const providerSnapshot = await getDocs(providerQuery);

        if (!providerSnapshot.empty) {
            const providerDoc = providerSnapshot.docs[0];
            await updateDoc(providerDoc.ref, {
                defaultAvailability: availability
            });
        }

        return true;
    } catch (error) {
        console.error('Error updating provider availability:', error);
        throw error;
    }
};

export const addProviderDateOverride = async (providerId, dateOverride) => {
    try {
        const providerQuery = query(collection(db, 'providers'), where('userId', '==', providerId));
        const providerSnapshot = await getDocs(providerQuery);

        if (!providerSnapshot.empty) {
            const providerDoc = providerSnapshot.docs[0];
            const providerData = providerDoc.data();
            const dateOverrides = providerData.dateOverrides || {};

            const overrideId = Date.now().toString();
            dateOverrides[overrideId] = dateOverride;

            await updateDoc(providerDoc.ref, {
                dateOverrides: dateOverrides
            });
        }

        return true;
    } catch (error) {
        console.error('Error adding date override:', error);
        throw error;
    }
};

export const removeProviderDateOverride = async (providerId, overrideId) => {
    try {
        const providerQuery = query(collection(db, 'providers'), where('userId', '==', providerId));
        const providerSnapshot = await getDocs(providerQuery);

        if (!providerSnapshot.empty) {
            const providerDoc = providerSnapshot.docs[0];
            const providerData = providerDoc.data();
            const dateOverrides = providerData.dateOverrides || {};

            delete dateOverrides[overrideId];

            await updateDoc(providerDoc.ref, {
                dateOverrides: dateOverrides
            });
        }

        return true;
    } catch (error) {
        console.error('Error removing date override:', error);
        throw error;
    }
};

