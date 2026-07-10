// Firebase Service - Handles all Firebase operations
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp,
    query,
    orderBy
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import firebaseConfig from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let itemsListener = null;

// Authentication State Management
export function initAuth(onUserSignedIn, onUserSignedOut) {
    return onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            if (onUserSignedIn) onUserSignedIn(user);
        } else {
            currentUser = null;
            if (onUserSignedOut) onUserSignedOut();
        }
    });
}

export function getCurrentUser() {
    return currentUser;
}

export async function logout() {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

function itemsCollection() {
    if (!currentUser) throw new Error('Not authenticated');
    return collection(db, 'users', currentUser.uid, 'items');
}

// Database Operations - Items

export async function addItem({ text, comment = '' }) {
    if (!currentUser) throw new Error('Not authenticated');

    const itemId = `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const itemRef = doc(db, 'users', currentUser.uid, 'items', itemId);

    const newItem = {
        id: itemId,
        text,
        comment,
        completed: false,
        createdAt: Date.now(),
        updatedAt: serverTimestamp()
    };

    await setDoc(itemRef, newItem);
    return newItem;
}

export async function updateItem(itemId, updates) {
    if (!currentUser) throw new Error('Not authenticated');

    const itemRef = doc(db, 'users', currentUser.uid, 'items', itemId);
    await updateDoc(itemRef, {
        ...updates,
        updatedAt: serverTimestamp()
    });
}

export async function deleteItem(itemId) {
    if (!currentUser) throw new Error('Not authenticated');

    const itemRef = doc(db, 'users', currentUser.uid, 'items', itemId);
    await deleteDoc(itemRef);
}

// Real-time listener for items, newest first
export function subscribeToItems(callback) {
    if (!currentUser) throw new Error('Not authenticated');

    if (itemsListener) {
        itemsListener();
    }

    const q = query(itemsCollection(), orderBy('createdAt', 'desc'));

    itemsListener = onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
            items.push(docSnap.data());
        });
        callback(items);
    }, (error) => {
        console.error('Error listening to items:', error);
    });

    return () => {
        if (itemsListener) itemsListener();
    };
}

export async function clearCompletedItems(items) {
    if (!currentUser) throw new Error('Not authenticated');

    const completed = items.filter(item => item.completed);
    await Promise.all(completed.map(item => deleteItem(item.id)));
    return completed.length;
}

// Data Export/Import

export async function exportAllData() {
    if (!currentUser) throw new Error('Not authenticated');

    const q = query(itemsCollection(), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const items = [];
    snapshot.forEach((docSnap) => items.push(docSnap.data()));

    return {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        userEmail: currentUser.email,
        items
    };
}

export async function importData(data) {
    if (!currentUser) throw new Error('Not authenticated');

    if (!data.items || !Array.isArray(data.items)) {
        throw new Error('Invalid import data format');
    }

    await Promise.all(data.items.map(item => {
        const itemId = item.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const itemRef = doc(db, 'users', currentUser.uid, 'items', itemId);
        return setDoc(itemRef, {
            id: itemId,
            text: item.text || '',
            comment: item.comment || '',
            completed: !!item.completed,
            createdAt: item.createdAt || Date.now(),
            updatedAt: serverTimestamp()
        });
    }));
}

// Search

export function searchItems(items, searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    return items.filter(item =>
        item.text.toLowerCase().includes(term) ||
        (item.comment && item.comment.toLowerCase().includes(term))
    );
}

// One-time migration from the old lists+items model to the flat items collection.
// Old list documents are left in place untouched as a backup.
export async function migrateListsToFlatItems() {
    if (!currentUser) throw new Error('Not authenticated');

    const listsRef = collection(db, 'users', currentUser.uid, 'lists');
    const listsSnapshot = await getDocs(listsRef);

    if (listsSnapshot.empty) return 0;

    const writes = [];
    listsSnapshot.forEach((listDoc) => {
        const list = listDoc.data();
        (list.items || []).forEach((item) => {
            const itemId = item.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const itemRef = doc(db, 'users', currentUser.uid, 'items', itemId);
            writes.push(setDoc(itemRef, {
                id: itemId,
                text: item.text || '',
                comment: item.notes || '',
                completed: !!item.completed,
                createdAt: item.createdAt || Date.now(),
                updatedAt: serverTimestamp()
            }));
        });
    });

    await Promise.all(writes);
    return writes.length;
}

// Cleanup
export function cleanup() {
    if (itemsListener) {
        itemsListener();
        itemsListener = null;
    }
}
