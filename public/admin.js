// Admin Authentication
const ADMIN_PASSWORD = 'your-secure-password'; // Change this to a secure password
let isAuthenticated = false;

// Pagination
let currentPage = 1;
const itemsPerPage = 10;
let userData = [];

// Check if user is already authenticated
function checkAuth() {
    const authToken = localStorage.getItem('adminAuth');
    if (authToken === ADMIN_PASSWORD) {
        isAuthenticated = true;
        showDashboard();
    }
}

function login() {
    const password = document.getElementById('adminPassword').value;
    if (password === ADMIN_PASSWORD) {
        isAuthenticated = true;
        localStorage.setItem('adminAuth', password);
        showDashboard();
    } else {
        alert('Invalid password');
    }
}

function logout() {
    isAuthenticated = false;
    localStorage.removeItem('adminAuth');
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('dashboardSection').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    loadUserData();
}

// User Data Management
async function loadUserData() {
    try {
        // Replace this with your actual API endpoint
        const response = await fetch('/api/users');
        userData = await response.json();
        updateStats();
        displayUsers();
    } catch (error) {
        console.error('Error loading user data:', error);
        // For testing, use sample data
        userData = getSampleData();
        updateStats();
        displayUsers();
    }
}

function getSampleData() {
    // Sample data for testing
    return [
        {
            telegramUsername: '@user1',
            registrationDate: '2024-03-01',
            lastActive: '2024-03-05',
            miningPower: 1.15,
            totalMined: 125.45,
            status: 'active'
        },
        // Add more sample data as needed
    ];
}

function updateStats() {
    const totalUsers = userData.length;
    const activeUsers = userData.filter(user => user.status === 'active').length;
    const totalMined = userData.reduce((sum, user) => sum + user.totalMined, 0);

    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('activeUsers').textContent = activeUsers;
    document.getElementById('totalMined').textContent = totalMined.toFixed(4);
}

function displayUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUsers = userData.slice(startIndex, endIndex);

    paginatedUsers.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.telegramUsername}</td>
            <td>${formatDate(user.registrationDate)}</td>
            <td>${formatDate(user.lastActive)}</td>
            <td>${user.miningPower.toFixed(2)}x</td>
            <td>${user.totalMined.toFixed(4)} USDT</td>
            <td><span class="status-badge status-${user.status}">${user.status}</span></td>
            <td>
                <button onclick="toggleUserStatus('${user.telegramUsername}')">${user.status === 'active' ? 'Deactivate' : 'Activate'}</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    updatePagination();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Filtering and Search
function filterUsers() {
    const searchTerm = document.getElementById('searchUser').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;

    const filteredUsers = userData.filter(user => {
        const matchesSearch = user.telegramUsername.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    userData = filteredUsers;
    currentPage = 1;
    displayUsers();
}

// Pagination Controls
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayUsers();
    }
}

function nextPage() {
    const maxPages = Math.ceil(userData.length / itemsPerPage);
    if (currentPage < maxPages) {
        currentPage++;
        displayUsers();
    }
}

function updatePagination() {
    const maxPages = Math.ceil(userData.length / itemsPerPage);
    document.getElementById('currentPage').textContent = `Page ${currentPage} of ${maxPages}`;
    
    const prevButton = document.querySelector('.pagination button:first-child');
    const nextButton = document.querySelector('.pagination button:last-child');
    
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === maxPages;
}

// User Actions
async function toggleUserStatus(username) {
    try {
        const user = userData.find(u => u.telegramUsername === username);
        if (!user) return;

        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        
        // Replace with your actual API endpoint
        await fetch(`/api/users/${username}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        // Update local data
        user.status = newStatus;
        displayUsers();
        updateStats();
    } catch (error) {
        console.error('Error updating user status:', error);
        // For testing, update local data anyway
        const user = userData.find(u => u.telegramUsername === username);
        if (user) {
            user.status = user.status === 'active' ? 'inactive' : 'active';
            displayUsers();
            updateStats();
        }
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', checkAuth); 