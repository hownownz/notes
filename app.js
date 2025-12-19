// Main App Logic
import * as FirebaseService from './firebase-service.js';

// State
let currentLists = [];
let currentEditingList = null;
let currentEditingItem = null;
let currentItemListId = null;
let collapsedLists = new Set();
let selectedItems = new Map(); // Map of listId -> Set of itemIds
let listFilters = new Map(); // Map of listId -> filter type ('all', 'incomplete', 'completed')
let isSelectionMode = false; // Whether we're in selection mode for bulk actions
let draggedElement = null;
let draggedItemId = null;
let draggedListId = null;

// DOM Elements
const loadingIndicator = document.getElementById('loadingIndicator');
const listsContainer = document.getElementById('listsContainer');
const quickAddInput = document.getElementById('quickAddInput');
const listSelector = document.getElementById('listSelector');
const addItemBtn = document.getElementById('addItemBtn');
const createListBtn = document.getElementById('createListBtn');
const searchBtn = document.getElementById('searchBtn');
const selectionModeBtn = document.getElementById('selectionModeBtn');
const darkModeBtn = document.getElementById('darkModeBtn');
const settingsBtn = document.getElementById('settingsBtn');
const logoutBtn = document.getElementById('logoutBtn');
const searchSection = document.getElementById('searchSection');
const searchInput = document.getElementById('searchInput');
const closeSearchBtn = document.getElementById('closeSearchBtn');
const searchResults = document.getElementById('searchResults');
const toast = document.getElementById('toast');

// Bulk Actions
const bulkActionsBar = document.getElementById('bulkActionsBar');
const selectedCount = document.getElementById('selectedCount');
const bulkCompleteBtn = document.getElementById('bulkCompleteBtn');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
const bulkMoveBtn = document.getElementById('bulkMoveBtn');
const cancelBulkBtn = document.getElementById('cancelBulkBtn');

// Modals
const listModal = document.getElementById('listModal');
const listModalTitle = document.getElementById('listModalTitle');
const listNameInput = document.getElementById('listNameInput');
const listIconInput = document.getElementById('listIconInput');
const listColorInput = document.getElementById('listColorInput');
const saveListBtn = document.getElementById('saveListBtn');
const cancelListBtn = document.getElementById('cancelListBtn');

const editItemModal = document.getElementById('editItemModal');
const editItemInput = document.getElementById('editItemInput');
const editItemNotes = document.getElementById('editItemNotes');
const moveToListSelect = document.getElementById('moveToListSelect');
const saveEditItemBtn = document.getElementById('saveEditItemBtn');
const cancelEditItemBtn = document.getElementById('cancelEditItemBtn');

const settingsModal = document.getElementById('settingsModal');
const userEmail = document.getElementById('userEmail');
const exportDataBtn = document.getElementById('exportDataBtn');
const importDataBtn = document.getElementById('importDataBtn');
const importFileInput = document.getElementById('importFileInput');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// Initialize App
FirebaseService.initAuth(
    (user) => {
        // User signed in
        console.log('User signed in:', user.email);
        userEmail.textContent = user.email;
        initializeApp();
    },
    () => {
        // User signed out
        window.location.href = 'login.html';
    }
);

function initializeApp() {
    hideLoading();
    setupEventListeners();
    subscribeToLists();

    // Load collapsed state from localStorage
    const savedCollapsed = localStorage.getItem('collapsedLists');
    if (savedCollapsed) {
        collapsedLists = new Set(JSON.parse(savedCollapsed));
    }

    // Initialize dark mode
    initializeDarkMode();
}

function initializeDarkMode() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        darkModeBtn.textContent = '☀️';
        darkModeBtn.title = 'Toggle Light Mode';
    }
}

function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');

    if (currentTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        darkModeBtn.textContent = '🌙';
        darkModeBtn.title = 'Toggle Dark Mode';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        darkModeBtn.textContent = '☀️';
        darkModeBtn.title = 'Toggle Light Mode';
    }
}

