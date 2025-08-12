/**
 * Archive Management System - Frontend Application
 */

class ArchiveApp {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'dashboard';
        this.currentRecordsPage = 1;
        this.recordsPerPage = 25;
        this.searchFilters = {};
        this.sortField = 'created_at';
        this.sortOrder = 'DESC';
        
        this.init();
    }

    async init() {
        this.showLoading();
        this.setupEventListeners();
        
        // Check if user is already authenticated
        try {
            const response = await this.apiCall('/api/auth.php?action=validate-session', 'GET');
            if (response.success) {
                this.currentUser = response.user;
                this.showMainApp();
                this.loadDashboard();
            } else {
                this.showLogin();
            }
        } catch (error) {
            this.showLogin();
        }
        
        this.hideLoading();
    }

    setupEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.dataset.page;
                this.navigateTo(page);
            });
        });

        // Quick action buttons
        document.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.dataset.page;
                this.navigateTo(page);
            });
        });

        // User menu
        document.getElementById('user-menu-trigger').addEventListener('click', () => {
            document.getElementById('user-menu-dropdown').classList.toggle('show');
        });

        // Close user menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu')) {
                document.getElementById('user-menu-dropdown').classList.remove('show');
            }
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Sidebar toggle for mobile
        document.getElementById('sidebar-toggle').addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('show');
        });

        // Record form
        document.getElementById('record-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRecordSubmit();
        });

        // Search functionality
        document.getElementById('search-btn').addEventListener('click', () => {
            this.performSearch();
        });

        document.getElementById('records-search').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // Filter changes
        document.getElementById('filter-status').addEventListener('change', () => {
            this.performSearch();
        });
        document.getElementById('filter-civil-status').addEventListener('change', () => {
            this.performSearch();
        });
        document.getElementById('filter-gender').addEventListener('change', () => {
            this.performSearch();
        });

        // Table sorting
        document.querySelectorAll('[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.sort;
                if (this.sortField === field) {
                    this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC';
                } else {
                    this.sortField = field;
                    this.sortOrder = 'ASC';
                }
                this.loadRecords();
            });
        });

        // Export records
        document.getElementById('export-records-btn').addEventListener('click', () => {
            this.exportRecords();
        });

        // Modal close
        document.getElementById('close-record-modal').addEventListener('click', () => {
            this.closeModal('record-modal');
        });
    }

    // API Communication
    async apiCall(url, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        return await response.json();
    }

    async fileUpload(url, formData) {
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        return await response.json();
    }

    // Authentication
    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            this.showLoading();
            const response = await this.apiCall('/api/auth.php?action=login', 'POST', {
                username,
                password
            });

            if (response.success) {
                this.currentUser = response.user;
                this.showMainApp();
                this.showNotification('Login successful!', 'success');
                this.loadDashboard();
            } else {
                this.showError(response.message);
            }
        } catch (error) {
            this.showError('Login failed. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    async handleLogout() {
        try {
            await this.apiCall('/api/auth.php?action=logout', 'POST');
            this.currentUser = null;
            this.showLogin();
            this.showNotification('Logged out successfully', 'info');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    // UI State Management
    showLoading() {
        document.getElementById('loading').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
        document.body.classList.remove('admin');
    }

    showMainApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        document.getElementById('user-name').textContent = this.currentUser.first_name + ' ' + this.currentUser.last_name;
        
        // Show/hide admin elements
        if (this.currentUser.role === 'admin') {
            document.body.classList.add('admin');
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('login-error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' :
                    type === 'warning' ? 'exclamation-triangle' : 'info-circle';
        
        notification.innerHTML = `
            <div class="icon">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="content">
                ${message}
            </div>
            <button class="close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        notifications.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Navigation
    navigateTo(page) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        // Update page title
        const pageTitles = {
            'dashboard': 'Dashboard',
            'records': 'Records Management',
            'add-record': 'Add New Record',
            'attachments': 'Attachments',
            'reports': 'Reports & Analytics',
            'users': 'User Management',
            'activity-logs': 'Activity Logs'
        };
        document.getElementById('page-title').textContent = pageTitles[page] || 'Archive System';

        // Show page content
        document.querySelectorAll('.page-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${page}-page`).classList.add('active');

        this.currentPage = page;

        // Load page-specific data
        switch (page) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'records':
                this.loadRecords();
                break;
            case 'add-record':
                this.resetRecordForm();
                break;
        }
    }

    // Dashboard
    async loadDashboard() {
        try {
            // Load statistics
            const [recordStats, attachmentStats] = await Promise.all([
                this.apiCall('/api/records.php?action=statistics'),
                this.apiCall('/api/attachments.php?action=statistics')
            ]);

            if (recordStats.success) {
                document.getElementById('total-records').textContent = recordStats.statistics.total_active;
                document.getElementById('recent-records').textContent = recordStats.statistics.recent_count;
            }

            if (attachmentStats.success) {
                document.getElementById('total-attachments').textContent = attachmentStats.statistics.total_attachments;
                document.getElementById('storage-used').textContent = attachmentStats.statistics.total_size_formatted;
            }

            // Load recent records
            const recentRecords = await this.apiCall('/api/records.php?limit=5&sort_by=created_at&sort_order=DESC');
            if (recentRecords.success) {
                this.displayRecentRecords(recentRecords.data.records);
            }

        } catch (error) {
            console.error('Dashboard loading error:', error);
        }
    }

    displayRecentRecords(records) {
        const container = document.getElementById('recent-records-list');
        container.innerHTML = '';

        if (records.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-600">No recent records</p>';
            return;
        }

        records.forEach(record => {
            const item = document.createElement('div');
            item.className = 'recent-item';
            item.innerHTML = `
                <div class="d-flex justify-between items-center">
                    <div>
                        <strong>${record.first_name} ${record.last_name}</strong>
                        <br>
                        <small class="text-gray-600">ID: ${record.unique_identifier}</small>
                    </div>
                    <div class="text-right">
                        <small class="text-gray-600">${this.formatDate(record.created_at)}</small>
                        ${record.attachment_count > 0 ? `<br><small><i class="fas fa-paperclip"></i> ${record.attachment_count}</small>` : ''}
                    </div>
                </div>
            `;
            item.addEventListener('click', () => {
                this.viewRecord(record.record_id);
            });
            container.appendChild(item);
        });
    }

    // Records Management
    async loadRecords() {
        try {
            this.showLoading();
            
            const params = new URLSearchParams({
                page: this.currentRecordsPage,
                limit: this.recordsPerPage,
                sort_by: this.sortField,
                sort_order: this.sortOrder,
                ...this.searchFilters
            });

            const response = await this.apiCall(`/api/records.php?${params}`);
            
            if (response.success) {
                this.displayRecords(response.data.records);
                this.updatePagination(response.data);
            } else {
                this.showNotification('Failed to load records', 'error');
            }
        } catch (error) {
            console.error('Records loading error:', error);
            this.showNotification('Failed to load records', 'error');
        } finally {
            this.hideLoading();
        }
    }

    displayRecords(records) {
        const tbody = document.getElementById('records-tbody');
        tbody.innerHTML = '';

        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No records found</td></tr>';
            return;
        }

        records.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.unique_identifier}</td>
                <td>${record.first_name} ${record.last_name}</td>
                <td>${record.date_of_birth ? this.formatDate(record.date_of_birth) : '-'}</td>
                <td>${record.civil_status || '-'}</td>
                <td>${this.formatDate(record.created_at)}</td>
                <td>
                    ${record.attachment_count > 0 ? 
                        `<span class="badge"><i class="fas fa-paperclip"></i> ${record.attachment_count}</span>` : 
                        '<span class="text-gray-400">None</span>'
                    }
                </td>
                <td class="actions">
                    <button class="btn btn-sm btn-secondary" onclick="app.viewRecord(${record.record_id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="app.editRecord(${record.record_id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${this.currentUser.role === 'admin' ? 
                        `<button class="btn btn-sm btn-error" onclick="app.deleteRecord(${record.record_id})">
                            <i class="fas fa-trash"></i>
                        </button>` : ''
                    }
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updatePagination(data) {
        const info = document.getElementById('records-pagination-info');
        const start = (data.page - 1) * data.limit + 1;
        const end = Math.min(data.page * data.limit, data.total);
        info.textContent = `Showing ${start} - ${end} of ${data.total} records`;

        const pagination = document.getElementById('records-pagination');
        pagination.innerHTML = '';

        // Previous button
        if (data.page > 1) {
            const prevBtn = this.createPaginationButton('«', data.page - 1);
            pagination.appendChild(prevBtn);
        }

        // Page numbers
        const maxPages = Math.min(data.pages, 5);
        const startPage = Math.max(1, data.page - Math.floor(maxPages / 2));
        const endPage = Math.min(data.pages, startPage + maxPages - 1);

        for (let i = startPage; i <= endPage; i++) {
            const btn = this.createPaginationButton(i, i, i === data.page);
            pagination.appendChild(btn);
        }

        // Next button
        if (data.page < data.pages) {
            const nextBtn = this.createPaginationButton('»', data.page + 1);
            pagination.appendChild(nextBtn);
        }
    }

    createPaginationButton(text, page, active = false) {
        const btn = document.createElement('button');
        btn.className = `btn btn-sm btn-secondary ${active ? 'active' : ''}`;
        btn.textContent = text;
        btn.addEventListener('click', () => {
            this.currentRecordsPage = page;
            this.loadRecords();
        });
        return btn;
    }

    performSearch() {
        this.searchFilters = {
            search: document.getElementById('records-search').value,
            record_status: document.getElementById('filter-status').value,
            civil_status: document.getElementById('filter-civil-status').value,
            gender: document.getElementById('filter-gender').value
        };

        // Remove empty filters
        Object.keys(this.searchFilters).forEach(key => {
            if (!this.searchFilters[key]) {
                delete this.searchFilters[key];
            }
        });

        this.currentRecordsPage = 1;
        this.loadRecords();
    }

    // Record CRUD Operations
    async viewRecord(recordId) {
        try {
            const response = await this.apiCall(`/api/records.php?id=${recordId}`);
            if (response.success) {
                this.displayRecordModal(response.record);
            }
        } catch (error) {
            this.showNotification('Failed to load record details', 'error');
        }
    }

    displayRecordModal(record) {
        const modalBody = document.getElementById('record-modal-body');
        modalBody.innerHTML = `
            <div class="record-details">
                <div class="detail-section">
                    <h4>Personal Information</h4>
                    <div class="detail-grid">
                        <div><strong>Record ID:</strong> ${record.unique_identifier}</div>
                        <div><strong>Name:</strong> ${record.first_name} ${record.middle_name || ''} ${record.last_name}</div>
                        <div><strong>Date of Birth:</strong> ${record.date_of_birth ? this.formatDate(record.date_of_birth) : 'Not specified'}</div>
                        <div><strong>Civil Status:</strong> ${record.civil_status || 'Not specified'}</div>
                        <div><strong>Gender:</strong> ${record.gender || 'Not specified'}</div>
                        <div><strong>Nationality:</strong> ${record.nationality || 'Not specified'}</div>
                    </div>
                </div>
                
                ${record.phone_number || record.email_address ? `
                <div class="detail-section">
                    <h4>Contact Information</h4>
                    <div class="detail-grid">
                        ${record.phone_number ? `<div><strong>Phone:</strong> ${record.phone_number}</div>` : ''}
                        ${record.email_address ? `<div><strong>Email:</strong> ${record.email_address}</div>` : ''}
                    </div>
                </div>
                ` : ''}
                
                ${record.address_line1 || record.city ? `
                <div class="detail-section">
                    <h4>Address</h4>
                    <div class="detail-content">
                        ${record.address_line1 ? `${record.address_line1}<br>` : ''}
                        ${record.address_line2 ? `${record.address_line2}<br>` : ''}
                        ${record.city ? `${record.city}, ` : ''}${record.state_province || ''} ${record.postal_code || ''}<br>
                        ${record.country || ''}
                    </div>
                </div>
                ` : ''}
                
                ${record.emergency_contact_name ? `
                <div class="detail-section">
                    <h4>Emergency Contact</h4>
                    <div class="detail-grid">
                        <div><strong>Name:</strong> ${record.emergency_contact_name}</div>
                        ${record.emergency_contact_phone ? `<div><strong>Phone:</strong> ${record.emergency_contact_phone}</div>` : ''}
                    </div>
                </div>
                ` : ''}
                
                ${record.notes ? `
                <div class="detail-section">
                    <h4>Notes</h4>
                    <div class="detail-content">${record.notes}</div>
                </div>
                ` : ''}
                
                <div class="detail-section">
                    <h4>Record Information</h4>
                    <div class="detail-grid">
                        <div><strong>Status:</strong> ${record.record_status}</div>
                        <div><strong>Created:</strong> ${this.formatDate(record.created_at)}</div>
                        <div><strong>Updated:</strong> ${this.formatDate(record.updated_at)}</div>
                    </div>
                </div>
            </div>
        `;
        
        this.showModal('record-modal');
    }

    async editRecord(recordId) {
        try {
            const response = await this.apiCall(`/api/records.php?id=${recordId}`);
            if (response.success) {
                this.populateRecordForm(response.record);
                this.navigateTo('add-record');
                document.getElementById('record-form-title').textContent = 'Edit Record';
            }
        } catch (error) {
            this.showNotification('Failed to load record for editing', 'error');
        }
    }

    populateRecordForm(record) {
        document.getElementById('record-id').value = record.record_id;
        document.getElementById('first-name').value = record.first_name || '';
        document.getElementById('last-name').value = record.last_name || '';
        document.getElementById('middle-name').value = record.middle_name || '';
        document.getElementById('date-of-birth').value = record.date_of_birth || '';
        document.getElementById('civil-status').value = record.civil_status || '';
        document.getElementById('gender').value = record.gender || '';
        document.getElementById('nationality').value = record.nationality || '';
        document.getElementById('phone-number').value = record.phone_number || '';
        document.getElementById('email-address').value = record.email_address || '';
        document.getElementById('address-line1').value = record.address_line1 || '';
        document.getElementById('address-line2').value = record.address_line2 || '';
        document.getElementById('city').value = record.city || '';
        document.getElementById('state-province').value = record.state_province || '';
        document.getElementById('postal-code').value = record.postal_code || '';
        document.getElementById('country').value = record.country || '';
        document.getElementById('emergency-contact-name').value = record.emergency_contact_name || '';
        document.getElementById('emergency-contact-phone').value = record.emergency_contact_phone || '';
        document.getElementById('notes').value = record.notes || '';
    }

    resetRecordForm() {
        document.getElementById('record-form').reset();
        document.getElementById('record-id').value = '';
        document.getElementById('record-form-title').textContent = 'Add New Record';
    }

    async handleRecordSubmit() {
        const formData = new FormData(document.getElementById('record-form'));
        const recordData = {};
        
        for (const [key, value] of formData.entries()) {
            if (key !== 'record_id' && value.trim()) {
                recordData[key] = value;
            }
        }

        const recordId = document.getElementById('record-id').value;
        const isEdit = !!recordId;

        try {
            this.showLoading();
            
            let response;
            if (isEdit) {
                response = await this.apiCall(`/api/records.php?id=${recordId}`, 'PUT', recordData);
            } else {
                response = await this.apiCall('/api/records.php', 'POST', recordData);
            }

            if (response.success) {
                this.showNotification(response.message, 'success');
                this.navigateTo('records');
            } else {
                this.showNotification(response.message, 'error');
            }
        } catch (error) {
            this.showNotification('Failed to save record', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async deleteRecord(recordId) {
        if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await this.apiCall(`/api/records.php?id=${recordId}`, 'DELETE');
            if (response.success) {
                this.showNotification(response.message, 'success');
                this.loadRecords();
            } else {
                this.showNotification(response.message, 'error');
            }
        } catch (error) {
            this.showNotification('Failed to delete record', 'error');
        }
    }

    async exportRecords() {
        try {
            const params = new URLSearchParams({
                action: 'export',
                ...this.searchFilters
            });

            window.open(`/api/records.php?${params}`, '_blank');
            this.showNotification('Export started', 'info');
        } catch (error) {
            this.showNotification('Export failed', 'error');
        }
    }

    // Modal Management
    showModal(modalId) {
        document.getElementById(modalId).classList.add('show');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
    }

    // Utility Functions
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ArchiveApp();
});

// Add some CSS for the modal details
const style = document.createElement('style');
style.textContent = `
    .record-details .detail-section {
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--gray-200);
    }
    
    .record-details .detail-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
    }
    
    .record-details h4 {
        color: var(--primary-color);
        margin-bottom: 1rem;
        font-size: 1.1rem;
    }
    
    .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 0.75rem;
    }
    
    .detail-content {
        line-height: 1.6;
    }
    
    .badge {
        background: var(--primary-color);
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.75rem;
    }
    
    .text-gray-400 {
        color: var(--gray-400);
    }
    
    .text-gray-600 {
        color: var(--gray-600);
    }
`;
document.head.appendChild(style);