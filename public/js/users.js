// Users Management JavaScript

let currentUserId = null;
let userToDelete = null;

// Load users on page load
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Add user button
    document.getElementById('addUserBtn').addEventListener('click', openAddUserModal);

    // User form submit
    document.getElementById('userForm').addEventListener('submit', handleUserFormSubmit);

    // Close modal on outside click
    document.getElementById('userModal').addEventListener('click', (e) => {
        if (e.target.id === 'userModal') {
            closeUserModal();
        }
    });

    document.getElementById('deleteModal').addEventListener('click', (e) => {
        if (e.target.id === 'deleteModal') {
            closeDeleteModal();
        }
    });
}

// Load all users
async function loadUsers() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const tableBody = document.getElementById('usersTableBody');

    try {
        loadingState.style.display = 'block';
        emptyState.style.display = 'none';

        const response = await fetch('/api/users');
        const data = await response.json();

        loadingState.style.display = 'none';

        if (data.users && data.users.length > 0) {
            renderUsersTable(data.users);
        } else {
            emptyState.style.display = 'block';
            tableBody.innerHTML = '';
        }
    } catch (error) {
        console.error('Error loading users:', error);
        loadingState.style.display = 'none';
        showToast('Failed to load users', 'error');
    }
}

// Render users table
function renderUsersTable(users) {
    const tableBody = document.getElementById('usersTableBody');

    tableBody.innerHTML = users.map(user => `
        <tr>
            <td><strong>${escapeHtml(user.name)}</strong></td>
            <td>${escapeHtml(user.email)}</td>
            <td>
                <span class="status-badge ${user.status || 'active'}">
                    ${user.status || 'active'}
                </span>
            </td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-view" onclick="viewUser('${user.userId}')">
                        👁️ View
                    </button>
                    <button class="btn-icon btn-edit" onclick="editUser('${user.userId}')">
                        ✏️ Edit
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteUser('${user.userId}')">
                        🗑️ Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Open add user modal
function openAddUserModal() {
    currentUserId = null;
    document.getElementById('modalTitle').textContent = 'Add New User';
    document.getElementById('saveButtonText').textContent = 'Create User';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('userModal').classList.add('show');
}

// Open edit user modal
async function editUser(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();

        if (data.user) {
            currentUserId = userId;
            document.getElementById('modalTitle').textContent = 'Edit User';
            document.getElementById('saveButtonText').textContent = 'Update User';
            document.getElementById('userId').value = userId;
            document.getElementById('userName').value = data.user.name;
            document.getElementById('userEmail').value = data.user.email;
            document.getElementById('userStatus').value = data.user.status || 'active';
            document.getElementById('userModal').classList.add('show');
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showToast('Failed to load user details', 'error');
    }
}

// View user details
async function viewUser(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();

        if (data.user) {
            const user = data.user;
            alert(`User Details:\n\nName: ${user.name}\nEmail: ${user.email}\nStatus: ${user.status || 'active'}\nCreated: ${formatDate(user.createdAt)}\nUpdated: ${formatDate(user.updatedAt)}`);
        }
    } catch (error) {
        console.error('Error viewing user:', error);
        showToast('Failed to load user details', 'error');
    }
}

// Close user modal
function closeUserModal() {
    document.getElementById('userModal').classList.remove('show');
    document.getElementById('userForm').reset();
    currentUserId = null;
}

// Handle user form submit
async function handleUserFormSubmit(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('userName').value.trim(),
        email: document.getElementById('userEmail').value.trim().toLowerCase(),
        status: document.getElementById('userStatus').value
    };

    // Validation
    if (!formData.name || !formData.email) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    if (!isValidEmail(formData.email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    const saveBtn = document.getElementById('saveUserBtn');
    const originalText = document.getElementById('saveButtonText').textContent;
    saveBtn.disabled = true;
    document.getElementById('saveButtonText').textContent = 'Saving...';

    try {
        const url = currentUserId ? `/api/users/${currentUserId}` : '/api/users';
        const method = currentUserId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast(data.message || 'User saved successfully', 'success');
            closeUserModal();
            loadUsers();
        } else {
            showToast(data.error || 'Failed to save user', 'error');
        }
    } catch (error) {
        console.error('Error saving user:', error);
        showToast('Failed to save user', 'error');
    } finally {
        saveBtn.disabled = false;
        document.getElementById('saveButtonText').textContent = originalText;
    }
}

// Delete user
function deleteUser(userId) {
    userToDelete = userId;
    document.getElementById('deleteModal').classList.add('show');
}

// Close delete modal
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('show');
    userToDelete = null;
}

// Confirm delete
async function confirmDelete() {
    if (!userToDelete) return;

    try {
        const response = await fetch(`/api/users/${userToDelete}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showToast(data.message || 'User deleted successfully', 'success');
            closeDeleteModal();
            loadUsers();
        } else {
            showToast(data.error || 'Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Failed to delete user', 'error');
    }
}

// Utility Functions

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