function setupEventListeners() {
    // Quick Add
    addItemBtn.addEventListener('click', handleQuickAdd);
    quickAddInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleQuickAdd();
    });

    // Create List
    createListBtn.addEventListener('click', () => openCreateListModal());

    // Search
    searchBtn.addEventListener('click', toggleSearch);
    closeSearchBtn.addEventListener('click', toggleSearch);
    searchInput.addEventListener('input', handleSearch);

    // Selection Mode
    selectionModeBtn.addEventListener('click', toggleSelectionMode);

    // Dark Mode
    darkModeBtn.addEventListener('click', toggleDarkMode);

    // Settings
    settingsBtn.addEventListener('click', () => openModal(settingsModal));
    exportDataBtn.addEventListener('click', handleExportData);
    importDataBtn.addEventListener('click', handleImportData);
    importFileInput.addEventListener('change', handleImportFileSelected);
    clearCompletedBtn.addEventListener('click', handleClearAllCompleted);

    // Logout
    logoutBtn.addEventListener('click', handleLogout);

    // Bulk Actions
    bulkCompleteBtn.addEventListener('click', handleBulkComplete);
    bulkDeleteBtn.addEventListener('click', handleBulkDelete);
    bulkMoveBtn.addEventListener('click', handleBulkMove);
    cancelBulkBtn.addEventListener('click', clearSelection);

    // List Modal
    saveListBtn.addEventListener('click', handleSaveList);
    cancelListBtn.addEventListener('click', () => closeModal(listModal));

    // Edit Item Modal
    saveEditItemBtn.addEventListener('click', handleSaveEditItem);
    cancelEditItemBtn.addEventListener('click', () => closeModal(editItemModal));

    // Close modals with X button
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal);
        });
    });

    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Check if user is typing in an input/textarea
        const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

        // Ctrl/Cmd + N: Create new list
        if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !isTyping) {
            e.preventDefault();
            openCreateListModal();
        }

        // Ctrl/Cmd + F: Open search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            if (searchSection.style.display === 'none') {
                toggleSearch();
            } else {
                searchInput.focus();
            }
        }

        // Ctrl/Cmd + E: Export data
        if ((e.ctrlKey || e.metaKey) && e.key === 'e' && !isTyping) {
            e.preventDefault();
            handleExportData();
        }

        // Escape: Close modals/search
        if (e.key === 'Escape') {
            // Close any open modal
            if (listModal.classList.contains('active')) {
                closeModal(listModal);
            } else if (editItemModal.classList.contains('active')) {
                closeModal(editItemModal);
            } else if (settingsModal.classList.contains('active')) {
                closeModal(settingsModal);
            } else if (searchSection.style.display !== 'none') {
                toggleSearch();
            }
        }

        // Ctrl/Cmd + K: Focus quick-add input
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            quickAddInput.focus();
        }
    });
}

// Firebase Listeners
function subscribeToLists() {
    FirebaseService.subscribeToLists((lists) => {
        currentLists = lists;
        renderLists();
        updateListSelector();
    });
}

// Rendering
function renderLists() {
    if (currentLists.length === 0) {
        renderNoListsState();
        return;
    }

    listsContainer.innerHTML = '';

    currentLists.forEach(list => {
        const listCard = createListCard(list);
        listsContainer.appendChild(listCard);
    });

    // Reapply drag and drop
    setupDragAndDrop();
}

function renderNoListsState() {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');

    listsContainer.innerHTML = `
        <div class="no-lists-state">
            <div class="no-lists-state-icon">📝</div>
            <h2>${hasSeenWelcome ? 'No Lists Yet' : 'Welcome to Quick Capture!'}</h2>
            <p>${hasSeenWelcome ? 'Create your first list to get started!' : 'Organize your tasks, shopping, and ideas with fast, simple lists.'}</p>
            ${!hasSeenWelcome ? `
                <div class="welcome-actions">
                    <button id="createSampleListsBtn" class="btn-primary" style="margin: 20px auto; display: block;">
                        Create Sample Lists
                    </button>
                    <button id="skipWelcomeBtn" class="btn-secondary" style="margin: 10px auto; display: block;">
                        Start from Scratch
                    </button>
                </div>
            ` : ''}
        </div>
    `;

    if (!hasSeenWelcome) {
        document.getElementById('createSampleListsBtn')?.addEventListener('click', createSampleLists);
        document.getElementById('skipWelcomeBtn')?.addEventListener('click', () => {
            localStorage.setItem('hasSeenWelcome', 'true');
            renderLists();
        });
    }
}

