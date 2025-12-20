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
    orderBy,
    where,
    arrayUnion,
    arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import firebaseConfig from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let listsListener = null;
let sharedListsListener = null;
let showArchivedLists = false;

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

// Helper function to get list reference (works with both private and shared lists)
async function getListRef(listId) {
    if (!currentUser) throw new Error('Not authenticated');

    // Check if it's a shared list (starts with "shared_")
    if (listId.startsWith('shared_')) {
        return doc(db, 'sharedLists', listId);
    } else {
        return doc(db, 'users', currentUser.uid, 'lists', listId);
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

    const listRef = await getListRef(listId);

    await updateDoc(listRef, {
        ...updates,
        updatedAt: serverTimestamp()
    });
}

export async function deleteList(listId) {
    if (!currentUser) throw new Error('Not authenticated');

    const listRef = await getListRef(listId);
    await deleteDoc(listRef);
}

export async function archiveList(listId) {
    if (!currentUser) throw new Error('Not authenticated');

    const listRef = await getListRef(listId);
    await updateDoc(listRef, {
        archived: true,
        archivedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
}

export async function unarchiveList(listId) {
    if (!currentUser) throw new Error('Not authenticated');

    const listRef = await getListRef(listId);
    await updateDoc(listRef, {
        archived: false,
        archivedAt: null,
        updatedAt: serverTimestamp()
    });
}

export async function getList(listId) {
    if (!currentUser) throw new Error('Not authenticated');

    const listRef = await getListRef(listId);
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

// Real-time listener for lists (merges private and shared lists)
export function subscribeToLists(callback, includeArchived = false) {
    if (!currentUser) throw new Error('Not authenticated');

    // Unsubscribe from previous listeners if exist
    if (listsListener) {
        listsListener();
    }
    if (sharedListsListener) {
        sharedListsListener();
    }

    let privateLists = [];
    let sharedLists = [];

    // Helper to merge and callback
    const mergeAndCallback = () => {
        let allLists = [...privateLists, ...sharedLists];

        // Filter out archived lists unless includeArchived is true
        if (!includeArchived) {
            allLists = allLists.filter(list => !list.archived);
        }

        // Sort by order
        allLists.sort((a, b) => (a.order || 0) - (b.order || 0));
        callback(allLists);
    };

    // Listen to private lists
    const privateListsRef = collection(db, 'users', currentUser.uid, 'lists');
    const privateQuery = query(privateListsRef, orderBy('order', 'asc'));

    listsListener = onSnapshot(privateQuery, (snapshot) => {
        privateLists = [];
        snapshot.forEach((doc) => {
            privateLists.push(doc.data());
        });
        mergeAndCallback();
    }, (error) => {
        console.error('Error listening to private lists:', error);
    });

    // Listen to shared lists where user is a member
    const sharedListsRef = collection(db, 'sharedLists');
    const sharedQuery = query(sharedListsRef, where('sharedWith', 'array-contains', currentUser.uid));

    sharedListsListener = onSnapshot(sharedQuery, (snapshot) => {
        sharedLists = [];
        snapshot.forEach((doc) => {
            sharedLists.push(doc.data());
        });
        mergeAndCallback();
    }, (error) => {
        console.error('Error listening to shared lists:', error);
    });

    // Return cleanup function
    return () => {
        if (listsListener) listsListener();
        if (sharedListsListener) sharedListsListener();
    };
}

// Database Operations - Items

export async function addItem(listId, itemData) {
    if (!currentUser) throw new Error('Not authenticated');

    const listRef = await getListRef(listId);
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

    const listRef = await getListRef(listId);
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

    const listRef = await getListRef(listId);
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
    const fromListRef = await getListRef(fromListId);
    const toListRef = await getListRef(toListId);

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

    const listRef = await getListRef(listId);
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

    const listRef = await getListRef(listId);
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

    const listRef = await getListRef(listId);
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

    const listRef = await getListRef(listId);
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

// Shared Lists - Top-level collection for collaborative lists

export async function convertToSharedList(listId) {
    if (!currentUser) throw new Error('Not authenticated');

    // Get the private list
    const privateListRef = doc(db, 'users', currentUser.uid, 'lists', listId);
    const privateListSnap = await getDoc(privateListRef);

    if (!privateListSnap.exists()) {
        throw new Error('List not found');
    }

    const listData = privateListSnap.data();

    // Create shared list ID
    const sharedListId = `shared_${Date.now()}`;
    const sharedListRef = doc(db, 'sharedLists', sharedListId);

    // Create shared list with owner and permissions
    const sharedList = {
        ...listData,
        id: sharedListId,
        originalId: listId, // Keep reference to original
        isShared: true,
        owner: currentUser.uid,
        ownerEmail: currentUser.email,
        sharedWith: [currentUser.uid], // Owner is in the list
        permissions: {
            [currentUser.uid]: 'owner'
        },
        sharedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    // Save to shared collection and delete from private
    await Promise.all([
        setDoc(sharedListRef, sharedList),
        deleteDoc(privateListRef)
    ]);

    return sharedListId;
}

export async function joinSharedList(sharedListId) {
    if (!currentUser) throw new Error('Not authenticated');

    const sharedListRef = doc(db, 'sharedLists', sharedListId);
    const sharedListSnap = await getDoc(sharedListRef);

    if (!sharedListSnap.exists()) {
        throw new Error('Shared list not found');
    }

    const listData = sharedListSnap.data();

    // Check if already a member
    if (listData.sharedWith && listData.sharedWith.includes(currentUser.uid)) {
        throw new Error('You are already a member of this list');
    }

    // Add user to sharedWith array with edit permission
    const updatedSharedWith = [...(listData.sharedWith || []), currentUser.uid];
    const updatedPermissions = {
        ...listData.permissions,
        [currentUser.uid]: 'edit'
    };

    await updateDoc(sharedListRef, {
        sharedWith: updatedSharedWith,
        permissions: updatedPermissions,
        updatedAt: serverTimestamp()
    });

    return sharedListSnap.data();
}

export async function leaveSharedList(sharedListId) {
    if (!currentUser) throw new Error('Not authenticated');

    const sharedListRef = doc(db, 'sharedLists', sharedListId);
    const sharedListSnap = await getDoc(sharedListRef);

    if (!sharedListSnap.exists()) {
        throw new Error('Shared list not found');
    }

    const listData = sharedListSnap.data();

    // Can't leave if you're the owner
    if (listData.owner === currentUser.uid) {
        throw new Error('Owner cannot leave. Delete the list instead.');
    }

    // Remove user from sharedWith array
    const updatedSharedWith = listData.sharedWith.filter(uid => uid !== currentUser.uid);
    const updatedPermissions = { ...listData.permissions };
    delete updatedPermissions[currentUser.uid];

    await updateDoc(sharedListRef, {
        sharedWith: updatedSharedWith,
        permissions: updatedPermissions,
        updatedAt: serverTimestamp()
    });
}

// Helper to check if user can edit a shared list
export function canEditSharedList(list) {
    if (!currentUser || !list.isShared) return false;
    const permission = list.permissions?.[currentUser.uid];
    return permission === 'owner' || permission === 'edit';
}

// Cleanup
export function cleanup() {
    if (listsListener) {
        listsListener();
        listsListener = null;
    }
    if (sharedListsListener) {
        sharedListsListener();
        sharedListsListener = null;
    }
}
