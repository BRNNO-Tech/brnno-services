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
    increment
} from 'firebase/firestore';
import { db } from './firebase/config';

// Waitlist collection reference
const waitlistCollection = collection(db, 'waitlist');

// Add a new waitlist signup
export const addToWaitlist = async (waitlistData) => {
    try {
        const docRef = await addDoc(waitlistCollection, {
            ...waitlistData,
            timestamp: new Date(),
            status: 'pending',
            referralCode: generateReferralCode(waitlistData.email),
            referredBy: null, // Will be set if they came from a referral link
        });

        console.log('Waitlist signup added with ID:', docRef.id);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding to waitlist:', error);
        return { success: false, error: error.message };
    }
};

// Get waitlist count
export const getWaitlistCount = async () => {
    try {
        const snapshot = await getDocs(waitlistCollection);
        return snapshot.size;
    } catch (error) {
        console.error('Error getting waitlist count:', error);
        return 0;
    }
};

// Get waitlist analytics
export const getWaitlistAnalytics = async () => {
    try {
        const snapshot = await getDocs(waitlistCollection);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Calculate analytics
        const analytics = {
            totalCount: data.length,
            byCity: {},
            byService: {},
            byUrgency: {},
            byVehicleType: {},
            recentSignups: data
                .filter(item => {
                    const oneDayAgo = new Date();
                    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
                    return item.timestamp.toDate() > oneDayAgo;
                }).length
        };

        // Group by city
        data.forEach(item => {
            const city = item.city || 'Unknown';
            analytics.byCity[city] = (analytics.byCity[city] || 0) + 1;
        });

        // Group by services
        data.forEach(item => {
            if (item.servicesInterested) {
                item.servicesInterested.forEach(service => {
                    analytics.byService[service] = (analytics.byService[service] || 0) + 1;
                });
            }
        });

        // Group by urgency
        data.forEach(item => {
            const urgency = item.howSoon || 'Unknown';
            analytics.byUrgency[urgency] = (analytics.byUrgency[urgency] || 0) + 1;
        });

        // Group by vehicle type
        data.forEach(item => {
            const vehicleType = item.vehicleType || 'Unknown';
            analytics.byVehicleType[vehicleType] = (analytics.byVehicleType[vehicleType] || 0) + 1;
        });

        return analytics;
    } catch (error) {
        console.error('Error getting waitlist analytics:', error);
        return null;
    }
};

// Handle referral signup
export const addToWaitlistWithReferral = async (waitlistData, referralCode) => {
    try {
        // First, add the new signup
        const result = await addToWaitlist({
            ...waitlistData,
            referredBy: referralCode
        });

        if (result.success) {
            // Update the referrer's referral count
            await updateReferralCount(referralCode);
        }

        return result;
    } catch (error) {
        console.error('Error adding referral signup:', error);
        return { success: false, error: error.message };
    }
};

// Update referral count for a user
const updateReferralCount = async (referralCode) => {
    try {
        // Find the user who made the referral
        const q = query(waitlistCollection, where('referralCode', '==', referralCode));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            await updateDoc(doc(db, 'waitlist', userDoc.id), {
                referralCount: increment(1)
            });
        }
    } catch (error) {
        console.error('Error updating referral count:', error);
    }
};

// Generate a unique referral code
const generateReferralCode = (email) => {
    const username = email.split('@')[0];
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${username}${randomSuffix}`.toLowerCase();
};

// Get user's referral stats
export const getUserReferralStats = async (email) => {
    try {
        const q = query(waitlistCollection, where('email', '==', email));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const userData = snapshot.docs[0].data();
            return {
                referralCode: userData.referralCode,
                referralCount: userData.referralCount || 0,
                city: userData.city,
                signupDate: userData.timestamp
            };
        }

        return null;
    } catch (error) {
        console.error('Error getting user referral stats:', error);
        return null;
    }
};