async function createSampleLists() {
    try {
        const sampleLists = [
            { name: 'Shopping', icon: '🛒', color: '#10b981', items: ['Milk', 'Bread', 'Eggs'] },
            { name: 'Home Tasks', icon: '🏠', color: '#3b82f6', items: ['Clean kitchen', 'Water plants'] },
            { name: 'Ideas', icon: '💡', color: '#f59e0b', items: ['Weekend project ideas'] }
        ];

        for (let i = 0; i < sampleLists.length; i++) {
            const sampleList = sampleLists[i];
            await FirebaseService.createList({
                name: sampleList.name,
                icon: sampleList.icon,
                color: sampleList.color,
                order: i
            });

            // Wait for list to be created then add items
            await new Promise(resolve => setTimeout(resolve, 500));

            // Get the created list ID
            const lists = await FirebaseService.getAllLists();
            const createdList = lists.find(l => l.name === sampleList.name);

            if (createdList && sampleList.items) {
                for (const itemText of sampleList.items) {
                    await FirebaseService.addItem(createdList.id, { text: itemText });
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
        }

        localStorage.setItem('hasSeenWelcome', 'true');
        showToast('Sample lists created!', 'success');
    } catch (error) {
        console.error('Error creating sample lists:', error);
        showToast('Failed to create sample lists', 'error');
    }
}

function createListCard(list) {
    const isCollapsed = collapsedLists.has(list.id);
    const completedCount = list.items.filter(item => item.completed).length;
    const totalCount = list.items.length;

    const card = document.createElement('div');
    card.className = `list-card ${isCollapsed ? 'collapsed' : ''}`;
    card.dataset.listId = list.id;

    // Apply color if set
    if (list.color) {
        card.style.borderLeftColor = list.color;
        card.style.borderLeftWidth = '4px';
    }

    card.innerHTML = `
        <div class="list-header" data-list-id="${list.id}">
            <div class="list-header-left">
                <span class="list-icon">${list.icon}</span>
                <div class="list-title-container">
                    <div class="list-title">${escapeHtml(list.name)}</div>
                    <div class="list-count">${completedCount}/${totalCount} completed</div>
                </div>
            </div>
            <div class="list-header-right">
                <div class="list-actions">
                    <button class="list-action-btn filter" data-action="cycle-filter" title="Filter: All">🔽</button>
                    <button class="list-action-btn edit" data-action="edit-list" title="Edit list">✏️</button>
                    <button class="list-action-btn delete" data-action="delete-list" title="Delete list">🗑️</button>
                </div>
                <span class="collapse-icon">▼</span>
            </div>
        </div>
        <div class="list-items" data-list-id="${list.id}">
            ${list.items.length === 0 ? renderEmptyListState() : renderItems(list.items, list.id)}
        </div>
    `;

    // Event Listeners for List Card
    const header = card.querySelector('.list-header');
    header.addEventListener('click', (e) => {
        // Don't collapse if clicking on action buttons
        if (e.target.closest('.list-action-btn')) return;
        toggleListCollapse(list.id);
    });

    // Cycle Filter
    card.querySelector('[data-action="cycle-filter"]').addEventListener('click', (e) => {
        e.stopPropagation();
        cycleListFilter(list.id);
    });

    // Edit List
    card.querySelector('[data-action="edit-list"]').addEventListener('click', (e) => {
        e.stopPropagation();
        openEditListModal(list);
    });

    // Delete List
    card.querySelector('[data-action="delete-list"]').addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteList(list.id, list.name);
    });

    return card;
}

