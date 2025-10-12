import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
    apiKey: "AIzaSyASX7OPJWNJv5XpyMpfkkhSsC-QgGiRCQU",
    authDomain: "brnno-enterprises.firebaseapp.com",
    projectId: "brnno-enterprises",
    storageBucket: "brnno-enterprises.firebasestorage.app",
    messagingSenderId: "475634309916",
    appId: "1:475634309916:web:a71bfbcebea0052843f8d9",
    measurementId: "G-R4JR0SB9SX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;
