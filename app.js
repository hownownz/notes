// Main App Logic
import * as FirebaseService from './firebase-service.js';

// State
let currentItems = [];
let currentEditingItem = null;

// DOM Elements
const loadingIndicator = document.getElementById('loadingIndicator');
const itemsContainer = document.getElementById('itemsContainer');
const quickAddInput = document.getElementById('quickAddInput');
const addItemBtn = document.getElementById('addItemBtn');
const searchBtn = document.getElementById('searchBtn');
const darkModeBtn = document.getElementById('darkModeBtn');
const settingsBtn = document.getElementById('settingsBtn');
const logoutBtn = document.getElementById('logoutBtn');
const searchSection = document.getElementById('searchSection');
const searchInput = document.getElementById('searchInput');
const closeSearchBtn = document.getElementById('closeSearchBtn');
const searchResults = document.getElementById('searchResults');
const toast = document.getElementById('toast');

// Edit Modal
const editItemModal = document.getElementById('editItemModal');
const editItemInput = document.getElementById('editItemInput');
const editItemComment = document.getElementById('editItemComment');
const saveEditItemBtn = document.getElementById('saveEditItemBtn');
const cancelEditItemBtn = document.getElementById('cancelEditItemBtn');
const deleteEditItemBtn = document.getElementById('deleteEditItemBtn');

// Settings Modal
const settingsModal = document.getElementById('settingsModal');
const userEmail = document.getElementById('userEmail');
const exportDataBtn = document.getElementById('exportDataBtn');
const importDataBtn = document.getElementById('importDataBtn');
const importFileInput = document.getElementById('importFileInput');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// Initialize App
FirebaseService.initAuth(
    async (user) => {
        // User signed in
        userEmail.textContent = user.email;
        await runMigrationIfNeeded();
        initializeApp();
    },
    () => {
        // User signed out
        window.location.href = 'login.html';
    }
);

async function runMigrationIfNeeded() {
    const flag = 'migratedToFlatItems_v1';
    if (localStorage.getItem(flag)) return;

    try {
        const count = await FirebaseService.migrateListsToFlatItems();
        if (count > 0) {
            showToast(`Imported ${count} note(s) from your old lists`, 'success');
        }
    } catch (error) {
        console.error('Error migrating old lists:', error);
    } finally {
        localStorage.setItem(flag, 'true');
    }
}