function cycleListFilter(listId) {
    const currentFilter = listFilters.get(listId) || 'all';
    const filters = ['all', 'incomplete', 'completed'];
    const currentIndex = filters.indexOf(currentFilter);
    const nextIndex = (currentIndex + 1) % filters.length;
    const nextFilter = filters[nextIndex];

    listFilters.set(listId, nextFilter);
    renderLists();

    const filterLabels = { 'all': 'All', 'incomplete': 'Incomplete', 'completed': 'Completed' };
    showToast(`Filter: ${filterLabels[nextFilter]}`, 'success');
}

function renderEmptyListState() {
    return '<div class="empty-list">No items yet. Add one above!</div>';
}

function renderItems(items, listId) {
    // Get filter for this list
    const filter = listFilters.get(listId) || 'all';

    // Filter items based on filter setting
    let filteredItems = items;
    if (filter === 'incomplete') {
        filteredItems = items.filter(item => !item.completed);
    } else if (filter === 'completed') {
        filteredItems = items.filter(item => item.completed);
    }

    // Sort items by order
    const sortedItems = [...filteredItems].sort((a, b) => a.order - b.order);

    return sortedItems.map(item => {
        const isSelected = selectedItems.get(listId)?.has(item.id) || false;
        const hasNotes = item.notes && item.notes.trim().length > 0;
        return `
        <div class="list-item ${item.completed ? 'completed' : ''} ${isSelected ? 'selected' : ''} ${isSelectionMode ? 'selection-mode' : ''}"
             data-item-id="${item.id}"
             data-list-id="${listId}"
             draggable="true">
            ${isSelectionMode ? `<input type="checkbox" class="item-select-checkbox" data-action="select-item" ${isSelected ? 'checked' : ''}>` : ''}
            <div class="item-checkbox" data-action="toggle-item"></div>
            <div class="item-text" data-action="${isSelectionMode ? 'select-item' : 'toggle-item'}">
                ${escapeHtml(item.text)}
                ${hasNotes ? '<span class="has-notes-indicator" title="Has notes">📝</span>' : ''}
            </div>
            <div class="item-actions">
                <button class="item-action-btn" data-action="edit-item" title="Edit">✏️</button>
                <button class="item-action-btn delete" data-action="delete-item" title="Delete">✕</button>
            </div>
        </div>
    `;
    }).join('');
}

function updateListSelector() {
    const currentValue = listSelector.value;

    listSelector.innerHTML = '<option value="">Select list...</option>';

    currentLists.forEach(list => {
        const option = document.createElement('option');
        option.value = list.id;
        option.textContent = `${list.icon} ${list.name}`;
        listSelector.appendChild(option);
    });

    // Restore selection if still valid
    if (currentValue && currentLists.some(l => l.id === currentValue)) {
        listSelector.value = currentValue;
    }

    // Update move-to list selector in edit modal
    moveToListSelect.innerHTML = '';
    currentLists.forEach(list => {
        const option = document.createElement('option');
        option.value = list.id;
        option.textContent = `${list.icon} ${list.name}`;
        moveToListSelect.appendChild(option);
    });
}

// Quick Add
async function handleQuickAdd() {
    const text = quickAddInput.value.trim();
    const listId = listSelector.value;

    if (!text) {
        showToast('Please enter item text', 'warning');
        return;
    }

    if (!listId) {
        showToast('Please select a list', 'warning');
        return;
    }

    try {
        await FirebaseService.addItem(listId, { text });
        quickAddInput.value = '';
        quickAddInput.focus();
        showToast('Item added!', 'success');
    } catch (error) {
        console.error('Error adding item:', error);
        showToast('Failed to add item', 'error');
    }
}

// List Management
function openCreateListModal() {
    currentEditingList = null;
    listModalTitle.textContent = 'Create New List';
    listNameInput.value = '';
    listIconInput.value = '📌';
    listColorInput.value = '#3b82f6';
    openModal(listModal);
    listNameInput.focus();
}

function openEditListModal(list) {
    currentEditingList = list;
    listModalTitle.textContent = 'Edit List';
    listNameInput.value = list.name;
    listIconInput.value = list.icon;
    listColorInput.value = list.color || '#3b82f6';
    openModal(listModal);
    listNameInput.focus();
}

