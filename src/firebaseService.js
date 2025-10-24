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