function initializeApp() {
    hideLoading();
    setupEventListeners();
    FirebaseService.subscribeToItems((items) => {
        currentItems = items;
        renderItems();
    });
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

    // Search
    searchBtn.addEventListener('click', toggleSearch);
    closeSearchBtn.addEventListener('click', toggleSearch);
    searchInput.addEventListener('input', handleSearch);

    // Dark Mode
    darkModeBtn.addEventListener('click', toggleDarkMode);

    // Settings
    settingsBtn.addEventListener('click', () => openModal(settingsModal));
    exportDataBtn.addEventListener('click', handleExportData);
    importDataBtn.addEventListener('click', handleImportData);
    importFileInput.addEventListener('change', handleImportFileSelected);
    clearCompletedBtn.addEventListener('click', handleClearCompleted);

    // Logout
    logoutBtn.addEventListener('click', handleLogout);

    // Edit Item Modal
    saveEditItemBtn.addEventListener('click', handleSaveEditItem);
    cancelEditItemBtn.addEventListener('click', () => closeModal(editItemModal));
    deleteEditItemBtn.addEventListener('click', handleDeleteFromEditModal);

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
        const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

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
            if (editItemModal.classList.contains('active')) {
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

// Rendering
function renderItems() {
    if (currentItems.length === 0) {
        renderEmptyState();
        return;
    }

    itemsContainer.innerHTML = currentItems.map(renderItem).join('');
}

function renderEmptyState() {
    itemsContainer.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📝</div>
            <h2>No notes yet</h2>
            <p>Add your first note above!</p>
        </div>
    `;
}

function renderItem(item) {
    const hasComment = item.comment && item.comment.trim().length > 0;
    return `
        <div class="item-row ${item.completed ? 'completed' : ''}" data-item-id="${item.id}">
            <div class="item-checkbox" data-action="toggle-item"></div>
            <div class="item-body" data-action="toggle-item">
                <div class="item-text">${escapeHtml(item.text)}</div>
                ${hasComment ? `<div class="item-comment">${escapeHtml(item.comment)}</div>` : ''}
            </div>
            <div class="item-actions">
                <button class="item-action-btn" data-action="edit-item" title="Edit">✏️</button>
                <button class="item-action-btn delete" data-action="delete-item" title="Delete">✕</button>
            </div>
        </div>
    `;
}

// Quick Add
async function handleQuickAdd() {
    const text = quickAddInput.value.trim();

    if (!text) {
        showToast('Please enter a note', 'warning');
        return;
    }

    try {
        await FirebaseService.addItem({ text });
        quickAddInput.value = '';
        quickAddInput.focus();
    } catch (error) {
        console.error('Error adding item:', error);
        showToast('Failed to add note', 'error');
    }
}

// Item Management
async function handleToggleItem(itemId) {
    const item = currentItems.find(i => i.id === itemId);
    if (!item) return;

    try {
        await FirebaseService.updateItem(itemId, { completed: !item.completed });
    } catch (error) {
        console.error('Error toggling item:', error);
        showToast('Failed to update note', 'error');
    }
}

function openEditItemModal(itemId) {
    const item = currentItems.find(i => i.id === itemId);
    if (!item) return;

    currentEditingItem = item;
    editItemInput.value = item.text;
    editItemComment.value = item.comment || '';

    openModal(editItemModal);
    editItemInput.focus();
}

async function handleSaveEditItem() {
    const newText = editItemInput.value.trim();
    const newComment = editItemComment.value.trim();

    if (!newText) {
        showToast('Please enter note text', 'warning');
        return;
    }

    try {
        await FirebaseService.updateItem(currentEditingItem.id, { text: newText, comment: newComment });
        closeModal(editItemModal);
    } catch (error) {
        console.error('Error saving item:', error);
        showToast('Failed to save note', 'error');
    }
}

async function handleDeleteFromEditModal() {
    if (!currentEditingItem) return;
    await handleDeleteItem(currentEditingItem.id);
    closeModal(editItemModal);
}

async function handleDeleteItem(itemId) {
    try {
        await FirebaseService.deleteItem(itemId);
    } catch (error) {
        console.error('Error deleting item:', error);
        showToast('Failed to delete note', 'error');
    }
}

// Event Delegation for Dynamic Elements
itemsContainer.addEventListener('click', (e) => {
    const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    const row = e.target.closest('.item-row');
    if (!row) return;

    const itemId = row.dataset.itemId;

    switch (action) {
        case 'toggle-item':
            handleToggleItem(itemId);
            break;
        case 'edit-item':
            openEditItemModal(itemId);
            break;
        case 'delete-item':
            handleDeleteItem(itemId);
            break;
    }
});

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

    const results = FirebaseService.searchItems(currentItems, searchTerm);

    if (results.length === 0) {
        searchResults.innerHTML = '<div class="empty-list">No notes found</div>';
        return;
    }

    searchResults.innerHTML = results.map(item => `
        <div class="search-result-item" data-item-id="${item.id}">
            <div class="search-result-text">${escapeHtml(item.text)}</div>
        </div>
    `).join('');

    searchResults.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', () => {
            toggleSearch();

            setTimeout(() => {
                const itemEl = document.querySelector(`.item-row[data-item-id="${el.dataset.itemId}"]`);
                if (itemEl) {
                    itemEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    itemEl.style.background = 'var(--warning-color)';
                    setTimeout(() => {
                        itemEl.style.background = '';
                    }, 1000);
                }
            }, 100);
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
        a.download = `quick-capture-${new Date().toISOString().split('T')[0]}.json`;
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

        if (!data.items || !Array.isArray(data.items)) {
            showToast('Invalid data format', 'error');
            return;
        }

        const confirmed = confirm(
            `This will import ${data.items.length} note(s). ` +
            'This will merge with your existing notes. Continue?'
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

async function handleClearCompleted() {
    const confirmed = confirm('Are you sure you want to clear all completed notes?');
    if (!confirmed) return;

    try {
        const count = await FirebaseService.clearCompletedItems(currentItems);
        showToast(count > 0 ? 'Completed notes cleared!' : 'No completed notes to clear', 'success');
    } catch (error) {
        console.error('Error clearing completed items:', error);
        showToast('Failed to clear completed notes', 'error');
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