async function handleSaveList() {
    const name = listNameInput.value.trim();
    const icon = listIconInput.value.trim() || '📌';
    const color = listColorInput.value;

    if (!name) {
        showToast('Please enter a list name', 'warning');
        return;
    }

    try {
        if (currentEditingList) {
            // Update existing list
            await FirebaseService.updateList(currentEditingList.id, { name, icon, color });
            showToast('List updated!', 'success');
        } else {
            // Create new list
            await FirebaseService.createList({
                name,
                icon,
                color,
                order: currentLists.length
            });
            showToast('List created!', 'success');
        }

        closeModal(listModal);
    } catch (error) {
        console.error('Error saving list:', error);
        showToast('Failed to save list', 'error');
    }
}

async function handleDeleteList(listId, listName) {
    const confirmed = confirm(`Are you sure you want to delete "${listName}"? All items will be lost.`);
    if (!confirmed) return;

    try {
        await FirebaseService.deleteList(listId);
        collapsedLists.delete(listId);
        saveCollapsedState();
        showToast('List deleted', 'success');
    } catch (error) {
        console.error('Error deleting list:', error);
        showToast('Failed to delete list', 'error');
    }
}

// Item Management
async function handleToggleItem(listId, itemId) {
    const list = currentLists.find(l => l.id === listId);
    if (!list) return;

    const item = list.items.find(i => i.id === itemId);
    if (!item) return;

    try {
        await FirebaseService.updateItem(listId, itemId, {
            completed: !item.completed
        });
    } catch (error) {
        console.error('Error toggling item:', error);
        showToast('Failed to update item', 'error');
    }
}

function openEditItemModal(listId, itemId) {
    const list = currentLists.find(l => l.id === listId);
    if (!list) return;

    const item = list.items.find(i => i.id === itemId);
    if (!item) return;

    currentEditingItem = item;
    currentItemListId = listId;

    editItemInput.value = item.text;
    editItemNotes.value = item.notes || '';
    moveToListSelect.value = listId;

    openModal(editItemModal);
    editItemInput.focus();
}

async function handleSaveEditItem() {
    const newText = editItemInput.value.trim();
    const newNotes = editItemNotes.value.trim();
    const newListId = moveToListSelect.value;

    if (!newText) {
        showToast('Please enter item text', 'warning');
        return;
    }

    try {
        // Check if moving to different list
        if (newListId !== currentItemListId) {
            // Update text and notes first, then move
            await FirebaseService.updateItem(currentItemListId, currentEditingItem.id, { text: newText, notes: newNotes });
            await FirebaseService.moveItem(currentItemListId, newListId, currentEditingItem.id);
            showToast('Item moved and updated!', 'success');
        } else {
            // Just update text and notes
            await FirebaseService.updateItem(currentItemListId, currentEditingItem.id, { text: newText, notes: newNotes });
            showToast('Item updated!', 'success');
        }

        closeModal(editItemModal);
    } catch (error) {
        console.error('Error saving item:', error);
        showToast('Failed to save item', 'error');
    }
}

async function handleDeleteItem(listId, itemId) {
    try {
        await FirebaseService.deleteItem(listId, itemId);
        showToast('Item deleted', 'success');
    } catch (error) {
        console.error('Error deleting item:', error);
        showToast('Failed to delete item', 'error');
    }
}

// Bulk Selection and Actions
function handleSelectItem(listId, itemId) {
    if (!selectedItems.has(listId)) {
        selectedItems.set(listId, new Set());
    }

    const itemSet = selectedItems.get(listId);
    if (itemSet.has(itemId)) {
        itemSet.delete(itemId);
        if (itemSet.size === 0) {
            selectedItems.delete(listId);
        }
    } else {
        itemSet.add(itemId);
    }

    updateBulkActionsBar();
    renderLists();
}

