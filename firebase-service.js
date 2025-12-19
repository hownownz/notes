// Firebase Service - Handles all Firebase operations
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
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
let listsListener = null;

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

// Database Operations - Lists

export async function createList(listData) {
    if (!currentUser) throw new Error('Not authenticated');

    const listId = `list_${Date.now()}`;
    const listRef = doc(db, 'users', currentUser.uid, 'lists', listId);

    const newList = {
        id: listId,
        name: listData.name,
        icon: listData.icon || '📌',
        items: [],
        order: listData.order || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    await setDoc(listRef, newList);
    return newList;
}

export async function updateList(listId, updates) {
    if (!currentUser) throw new Error('Not authenticated');

    const listRef = doc(db, 'users', currentUser.uid, 'lists', listId);

    await updateDoc(listRef, {
        ...updates,
        updatedAt: serverTimestamp()
    });
}

export async function deleteList(listId) {
    if (!currentUser) throw new Error('Not authenticated');

    const listRef = doc(db, 'users', currentUser.uid, 'lists', listId);
    await deleteDoc(listRef);
}

export async function getList(listId) {
    if (!currentUser) throw new Error('Not authenticated');

    const listRef = doc(db, 'users', currentUser.uid, 'lists', listId);
    const listSnap = await getDoc(listRef);

    if (listSnap.exists()) {
        return listSnap.data();
    }
    return null;
}

export async function getAllLists() {
    if (!currentUser) throw new Error('Not authenticated');

    const listsRef = collection(db, 'users', currentUser.uid, 'lists');
    const q = query(listsRef, orderBy('order', 'asc'));
    const querySnapshot = await getDocs(q);

    const lists = [];
    querySnapshot.forEach((doc) => {
        lists.push(doc.data());
    });

    return lists;
}

// Real-time listener for lists
export function subscribeToLists(callback) {
    if (!currentUser) throw new Error('Not authenticated');

    // Unsubscribe from previous listener if exists
    if (listsListener) {
        listsListener();
    }

    const listsRef = collection(db, 'users', currentUser.uid, 'lists');
    const q = query(listsRef, orderBy('order', 'asc'));

    listsListener = onSnapshot(q, (snapshot) => {
        const lists = [];
        snapshot.forEach((doc) => {
            lists.push(doc.data());
        });
        callback(lists);
    }, (error) => {
        console.error('Error listening to lists:', error);
    });

    return listsListener;
}

// Database Operations - Items

export async function addItem(listId, itemData) {
    if (!currentUser) throw new Error('Not authenticated');

    const listRef = doc(db, 'users', currentUser.uid, 'lists', listId);
    const listSnap = await getDoc(listRef);

    if (!listSnap.exists()) {
        throw new Error('List not found');
    }

    const list = listSnap.data();
    const newItem = {
        id: `item_${Date.now()}`,
        text: itemData.text,
        completed: false,
        createdAt: Date.now(),
        order: list.items.length
    };

    const updatedItems = [...list.items, newItem];

    await updateDoc(listRef, {
        items: updatedItems,
        updatedAt: serverTimestamp()
    });

    return newItem;
}

export async function updateItem(listId, itemId, updates) {
    if (!currentUser) throw new Error('Not authenticated');

    const listRef = doc(db, 'users', currentUser.uid, 'lists', listId);
    const listSnap = await getDoc(listRef);

    if (!listSnap.exists()) {
        throw new Error('List not found');
    }

    const list = listSnap.data();
    const updatedItems = list.items.map(item => {
        if (item.id === itemId) {
            return { ...item, ...updates };
        }
        return item;
    });

    await updateDoc(listRef, {
        items: updatedItems,
        updatedAt: serverTimestamp()
    });
}

export async function deleteItem(listId, itemId) {
    if (!currentUser) throw new Error('Not authenticated');

    const listRef = doc(db, 'users', currentUser.uid, 'lists', listId);
    const listSnap = await getDoc(listRef);

    if (!listSnap.exists()) {
        throw new Error('List not found');
    }

    const list = listSnap.data();
    const updatedItems = list.items.filter(item => item.id !== itemId);

    await updateDoc(listRef, {
        items: updatedItems,
        updatedAt: serverTimestamp()
    });
}

export async function moveItem(fromListId, toListId, itemId) {
    if (!currentUser) throw new Error('Not authenticated');

    // Get both lists
    const fromListRef = doc(db, 'users', currentUser.uid, 'lists', fromListId);
    const toListRef = doc(db, 'users', currentUser.uid, 'lists', toListId);

    const [fromListSnap, toListSnap] = await Promise.all([
        getDoc(fromListRef),
        getDoc(toListRef)
    ]);

    if (!fromListSnap.exists() || !toListSnap.exists()) {
        throw new Error('List not found');
    }

    const fromList = fromListSnap.data();
    const toList = toListSnap.data();

    // Find the item to move
    const itemToMove = fromList.items.find(item => item.id === itemId);
    if (!itemToMove) {
        throw new Error('Item not found');
    }

    // Remove from source list
    const updatedFromItems = fromList.items.filter(item => item.id !== itemId);

    // Add to destination list
    const updatedToItems = [...toList.items, { ...itemToMove, order: toList.items.length }];

    // Update both lists
    await Promise.all([
        updateDoc(fromListRef, {
            items: updatedFromItems,
            updatedAt: serverTimestamp()
        }),
        updateDoc(toListRef, {
            items: updatedToItems,
            updatedAt: serverTimestamp()
        })
    ]);
}

export async function reorderItems(listId, itemsOrder) {
    if (!currentUser) throw new Error('Not authenticated');

    const listRef = doc(db, 'users', currentUser.uid, 'lists', listId);
    const listSnap = await getDoc(listRef);

    if (!listSnap.exists()) {
        throw new Error('List not found');
    }

    const list = listSnap.data();

    // Reorder items based on the provided order array
    const updatedItems = itemsOrder.map((itemId, index) => {
        const item = list.items.find(i => i.id === itemId);
        return { ...item, order: index };
    });

    await updateDoc(listRef, {
        items: updatedItems,
        updatedAt: serverTimestamp()
    });
}

export async function reorderLists(listsOrder) {
    if (!currentUser) throw new Error('Not authenticated');

    // Update order for each list
    const updatePromises = listsOrder.map((listId, index) => {
        const listRef = doc(db, 'users', currentUser.uid, 'lists', listId);
        return updateDoc(listRef, {
            order: index,
            updatedAt: serverTimestamp()
        });
    });

    await Promise.all(updatePromises);
}

// Bulk Operations

export async function toggleItemsCompletion(listId, itemIds, completed) {
    if (!currentUser) throw new Error('Not authenticated');

    const listRef = doc(db, 'users', currentUser.uid, 'lists', listId);
    const listSnap = await getDoc(listRef);

    if (!listSnap.exists()) {
        throw new Error('List not found');
    }

    const list = listSnap.data();
    const updatedItems = list.items.map(item => {
        if (itemIds.includes(item.id)) {
            return { ...item, completed };
        }
        return item;
    });

    await updateDoc(listRef, {
        items: updatedItems,
        updatedAt: serverTimestamp()
    });
}

export async function deleteItems(listId, itemIds) {
    if (!currentUser) throw new Error('Not authenticated');

    const listRef = doc(db, 'users', currentUser.uid, 'lists', listId);
    const listSnap = await getDoc(listRef);

    if (!listSnap.exists()) {
        throw new Error('List not found');
    }

    const list = listSnap.data();
    const updatedItems = list.items.filter(item => !itemIds.includes(item.id));

    await updateDoc(listRef, {
        items: updatedItems,
        updatedAt: serverTimestamp()
    });
}

export async function clearCompletedItems(listId) {
    if (!currentUser) throw new Error('Not authenticated');

    const listRef = doc(db, 'users', currentUser.uid, 'lists', listId);
    const listSnap = await getDoc(listRef);

    if (!listSnap.exists()) {
        throw new Error('List not found');
    }

    const list = listSnap.data();
    const updatedItems = list.items.filter(item => !item.completed);

    await updateDoc(listRef, {
        items: updatedItems,
        updatedAt: serverTimestamp()
    });
}

export async function clearAllCompletedItems() {
    if (!currentUser) throw new Error('Not authenticated');

    const lists = await getAllLists();
    const updatePromises = lists.map(list => {
        if (list.items.some(item => item.completed)) {
            return clearCompletedItems(list.id);
        }
    });

    await Promise.all(updatePromises.filter(Boolean));
}

// Data Export/Import

export async function exportAllData() {
    if (!currentUser) throw new Error('Not authenticated');

    const lists = await getAllLists();

    const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        userId: currentUser.uid,
        userEmail: currentUser.email,
        lists: lists
    };

    return exportData;
}

export async function importData(importData) {
    if (!currentUser) throw new Error('Not authenticated');

    if (!importData.lists || !Array.isArray(importData.lists)) {
        throw new Error('Invalid import data format');
    }

    // Import each list
    const importPromises = importData.lists.map(list => {
        const listRef = doc(db, 'users', currentUser.uid, 'lists', list.id);
        return setDoc(listRef, {
            ...list,
            updatedAt: serverTimestamp()
        });
    });

    await Promise.all(importPromises);
}

// Search

export function searchAllLists(lists, searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const results = [];

    lists.forEach(list => {
        list.items.forEach(item => {
            if (item.text.toLowerCase().includes(term)) {
                results.push({
                    listId: list.id,
                    listName: list.name,
                    listIcon: list.icon,
                    item: item
                });
            }
        });
    });

    return results;
}

// Cleanup
export function cleanup() {
    if (listsListener) {
        listsListener();
        listsListener = null;
    }
}