function updateBulkActionsBar() {
    const totalSelected = Array.from(selectedItems.values())
        .reduce((sum, set) => sum + set.size, 0);

    if (totalSelected > 0) {
        bulkActionsBar.style.display = 'flex';
        selectedCount.textContent = `${totalSelected} selected`;
    } else {
        bulkActionsBar.style.display = 'none';
    }
}

function toggleSelectionMode() {
    isSelectionMode = !isSelectionMode;

    if (!isSelectionMode) {
        // Exiting selection mode, clear selections
        selectedItems.clear();
    }

    updateBulkActionsBar();
    updateSelectionModeButton();
    renderLists();
}

function updateSelectionModeButton() {
    if (isSelectionMode) {
        selectionModeBtn.style.background = 'var(--primary-color)';
        selectionModeBtn.style.color = 'white';
        selectionModeBtn.title = 'Exit Selection Mode';
    } else {
        selectionModeBtn.style.background = '';
        selectionModeBtn.style.color = '';
        selectionModeBtn.title = 'Selection Mode';
    }
}

function clearSelection() {
    selectedItems.clear();
    isSelectionMode = false;
    updateBulkActionsBar();
    updateSelectionModeButton();
    renderLists();
}

async function handleBulkComplete() {
    try {
        const promises = [];
        for (const [listId, itemIds] of selectedItems.entries()) {
            promises.push(FirebaseService.toggleItemsCompletion(listId, Array.from(itemIds), true));
        }
        await Promise.all(promises);
        clearSelection();
        showToast('Items completed!', 'success');
    } catch (error) {
        console.error('Error completing items:', error);
        showToast('Failed to complete items', 'error');
    }
}

async function handleBulkDelete() {
    const totalSelected = Array.from(selectedItems.values())
        .reduce((sum, set) => sum + set.size, 0);

    const confirmed = confirm(`Delete ${totalSelected} selected item(s)?`);
    if (!confirmed) return;

    try {
        const promises = [];
        for (const [listId, itemIds] of selectedItems.entries()) {
            promises.push(FirebaseService.deleteItems(listId, Array.from(itemIds)));
        }
        await Promise.all(promises);
        clearSelection();
        showToast('Items deleted!', 'success');
    } catch (error) {
        console.error('Error deleting items:', error);
        showToast('Failed to delete items', 'error');
    }
}

async function handleBulkMove() {
    // For bulk move, we need to show a list selector
    const targetListId = prompt('Enter destination list ID (feature to be enhanced with modal)');
    if (!targetListId) return;

    showToast('Bulk move feature coming soon! Use edit modal for now.', 'warning');
}

// Event Delegation for Dynamic Elements
listsContainer.addEventListener('click', (e) => {
    const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    const listItem = e.target.closest('.list-item');
    if (!listItem) return;

    const itemId = listItem.dataset.itemId;
    const listId = listItem.dataset.listId;

    switch (action) {
        case 'select-item':
            handleSelectItem(listId, itemId);
            break;
        case 'toggle-item':
            handleToggleItem(listId, itemId);
            break;
        case 'edit-item':
            openEditItemModal(listId, itemId);
            break;
        case 'delete-item':
            handleDeleteItem(listId, itemId);
            break;
    }
});

// Collapsible Lists
function toggleListCollapse(listId) {
    if (collapsedLists.has(listId)) {
        collapsedLists.delete(listId);
    } else {
        collapsedLists.add(listId);
    }

    saveCollapsedState();

    const card = document.querySelector(`[data-list-id="${listId}"].list-card`);
    if (card) {
        card.classList.toggle('collapsed');
    }
}

function saveCollapsedState() {
    localStorage.setItem('collapsedLists', JSON.stringify([...collapsedLists]));
}

// Drag and Drop
function setupDragAndDrop() {
    // Items drag and drop
    const items = document.querySelectorAll('.list-item');
    items.forEach(item => {
        item.addEventListener('dragstart', handleItemDragStart);
        item.addEventListener('dragend', handleItemDragEnd);
        item.addEventListener('dragover', handleItemDragOver);
        item.addEventListener('drop', handleItemDrop);
    });

    // Allow dropping on list containers for cross-list moves
    const listContainers = document.querySelectorAll('.list-items');
    listContainers.forEach(container => {
        container.addEventListener('dragover', handleListDragOver);
        container.addEventListener('drop', handleListDrop);
        container.addEventListener('dragleave', handleListDragLeave);
    });

    // List cards drag and drop for reordering
    const listCards = document.querySelectorAll('.list-card');
    listCards.forEach((card, index) => {
        card.setAttribute('draggable', 'true');
        card.addEventListener('dragstart', handleListCardDragStart);
        card.addEventListener('dragend', handleListCardDragEnd);
        card.addEventListener('dragover', handleListCardDragOver);
        card.addEventListener('drop', handleListCardDrop);
    });
}

function handleItemDragStart(e) {
    draggedElement = e.target;
    draggedItemId = e.target.dataset.itemId;
    draggedListId = e.target.dataset.listId;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleItemDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });
}

function handleItemDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const targetItem = e.target.closest('.list-item');
    if (targetItem && targetItem !== draggedElement) {
        targetItem.classList.add('drag-over');
    }
}

async function handleItemDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    const targetItem = e.target.closest('.list-item');
    if (!targetItem || targetItem === draggedElement) return;

    const targetItemId = targetItem.dataset.itemId;
    const targetListId = targetItem.dataset.listId;

    targetItem.classList.remove('drag-over');

    // Same list - reorder
    if (draggedListId === targetListId) {
        const list = currentLists.find(l => l.id === draggedListId);
        if (!list) return;

        const draggedIndex = list.items.findIndex(i => i.id === draggedItemId);
        const targetIndex = list.items.findIndex(i => i.id === targetItemId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        // Reorder array
        const items = [...list.items];
        const [removed] = items.splice(draggedIndex, 1);
        items.splice(targetIndex, 0, removed);

        try {
            await FirebaseService.reorderItems(draggedListId, items.map(i => i.id));
        } catch (error) {
            console.error('Error reordering items:', error);
            showToast('Failed to reorder items', 'error');
        }
    } else {
        // Different list - move item
        try {
            await FirebaseService.moveItem(draggedListId, targetListId, draggedItemId);
            showToast('Item moved!', 'success');
        } catch (error) {
            console.error('Error moving item:', error);
            showToast('Failed to move item', 'error');
        }
    }
}

function handleListDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const listContainer = e.currentTarget;
    listContainer.classList.add('drag-over-list');
}

function handleListDragLeave(e) {
    const listContainer = e.currentTarget;
    // Only remove if leaving the container, not entering a child
    if (!listContainer.contains(e.relatedTarget)) {
        listContainer.classList.remove('drag-over-list');
    }
}

async function handleListDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    const listContainer = e.currentTarget;
    const targetListId = listContainer.dataset.listId;

    listContainer.classList.remove('drag-over-list');

    if (!draggedItemId || !draggedListId || !targetListId) return;

    // Don't do anything if dropping on same list
    if (draggedListId === targetListId) return;

    // Move item to the target list
    try {
        await FirebaseService.moveItem(draggedListId, targetListId, draggedItemId);
        showToast('Item moved!', 'success');
    } catch (error) {
        console.error('Error moving item:', error);
        showToast('Failed to move item', 'error');
    }
}

// List Card Drag and Drop for Reordering
let draggedListCard = null;
let draggedListCardId = null;

function handleListCardDragStart(e) {
    // Don't drag if clicking on buttons
    if (e.target.closest('button') || e.target.closest('input')) {
        e.preventDefault();
        return;
    }

    draggedListCard = e.currentTarget;
    draggedListCardId = e.currentTarget.dataset.listId;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleListCardDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.list-card').forEach(card => {
        card.classList.remove('drag-over');
    });
}

function handleListCardDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const targetCard = e.currentTarget;
    if (targetCard !== draggedListCard) {
        targetCard.classList.add('drag-over');
    }
}

async function handleListCardDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    const targetCard = e.currentTarget;
    const targetListId = targetCard.dataset.listId;

    targetCard.classList.remove('drag-over');

    if (!draggedListCardId || !targetListId || draggedListCardId === targetListId) return;

    // Find indices
    const draggedIndex = currentLists.findIndex(l => l.id === draggedListCardId);
    const targetIndex = currentLists.findIndex(l => l.id === targetListId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder array
    const reorderedLists = [...currentLists];
    const [removed] = reorderedLists.splice(draggedIndex, 1);
    reorderedLists.splice(targetIndex, 0, removed);

    try {
        await FirebaseService.reorderLists(reorderedLists.map(l => l.id));
        showToast('Lists reordered!', 'success');
    } catch (error) {
        console.error('Error reordering lists:', error);
        showToast('Failed to reorder lists', 'error');
    }
}

// Search
function toggleSearch() {
    const isVisible = searchSection.style.display !== 'none';

    if (isVisible) {
        searchSection.style.display = 'none';
        searchInput.value = '';
        searchResults.innerHTML = '';
    } else {
        searchSection.style.display = 'block';
        searchInput.focus();
    }
}

function handleSearch() {
    const searchTerm = searchInput.value.trim();

    if (!searchTerm) {
        searchResults.innerHTML = '';
        return;
    }

    const results = FirebaseService.searchAllLists(currentLists, searchTerm);

    if (results.length === 0) {
        searchResults.innerHTML = '<div class="empty-list">No items found</div>';
        return;
    }

    searchResults.innerHTML = results.map(result => `
        <div class="search-result-item" data-list-id="${result.listId}" data-item-id="${result.item.id}">
            <div class="search-result-list">${result.listIcon} ${result.listName}</div>
            <div class="search-result-text">${escapeHtml(result.item.text)}</div>
        </div>
    `).join('');

    // Add click handlers
    searchResults.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', () => {
            const listId = el.dataset.listId;
            // Expand the list if collapsed
            collapsedLists.delete(listId);
            saveCollapsedState();
            renderLists();
            toggleSearch();

            // Scroll to item (optional enhancement)
            setTimeout(() => {
                const itemEl = document.querySelector(`[data-item-id="${el.dataset.itemId}"]`);
                if (itemEl) {
                    itemEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    itemEl.style.background = 'var(--warning-color)';
                    setTimeout(() => {
                        itemEl.style.background = '';
                    }, 1000);
                }
            }, 300);
        });
    });
}

// Settings Actions
async function handleExportData() {
    try {
        const data = await FirebaseService.exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quick-capture-lists-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Data exported!', 'success');
    } catch (error) {
        console.error('Error exporting data:', error);
        showToast('Failed to export data', 'error');
    }
}

function handleImportData() {
    importFileInput.click();
}

async function handleImportFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Validate data format
        if (!data.lists || !Array.isArray(data.lists)) {
            showToast('Invalid data format', 'error');
            return;
        }

        const confirmed = confirm(
            `This will import ${data.lists.length} list(s). ` +
            'This will merge with your existing lists. Continue?'
        );

        if (!confirmed) {
            importFileInput.value = '';
            return;
        }

        await FirebaseService.importData(data);
        showToast('Data imported successfully!', 'success');
        importFileInput.value = '';
    } catch (error) {
        console.error('Error importing data:', error);
        showToast('Failed to import data. Please check the file format.', 'error');
        importFileInput.value = '';
    }
}

async function handleClearAllCompleted() {
    const confirmed = confirm('Are you sure you want to clear all completed items from all lists?');
    if (!confirmed) return;

    try {
        await FirebaseService.clearAllCompletedItems();
        showToast('All completed items cleared!', 'success');
    } catch (error) {
        console.error('Error clearing completed items:', error);
        showToast('Failed to clear completed items', 'error');
    }
}

async function handleLogout() {
    try {
        await FirebaseService.logout();
    } catch (error) {
        console.error('Error logging out:', error);
        showToast('Failed to logout', 'error');
    }
}

// Modal Management
function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Toast Notifications
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Loading State
function showLoading() {
    loadingIndicator.classList.remove('hidden');
}

function hideLoading() {
    loadingIndicator.classList.add('hidden');
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    FirebaseService.cleanup();
});
