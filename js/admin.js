import { getAuthHeader, getCurrentUser } from './auth.js';
import { showToast } from './notifications.js';

const API_BASE_URL = 'http://localhost:3001/api';

// Permission Structure: Module -> Feature -> CRUD Permissions
export const PERMISSION_STRUCTURE = {
  Inventory: {
    'Add Product': {
      permissions: ['view_product', 'create_product', 'edit_product', 'delete_product'],
      route: 'add-product'
    },
    'Product Database': {
      permissions: ['view_product', 'create_product', 'edit_product', 'delete_product'],
      route: 'product-database'
    },
    'Product Details': {
      permissions: ['view_product', 'edit_product', 'delete_product'],
      route: 'product-details'
    }
  },
  Operations: {
    'BOQs': {
      permissions: ['view_boq', 'create_boq', 'edit_boq', 'delete_boq'],
      route: 'boq-list'
    },
    'Requests': {
      permissions: ['view_requests', 'create_request', 'edit_request', 'delete_request'],
      route: 'requests-list'
    }
  },
  Workspace: {
    'Offers': {
      permissions: ['view_offers', 'create_offer', 'edit_offer', 'delete_offer'],
      route: 'offers-list'
    },
    'Dashboard': {
      permissions: ['dashboard'],
      route: 'user/dashboard'
    }
  },
  Reporting: {
    'Reports': {
      permissions: ['view_reports', 'create_report', 'edit_report', 'delete_report'],
      route: 'reports'
    }
  },
  Management: {
    'User Management': {
      permissions: ['manage_users'],
      route: 'admin/total-users'
    },
    'Department Management': {
      permissions: ['manage_departments'],
      route: 'admin/departments'
    },
    'Designation Management': {
      permissions: ['manage_designations'],
      route: 'admin/designations'
    }
  }
};

// Helper for API calls with auth
async function apiCall(endpoint, options = {}) {
  const token = getAuthHeader();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...token,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return await response.json();
}

// Load pending users
export async function loadPendingUsers() {
  try {
    const users = await apiCall('/admin/pending-users');
    return users;
  } catch (error) {
    console.error('[Admin] Error loading pending users:', error);
    throw error;
  }
}

// Load all users with optional filters
export async function loadAllUsers(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.department_id) params.append('department_id', filters.department_id);
    if (filters.designation_id) params.append('designation_id', filters.designation_id);
    if (filters.status) params.append('status', filters.status);
    
    const url = params.toString() 
      ? `/admin/users?${params.toString()}`
      : '/admin/users';
    const users = await apiCall(url);
    return users;
  } catch (error) {
    console.error('[Admin] Error loading users:', error);
    throw error;
  }
}

// Load single user by ID
export async function loadUserById(id) {
  try {
    const user = await apiCall(`/admin/users/${id}`);
    return user;
  } catch (error) {
    console.error('[Admin] Error loading user:', error);
    throw error;
  }
}

// Update user
export async function updateUser(id, userData) {
  try {
    const result = await apiCall(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    return result;
  } catch (error) {
    console.error('[Admin] Error updating user:', error);
    throw error;
  }
}

// Update user password (admin)
export async function updateUserPassword(id, password) {
  try {
    const result = await apiCall(`/admin/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
    return result;
  } catch (error) {
    console.error('[Admin] Error updating user password:', error);
    throw error;
  }
}

// Delete user
export async function deleteUser(id) {
  try {
    const result = await apiCall(`/admin/users/${id}`, {
      method: 'DELETE',
    });
    return result;
  } catch (error) {
    console.error('[Admin] Error deleting user:', error);
    throw error;
  }
}

// Approve or reject user
export async function updateUserStatus(userId, status) {
  try {
    const result = await apiCall(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return result;
  } catch (error) {
    console.error('[Admin] Error updating user status:', error);
    throw error;
  }
}

// Load departments
export async function loadDepartments() {
  try {
    const depts = await apiCall('/admin/departments');
    return depts;
  } catch (error) {
    console.error('[Admin] Error loading departments:', error);
    throw error;
  }
}

// Add department
export async function addDepartment(name) {
  try {
    const result = await apiCall('/admin/departments', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return result;
  } catch (error) {
    console.error('[Admin] Error adding department:', error);
    throw error;
  }
}

// Update department
export async function updateDepartment(id, name) {
  try {
    const result = await apiCall(`/admin/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
    return result;
  } catch (error) {
    console.error('[Admin] Error updating department:', error);
    throw error;
  }
}

// Delete department
export async function deleteDepartment(id) {
  try {
    const result = await apiCall(`/admin/departments/${id}`, {
      method: 'DELETE',
    });
    return result;
  } catch (error) {
    console.error('[Admin] Error deleting department:', error);
    throw error;
  }
}

// Load designations
export async function loadDesignations(departmentId = null) {
  try {
    const url = departmentId 
      ? `/admin/designations?department_id=${departmentId}`
      : '/admin/designations';
    const designations = await apiCall(url);
    return designations;
  } catch (error) {
    console.error('[Admin] Error loading designations:', error);
    throw error;
  }
}

// Add designation
export async function addDesignation(departmentId, title) {
  try {
    const result = await apiCall('/admin/designations', {
      method: 'POST',
      body: JSON.stringify({ department_id: departmentId, title }),
    });
    return result;
  } catch (error) {
    console.error('[Admin] Error adding designation:', error);
    throw error;
  }
}

// Update designation
export async function updateDesignation(id, departmentId, title) {
  try {
    const result = await apiCall(`/admin/designations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ department_id: departmentId, title }),
    });
    return result;
  } catch (error) {
    console.error('[Admin] Error updating designation:', error);
    throw error;
  }
}

// Delete designation
export async function deleteDesignation(id) {
  try {
    const result = await apiCall(`/admin/designations/${id}`, {
      method: 'DELETE',
    });
    return result;
  } catch (error) {
    console.error('[Admin] Error deleting designation:', error);
    throw error;
  }
}

// Render pending users table
export function renderPendingUsers(users, container) {
  const tableContainer = container.querySelector('#pending-users-table');
  if (!tableContainer) return;

  if (!users || users.length === 0) {
    tableContainer.innerHTML = '<div class="text-center text-slate-500 p-4">No pending users</div>';
    return;
  }

  tableContainer.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Username</th>
          <th>Department</th>
          <th>Designation</th>
          <th>Mobile</th>
          <th>Address</th>
          <th>Registered</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(user => `
          <tr>
            <td>${user.name || '--'}</td>
            <td>${user.email || '--'}</td>
            <td>${user.username || '--'}</td>
            <td>${user.department_name || '--'}</td>
            <td>${user.designation_title || '--'}</td>
            <td>${user.phone || '--'}</td>
            <td>${user.address ? (user.address.length > 30 ? user.address.substring(0, 30) + '...' : user.address) : '--'}</td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
              <button class="btn btn-ghost btn-sm" data-edit-user="${user.id}">Edit</button>
              <button class="btn btn-outline btn-sm" data-reset-password="${user.id}">Reset Password</button>
              <button class="btn btn-primary btn-sm" data-approve-user="${user.id}">Approve</button>
              <button class="btn btn-outline btn-sm" data-reject-user="${user.id}">Reject</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  // Wire up approve/reject buttons
  tableContainer.querySelectorAll('[data-approve-user]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.approveUser;
      try {
        await updateUserStatus(userId, 'approved');
        showToast('User approved successfully', 'success');
        const route = window.location.hash.replace("#", "").trim();
        if (route === 'admin/pending-users') {
          await refreshPendingUsersPage(container);
          wireUserActions(container, 'pending');
        } else {
          refreshAdminDashboard(container);
        }
      } catch (error) {
        showToast(error.message || 'Failed to approve user', 'error');
      }
    });
  });

  tableContainer.querySelectorAll('[data-reject-user]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.rejectUser;
      if (confirm('Are you sure you want to reject this user?')) {
        try {
        await updateUserStatus(userId, 'rejected');
        showToast('User rejected', 'success');
        const route = window.location.hash.replace("#", "").trim();
        if (route === 'admin/pending-users') {
          await refreshPendingUsersPage(container);
          wireUserActions(container, 'pending');
        } else {
          refreshAdminDashboard(container);
        }
        } catch (error) {
          showToast(error.message || 'Failed to reject user', 'error');
        }
      }
    });
  });
}

// Render departments table
export function renderDepartments(departments, container) {
  const tableContainer = container.querySelector('#departments-table');
  if (!tableContainer) return;

  if (!departments || departments.length === 0) {
    tableContainer.innerHTML = '<div class="text-center text-slate-500 p-4">No departments. Add one to get started.</div>';
    return;
  }

  tableContainer.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${departments.map(dept => `
          <tr>
            <td>${dept.name || '--'}</td>
            <td>${new Date(dept.createdAt).toLocaleDateString()}</td>
            <td>
              <button class="btn btn-ghost btn-sm" data-edit-dept="${dept.id}" data-dept-name="${dept.name}">Edit</button>
              <button class="btn btn-outline btn-sm text-red-600" data-delete-dept="${dept.id}">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  // Wire up edit/delete buttons - these will be re-wired by the page-specific hydration
  // The event handlers are set up in hydrateDepartmentsPage()
}

// Render designations table
export function renderDesignations(designations, container) {
  const tableContainer = container.querySelector('#designations-table');
  if (!tableContainer) return;

  if (!designations || designations.length === 0) {
    tableContainer.innerHTML = '<div class="text-center text-slate-500 p-4">No designations. Add one to get started.</div>';
    return;
  }

  tableContainer.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Department</th>
          <th>Title</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${designations.map(desg => `
          <tr>
            <td>${desg.department_name || '--'}</td>
            <td>${desg.title || '--'}</td>
            <td>${new Date(desg.createdAt).toLocaleDateString()}</td>
            <td>
              <button class="btn btn-ghost btn-sm" data-edit-desg="${desg.id}" data-desg-title="${desg.title}" data-desg-dept="${desg.department_id}">Edit</button>
              <button class="btn btn-outline btn-sm text-red-600" data-delete-desg="${desg.id}">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  // Wire up edit/delete buttons - these will be re-wired by the page-specific hydration
  // The event handlers are set up in hydrateDesignationsPage()
}

// Page-specific refresh functions
export async function refreshDepartmentsPage(container) {
  if (!container) container = document.getElementById('app-view');
  if (!container) return;

  try {
    const departments = await loadDepartments();
    renderDepartments(departments, container);
    
    // Re-wire edit/delete buttons
    const tableContainer = container.querySelector('#departments-table');
    if (tableContainer) {
      tableContainer.querySelectorAll('[data-edit-dept]').forEach(btn => {
        // Remove existing listeners by cloning
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', () => {
          const deptId = newBtn.dataset.editDept;
          const deptName = newBtn.dataset.deptName;
          const newName = prompt('Enter new department name:', deptName);
          if (newName && newName.trim() && newName !== deptName) {
            updateDepartment(deptId, newName.trim())
              .then(() => {
                showToast('Department updated', 'success');
                refreshDepartmentsPage(container);
              })
              .catch(error => {
                showToast(error.message || 'Failed to update department', 'error');
              });
          }
        });
      });

      tableContainer.querySelectorAll('[data-delete-dept]').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', () => {
          const deptId = newBtn.dataset.deleteDept;
          if (confirm('Are you sure you want to delete this department? This will also delete all associated designations.')) {
            deleteDepartment(deptId)
              .then(() => {
                showToast('Department deleted', 'success');
                refreshDepartmentsPage(container);
              })
              .catch(error => {
                showToast(error.message || 'Failed to delete department', 'error');
              });
          }
        });
      });
    }
  } catch (error) {
    console.error('[Admin] Error refreshing departments page:', error);
    showToast('Failed to refresh departments', 'error');
  }
}

export async function refreshDesignationsPage(container) {
  if (!container) container = document.getElementById('app-view');
  if (!container) return;

  try {
    const filterSelect = container.querySelector('#designations-filter-dept');
    const deptId = filterSelect?.value || null;
    const designations = await loadDesignations(deptId);
    renderDesignations(designations, container);
    
    // Re-wire edit/delete buttons
    const tableContainer = container.querySelector('#designations-table');
    if (tableContainer) {
      tableContainer.querySelectorAll('[data-edit-desg]').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', async () => {
          const desgId = newBtn.dataset.editDesg;
          const desgTitle = newBtn.dataset.desgTitle;
          const desgDept = newBtn.dataset.desgDept;
          
          const departments = await loadDepartments();
          const newTitle = prompt('Enter new designation title:', desgTitle);
          if (newTitle && newTitle.trim() && newTitle !== desgTitle) {
            updateDesignation(desgId, desgDept, newTitle.trim())
              .then(() => {
                showToast('Designation updated', 'success');
                refreshDesignationsPage(container);
              })
              .catch(error => {
                showToast(error.message || 'Failed to update designation', 'error');
              });
          }
        });
      });

      tableContainer.querySelectorAll('[data-delete-desg]').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', () => {
          const desgId = newBtn.dataset.deleteDesg;
          if (confirm('Are you sure you want to delete this designation?')) {
            deleteDesignation(desgId)
              .then(() => {
                showToast('Designation deleted', 'success');
                refreshDesignationsPage(container);
              })
              .catch(error => {
                showToast(error.message || 'Failed to delete designation', 'error');
              });
          }
        });
      });
    }
  } catch (error) {
    console.error('[Admin] Error refreshing designations page:', error);
    showToast('Failed to refresh designations', 'error');
  }
}

export async function refreshActiveUsersPage(container) {
  if (!container) container = document.getElementById('app-view');
  if (!container) return;

  try {
    // Get filters
    const deptFilter = container.querySelector('#active-users-filter-dept')?.value || '';
    const desgFilter = container.querySelector('#active-users-filter-desg')?.value || '';
    const searchTerm = container.querySelector('#active-users-search')?.value?.toLowerCase() || '';
    
    const filters = { status: 'approved' };
    if (deptFilter) filters.department_id = deptFilter;
    if (desgFilter) filters.designation_id = desgFilter;
    
    let users = await loadAllUsers(filters);
    
    // Apply search filter
    if (searchTerm) {
      users = users.filter(u => 
        (u.name || '').toLowerCase().includes(searchTerm) ||
        (u.email || '').toLowerCase().includes(searchTerm) ||
        (u.username || '').toLowerCase().includes(searchTerm) ||
        (u.phone || '').toLowerCase().includes(searchTerm)
      );
    }
    
    renderActiveUsers(users, container);
  } catch (error) {
    console.error('[Admin] Error refreshing active users page:', error);
    showToast('Failed to refresh active users', 'error');
  }
}

export async function refreshTotalUsersPage(container) {
  if (!container) container = document.getElementById('app-view');
  if (!container) return;

  try {
    // Get filters
    const statusFilter = container.querySelector('#total-users-filter-status')?.value || '';
    const deptFilter = container.querySelector('#total-users-filter-dept')?.value || '';
    const desgFilter = container.querySelector('#total-users-filter-desg')?.value || '';
    const searchTerm = container.querySelector('#total-users-search')?.value?.toLowerCase() || '';
    
    const filters = {};
    if (statusFilter) filters.status = statusFilter;
    if (deptFilter) filters.department_id = deptFilter;
    if (desgFilter) filters.designation_id = desgFilter;
    
    let users = await loadAllUsers(filters);
    
    // Apply search filter
    if (searchTerm) {
      users = users.filter(u => 
        (u.name || '').toLowerCase().includes(searchTerm) ||
        (u.email || '').toLowerCase().includes(searchTerm) ||
        (u.username || '').toLowerCase().includes(searchTerm) ||
        (u.phone || '').toLowerCase().includes(searchTerm)
      );
    }
    
    renderTotalUsers(users, container);
  } catch (error) {
    console.error('[Admin] Error refreshing total users page:', error);
    showToast('Failed to refresh users', 'error');
  }
}

// Refresh admin dashboard
export async function refreshAdminDashboard(container) {
  if (!container) container = document.getElementById('app-view');
  if (!container) return;

  try {
    // Load all data
    const [pendingUsers, allUsers, departments, designations] = await Promise.all([
      loadPendingUsers(),
      loadAllUsers(),
      loadDepartments(),
      loadDesignations(),
    ]);

    // Calculate active users (approved users)
    const activeUsers = allUsers.filter(u => u.status === 'approved');

    // Update counts
    const activeUsersCountEl = container.querySelector('#active-users-count');
    if (activeUsersCountEl) {
      activeUsersCountEl.textContent = activeUsers.length;
    }
    container.querySelector('#pending-users-count').textContent = pendingUsers.length;
    container.querySelector('#total-users-count').textContent = allUsers.length;
    container.querySelector('#departments-count').textContent = departments.length;
    container.querySelector('#designations-count').textContent = designations.length;

    // Render tables
    renderPendingUsers(pendingUsers, container);
    renderDepartments(departments, container);
    renderDesignations(designations, container);

    // Refresh department select in designation modal
    const deptSelect = container.querySelector('#designation-dept-select');
    if (deptSelect) {
      deptSelect.innerHTML = '<option value="">Select department</option>' +
        departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    }
  } catch (error) {
    console.error('[Admin] Error refreshing dashboard:', error);
    showToast('Failed to refresh dashboard', 'error');
  }
}

// Hydrate admin dashboard
export function hydrateAdminDashboard(container) {
  // Load and render data
  refreshAdminDashboard(container);

  // Wire up modals
  const addDeptBtn = container.querySelector('[data-action="add-department"]');
  const addDesgBtn = container.querySelector('[data-action="add-designation"]');
  const addDeptModal = container.querySelector('#modal-add-department');
  const addDesgModal = container.querySelector('#modal-add-designation');
  const addDeptForm = container.querySelector('#form-add-department');
  const addDesgForm = container.querySelector('#form-add-designation');

  // Open department modal
  addDeptBtn?.addEventListener('click', () => {
    addDeptModal?.classList.remove('hidden');
  });

  // Open designation modal
  addDesgBtn?.addEventListener('click', async () => {
    // Load departments for select
    const departments = await loadDepartments();
    const deptSelect = container.querySelector('#designation-dept-select');
    if (deptSelect) {
      deptSelect.innerHTML = '<option value="">Select department</option>' +
        departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    }
    addDesgModal?.classList.remove('hidden');
  });

  // Handle department form submission
  addDeptForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(addDeptForm);
    const name = formData.get('name')?.trim();

    if (!name) {
      showToast('Department name is required', 'error');
      return;
    }

    try {
      await addDepartment(name);
      showToast('Department added successfully', 'success');
      addDeptModal?.classList.add('hidden');
      addDeptForm.reset();
      refreshAdminDashboard(container);
    } catch (error) {
      showToast(error.message || 'Failed to add department', 'error');
    }
  });

  // Handle designation form submission
  addDesgForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(addDesgForm);
    const departmentId = formData.get('department_id');
    const title = formData.get('title')?.trim();

    if (!departmentId || !title) {
      showToast('Department and title are required', 'error');
      return;
    }

    try {
      await addDesignation(departmentId, title);
      showToast('Designation added successfully', 'success');
      addDesgModal?.classList.add('hidden');
      addDesgForm.reset();
      refreshAdminDashboard(container);
    } catch (error) {
      showToast(error.message || 'Failed to add designation', 'error');
    }
  });

  // Refresh button
  const refreshBtn = container.querySelector('[data-action="refresh-admin"]');
  refreshBtn?.addEventListener('click', () => {
    refreshAdminDashboard(container);
  });
}

// Render active users table
export function renderActiveUsers(users, container) {
  const tableContainer = container.querySelector('#active-users-table');
  if (!tableContainer) return;

  if (!users || users.length === 0) {
    tableContainer.innerHTML = '<div class="text-center text-slate-500 p-4">No active users</div>';
    return;
  }

  tableContainer.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Username</th>
          <th>Department</th>
          <th>Designation</th>
          <th>Mobile</th>
          <th>Address</th>
          <th>Role</th>
          <th>Status</th>
          <th>Registered</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(user => `
          <tr>
            <td>${user.name || '--'}</td>
            <td>${user.email || '--'}</td>
            <td>${user.username || '--'}</td>
            <td>${user.department_name || '--'}</td>
            <td>${user.designation_title || '--'}</td>
            <td>${user.phone || '--'}</td>
            <td>${user.address ? (user.address.length > 30 ? user.address.substring(0, 30) + '...' : user.address) : '--'}</td>
            <td>${user.role || 'user'}</td>
            <td><span class="status-pill ${user.status || 'approved'}">${user.status || 'approved'}</span></td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
              <button class="btn btn-ghost btn-sm" data-edit-user="${user.id}">Edit</button>
              <button class="btn btn-outline btn-sm" data-reset-password="${user.id}">Reset Password</button>
              <button class="btn btn-outline btn-sm text-red-600" data-delete-user="${user.id}">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Render total users table
export function renderTotalUsers(users, container) {
  const tableContainer = container.querySelector('#total-users-table');
  if (!tableContainer) return;

  if (!users || users.length === 0) {
    tableContainer.innerHTML = '<div class="text-center text-slate-500 p-4">No users found</div>';
    return;
  }

  tableContainer.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Username</th>
          <th>Department</th>
          <th>Designation</th>
          <th>Mobile</th>
          <th>Address</th>
          <th>Role</th>
          <th>Status</th>
          <th>Registered</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(user => `
          <tr>
            <td>${user.name || '--'}</td>
            <td>${user.email || '--'}</td>
            <td>${user.username || '--'}</td>
            <td>${user.department_name || '--'}</td>
            <td>${user.designation_title || '--'}</td>
            <td>${user.phone || '--'}</td>
            <td>${user.address ? (user.address.length > 30 ? user.address.substring(0, 30) + '...' : user.address) : '--'}</td>
            <td>${user.role || 'user'}</td>
            <td><span class="status-pill ${user.status || 'pending'}">${user.status || 'pending'}</span></td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
              <button class="btn btn-ghost btn-sm" data-edit-user="${user.id}">Edit</button>
              ${user.status === 'pending' ? `
                <button class="btn btn-primary btn-sm" data-approve-user="${user.id}">Approve</button>
                <button class="btn btn-outline btn-sm" data-reject-user="${user.id}">Reject</button>
              ` : ''}
              <button class="btn btn-outline btn-sm" data-reset-password="${user.id}">Reset Password</button>
              <button class="btn btn-outline btn-sm text-red-600" data-delete-user="${user.id}">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  // Wire up approve/reject buttons
  tableContainer.querySelectorAll('[data-approve-user]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.approveUser;
      try {
        await updateUserStatus(userId, 'approved');
        showToast('User approved successfully', 'success');
        await refreshTotalUsersPage(container);
      } catch (error) {
        showToast(error.message || 'Failed to approve user', 'error');
      }
    });
  });

  tableContainer.querySelectorAll('[data-reject-user]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.rejectUser;
      if (confirm('Are you sure you want to reject this user?')) {
        try {
          await updateUserStatus(userId, 'rejected');
          showToast('User rejected', 'success');
          await refreshTotalUsersPage(container);
        } catch (error) {
          showToast(error.message || 'Failed to reject user', 'error');
        }
      }
    });
  });
}

// Load and render active users
export async function loadAndRenderActiveUsers(container) {
  await refreshActiveUsersPage(container);
  wireUserActions(container, 'active');
}

// Load and render total users
export async function loadAndRenderTotalUsers(container) {
  await refreshTotalUsersPage(container);
  wireUserActions(container, 'total');
}

// Wire up edit/delete buttons and modals
async function wireUserActions(container, pageType) {
  // Wire edit buttons
  container.querySelectorAll('[data-edit-user]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.editUser;
      await openEditUserModal(userId, container);
    });
  });

  // Wire reset password buttons
  container.querySelectorAll('[data-reset-password]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.resetPassword;
      await openResetPasswordModal(userId, container, pageType);
    });
  });

  // Wire delete buttons
  container.querySelectorAll('[data-delete-user]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.deleteUser;
      if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        try {
          await deleteUser(userId);
          showToast('User deleted successfully', 'success');
          
          // Refresh appropriate page
          if (pageType === 'active') {
            await refreshActiveUsersPage(container);
            wireUserActions(container, 'active');
          } else if (pageType === 'total') {
            await refreshTotalUsersPage(container);
            wireUserActions(container, 'total');
          }
        } catch (error) {
          showToast(error.message || 'Failed to delete user', 'error');
        }
      }
    });
  });
}

// Open edit user modal
async function openEditUserModal(userId, container) {
  try {
    const user = await loadUserById(userId);
    const [departments, designations] = await Promise.all([
      loadDepartments(),
      loadDesignations(user.department_id || null)
    ]);

    const modal = container.querySelector('#modal-edit-user');
    const form = container.querySelector('#form-edit-user');
    
    if (!modal || !form) return;

    // Populate form fields
    form.querySelector('#edit-user-id').value = user.id;
    form.querySelector('#edit-user-name').value = user.name || '';
    form.querySelector('#edit-user-email').value = user.email || '';
    form.querySelector('#edit-user-username').value = user.username || '';
    form.querySelector('#edit-user-mobile').value = user.phone || '';
    form.querySelector('#edit-user-address').value = user.address || '';
    form.querySelector('#edit-user-status').value = user.status || 'pending';
    form.querySelector('#edit-user-role').value = user.role || 'user';

    // Populate department dropdown
    const deptSelect = form.querySelector('#edit-user-department');
    deptSelect.innerHTML = '<option value="">Select department</option>' +
      departments.map(d => `<option value="${d.id}" ${d.id === user.department_id ? 'selected' : ''}>${d.name}</option>`).join('');

    // Populate designation dropdown
    const desgSelect = form.querySelector('#edit-user-designation');
    desgSelect.innerHTML = '<option value="">Select designation</option>' +
      designations.map(d => `<option value="${d.id}" ${d.id === user.designation_id ? 'selected' : ''}>${d.title}</option>`).join('');

    // Update designations when department changes
    deptSelect.addEventListener('change', async (e) => {
      const deptId = e.target.value;
      if (!deptId) {
        desgSelect.innerHTML = '<option value="">Select department first</option>';
        desgSelect.disabled = true;
        return;
      }

      const deptDesignations = await loadDesignations(deptId);
      desgSelect.innerHTML = '<option value="">Select designation</option>' +
        deptDesignations.map(d => `<option value="${d.id}">${d.title}</option>`).join('');
      desgSelect.disabled = false;
    });

    // Wire form submission
    form.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      
      const userData = {
        name: formData.get('name')?.trim(),
        email: formData.get('email')?.trim(),
        username: formData.get('username')?.trim(),
        department_id: formData.get('department_id'),
        designation_id: formData.get('designation_id'),
        mobile: formData.get('mobile')?.trim(),
        address: formData.get('address')?.trim(),
        status: formData.get('status'),
        role: formData.get('role')
      };

      try {
        await updateUser(userId, userData);
        showToast('User updated successfully', 'success');
        modal.classList.add('hidden');
        
        // Refresh appropriate page
        const route = window.location.hash.replace("#", "").trim();
        if (route === 'admin/active-users') {
          await refreshActiveUsersPage(container);
          wireUserActions(container, 'active');
        } else if (route === 'admin/pending-users') {
          await refreshPendingUsersPage(container);
          wireUserActions(container, 'pending');
        } else if (route === 'admin/total-users') {
          await refreshTotalUsersPage(container);
          wireUserActions(container, 'total');
        }
      } catch (error) {
        showToast(error.message || 'Failed to update user', 'error');
      }
    };

    modal.classList.remove('hidden');
  } catch (error) {
    console.error('[Admin] Error opening edit user modal:', error);
    showToast('Failed to load user details', 'error');
  }
}

// Open reset password modal
async function openResetPasswordModal(userId, container, pageType) {
  try {
    const user = await loadUserById(userId);
    const modal = container.querySelector('#modal-reset-password');
    const form = container.querySelector('#form-reset-password');

    if (!modal || !form) return;

    form.querySelector('#reset-user-id').value = user.id;
    form.querySelector('#reset-user-name').textContent = user.name || '--';
    form.querySelector('#reset-user-email').textContent = user.email || '';
    form.querySelector('#reset-user-password').value = '';
    form.querySelector('#reset-user-password-confirm').value = '';

    modal.classList.remove('hidden');

    if (!form.dataset.bound) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pwd = form.querySelector('#reset-user-password').value.trim();
        const confirmPwd = form.querySelector('#reset-user-password-confirm').value.trim();
        const targetUserId = form.querySelector('#reset-user-id').value;

        if (pwd.length < 6) {
          showToast('Password must be at least 6 characters', 'error');
          return;
        }
        if (pwd !== confirmPwd) {
          showToast('Passwords do not match', 'error');
          return;
        }

        try {
          await updateUserPassword(targetUserId, pwd);
          showToast('Password updated successfully', 'success');
          modal.classList.add('hidden');
          form.reset();

          if (pageType === 'active') {
            await refreshActiveUsersPage(container);
            wireUserActions(container, 'active');
          } else if (pageType === 'pending') {
            await refreshPendingUsersPage(container);
            wireUserActions(container, 'pending');
          } else if (pageType === 'total') {
            await refreshTotalUsersPage(container);
            wireUserActions(container, 'total');
          }
        } catch (error) {
          showToast(error.message || 'Failed to update password', 'error');
        }
      });
      form.dataset.bound = 'true';
    }
  } catch (error) {
    console.error('[Admin] Error opening reset password modal:', error);
    showToast(error.message || 'Failed to open password reset', 'error');
  }
}

// Hydrate active users page
export async function hydrateActiveUsersPage(container) {
  await refreshActiveUsersPage(container);
  wireUserActions(container, 'active');
  
  // Load departments and designations for filters
  const [departments] = await Promise.all([loadDepartments()]);
  
  const deptFilter = container.querySelector('#active-users-filter-dept');
  const desgFilter = container.querySelector('#active-users-filter-desg');
  const searchInput = container.querySelector('#active-users-search');
  const refreshBtn = container.querySelector('[data-action="refresh-active-users"]');

  if (deptFilter) {
    deptFilter.innerHTML = '<option value="">All Departments</option>' +
      departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    
    deptFilter.addEventListener('change', async () => {
      const deptId = deptFilter.value;
      if (deptId) {
        const designations = await loadDesignations(deptId);
        if (desgFilter) {
          desgFilter.innerHTML = '<option value="">All Designations</option>' +
            designations.map(d => `<option value="${d.id}">${d.title}</option>`).join('');
        }
      } else {
        if (desgFilter) {
          desgFilter.innerHTML = '<option value="">All Designations</option>';
        }
      }
      await refreshActiveUsersPage(container);
      wireUserActions(container, 'active');
    });
  }

  if (desgFilter) {
    desgFilter.addEventListener('change', async () => {
      await refreshActiveUsersPage(container);
      wireUserActions(container, 'active');
    });
  }

  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        await refreshActiveUsersPage(container);
        wireUserActions(container, 'active');
      }, 300);
    });
  }

  refreshBtn?.addEventListener('click', async () => {
    await refreshActiveUsersPage(container);
    wireUserActions(container, 'active');
  });
}

// Refresh pending users page
export async function refreshPendingUsersPage(container) {
  if (!container) container = document.getElementById('app-view');
  if (!container) return;

  try {
    // Get filters
    const deptFilter = container.querySelector('#pending-users-filter-dept')?.value || '';
    const desgFilter = container.querySelector('#pending-users-filter-desg')?.value || '';
    const searchTerm = container.querySelector('#pending-users-search')?.value?.toLowerCase() || '';
    
    let users = await loadPendingUsers();
    
    // Apply department filter
    if (deptFilter) {
      users = users.filter(u => u.department_id === deptFilter);
    }
    
    // Apply designation filter
    if (desgFilter) {
      users = users.filter(u => u.designation_id === desgFilter);
    }
    
    // Apply search filter
    if (searchTerm) {
      users = users.filter(u => 
        (u.name || '').toLowerCase().includes(searchTerm) ||
        (u.email || '').toLowerCase().includes(searchTerm) ||
        (u.username || '').toLowerCase().includes(searchTerm) ||
        (u.phone || '').toLowerCase().includes(searchTerm)
      );
    }
    
    renderPendingUsers(users, container);
  } catch (error) {
    console.error('[Admin] Error refreshing pending users page:', error);
    showToast('Failed to refresh pending users', 'error');
  }
}

// Hydrate pending users page
export async function hydratePendingUsersPage(container) {
  await refreshPendingUsersPage(container);
  wireUserActions(container, 'pending');
  
  // Load departments and designations for filters
  const [departments] = await Promise.all([loadDepartments()]);
  
  const deptFilter = container.querySelector('#pending-users-filter-dept');
  const desgFilter = container.querySelector('#pending-users-filter-desg');
  const searchInput = container.querySelector('#pending-users-search');
  const refreshBtn = container.querySelector('[data-action="refresh-pending-users"]');

  if (deptFilter) {
    deptFilter.innerHTML = '<option value="">All Departments</option>' +
      departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    
    deptFilter.addEventListener('change', async () => {
      const deptId = deptFilter.value;
      if (deptId) {
        const designations = await loadDesignations(deptId);
        if (desgFilter) {
          desgFilter.innerHTML = '<option value="">All Designations</option>' +
            designations.map(d => `<option value="${d.id}">${d.title}</option>`).join('');
        }
      } else {
        if (desgFilter) {
          desgFilter.innerHTML = '<option value="">All Designations</option>';
        }
      }
      await refreshPendingUsersPage(container);
      wireUserActions(container, 'pending');
    });
  }

  if (desgFilter) {
    desgFilter.addEventListener('change', async () => {
      await refreshPendingUsersPage(container);
      wireUserActions(container, 'pending');
    });
  }

  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        await refreshPendingUsersPage(container);
        wireUserActions(container, 'pending');
      }, 300);
    });
  }

  refreshBtn?.addEventListener('click', async () => {
    await refreshPendingUsersPage(container);
    wireUserActions(container, 'pending');
  });
}

// Hydrate total users page
export async function hydrateTotalUsersPage(container) {
  await refreshTotalUsersPage(container);
  wireUserActions(container, 'total');
  
  // Load departments and designations for filters
  const [departments] = await Promise.all([loadDepartments()]);
  
  const statusFilter = container.querySelector('#total-users-filter-status');
  const deptFilter = container.querySelector('#total-users-filter-dept');
  const desgFilter = container.querySelector('#total-users-filter-desg');
  const searchInput = container.querySelector('#total-users-search');
  const refreshBtn = container.querySelector('[data-action="refresh-total-users"]');

  if (deptFilter) {
    deptFilter.innerHTML = '<option value="">All Departments</option>' +
      departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    
    deptFilter.addEventListener('change', async () => {
      const deptId = deptFilter.value;
      if (deptId) {
        const designations = await loadDesignations(deptId);
        if (desgFilter) {
          desgFilter.innerHTML = '<option value="">All Designations</option>' +
            designations.map(d => `<option value="${d.id}">${d.title}</option>`).join('');
        }
      } else {
        if (desgFilter) {
          desgFilter.innerHTML = '<option value="">All Designations</option>';
        }
      }
      await refreshTotalUsersPage(container);
      wireUserActions(container, 'total');
    });
  }

  if (desgFilter) {
    desgFilter.addEventListener('change', async () => {
      await refreshTotalUsersPage(container);
      wireUserActions(container, 'total');
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', async () => {
      await refreshTotalUsersPage(container);
      wireUserActions(container, 'total');
    });
  }

  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        await refreshTotalUsersPage(container);
        wireUserActions(container, 'total');
      }, 300);
    });
  }

  refreshBtn?.addEventListener('click', async () => {
    await refreshTotalUsersPage(container);
    wireUserActions(container, 'total');
  });
}

// Hydrate departments page
export async function hydrateDepartmentsPage(container) {
  await refreshDepartmentsPage(container);
  
  // Wire up modals and buttons
  const addDeptBtn = container.querySelector('[data-action="add-department"]');
  const addDeptModal = container.querySelector('#modal-add-department');
  const addDeptForm = container.querySelector('#form-add-department');
  const refreshBtn = container.querySelector('[data-action="refresh-departments"]');

  addDeptBtn?.addEventListener('click', () => {
    addDeptModal?.classList.remove('hidden');
  });

  addDeptForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(addDeptForm);
    const name = formData.get('name')?.trim();

    if (!name) {
      showToast('Department name is required', 'error');
      return;
    }

    try {
      await addDepartment(name);
      showToast('Department added successfully', 'success');
      addDeptModal?.classList.add('hidden');
      addDeptForm.reset();
      await refreshDepartmentsPage(container);
    } catch (error) {
      showToast(error.message || 'Failed to add department', 'error');
    }
  });

  refreshBtn?.addEventListener('click', () => {
    refreshDepartmentsPage(container);
  });
}

// Hydrate designations page
export async function hydrateDesignationsPage(container) {
  await refreshDesignationsPage(container);
  
  // Load departments for filter and modal
  const departments = await loadDepartments();
  
  // Wire up filter
  const filterSelect = container.querySelector('#designations-filter-dept');
  if (filterSelect) {
    filterSelect.innerHTML = '<option value="">All Departments</option>' +
      departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    filterSelect.addEventListener('change', async () => {
      await refreshDesignationsPage(container);
    });
  }
  
  // Wire up modals and buttons
  const addDesgBtn = container.querySelector('[data-action="add-designation"]');
  const addDesgModal = container.querySelector('#modal-add-designation');
  const addDesgForm = container.querySelector('#form-add-designation');
  const refreshBtn = container.querySelector('[data-action="refresh-designations"]');
  const deptSelect = container.querySelector('#designation-dept-select');

  addDesgBtn?.addEventListener('click', () => {
    if (deptSelect) {
      deptSelect.innerHTML = '<option value="">Select department</option>' +
        departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    }
    addDesgModal?.classList.remove('hidden');
  });

  addDesgForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(addDesgForm);
    const departmentId = formData.get('department_id');
    const title = formData.get('title')?.trim();

    if (!departmentId || !title) {
      showToast('Department and title are required', 'error');
      return;
    }

    try {
      await addDesignation(departmentId, title);
      showToast('Designation added successfully', 'success');
      addDesgModal?.classList.add('hidden');
      addDesgForm.reset();
      await refreshDesignationsPage(container);
    } catch (error) {
      showToast(error.message || 'Failed to add designation', 'error');
    }
  });

  refreshBtn?.addEventListener('click', () => {
    refreshDesignationsPage(container);
  });
}

// Export functions for reports
export function exportToCSV(data, filename) {
  if (!data || data.length === 0) {
    showToast('No data to export', 'error');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = row[header] || '';
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('CSV exported successfully', 'success');
}

export function exportToPDF(data, title, filename) {
  // Simple PDF export using window.print() for now
  // In production, you might want to use a library like jsPDF
  showToast('PDF export: Use browser print function (Ctrl+P)', 'info');
  window.print();
}

// User Roles functions
const permissionOptions = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'create_report', label: 'Create Report' },
  { value: 'view_report', label: 'View Report' },
  { value: 'export_report', label: 'Export Report' },
  { value: 'users_create', label: 'Users - Create' },
  { value: 'users_view', label: 'Users - View' },
  { value: 'users_edit', label: 'Users - Edit' },
  { value: 'users_delete', label: 'Users - Delete' },
  { value: 'departments_create', label: 'Departments - Create' },
  { value: 'departments_view', label: 'Departments - View' },
  { value: 'departments_edit', label: 'Departments - Edit' },
  { value: 'departments_delete', label: 'Departments - Delete' },
  { value: 'designations_create', label: 'Designations - Create' },
  { value: 'designations_view', label: 'Designations - View' },
  { value: 'designations_edit', label: 'Designations - Edit' },
  { value: 'designations_delete', label: 'Designations - Delete' },
  { value: 'user_roles_create', label: 'User Roles - Create' },
  { value: 'user_roles_view', label: 'User Roles - View' },
  { value: 'user_roles_edit', label: 'User Roles - Edit' },
  { value: 'user_roles_delete', label: 'User Roles - Delete' },
  { value: 'products_create', label: 'Products - Create' },
  { value: 'products_view', label: 'Products - View' },
  { value: 'products_edit', label: 'Products - Edit' },
  { value: 'products_delete', label: 'Products - Delete' },
  { value: 'products_import', label: 'Products - Import' },
  { value: 'products_export', label: 'Products - Export' },
  { value: 'offers_create', label: 'Offers - Create' },
  { value: 'offers_view', label: 'Offers - View' },
  { value: 'boqs_create', label: 'BOQs - Create' },
  { value: 'boqs_view', label: 'BOQs - View' },
  { value: 'requests_create', label: 'Requests - Create' },
  { value: 'requests_view', label: 'Requests - View' },
];

function renderPermissionOptions(targetEl, selected = []) {
  if (!targetEl) return;
  const selectedSet = new Set(selected);
  targetEl.innerHTML = permissionOptions.map(opt => `
    <label class="flex items-center gap-2">
      <input type="checkbox" name="permissions" value="${opt.value}" class="checkbox" ${selectedSet.has(opt.value) ? 'checked' : ''}/>
      <span>${opt.label}</span>
    </label>
  `).join('');
}

export async function loadUserRoles() {
  try {
    const roles = await apiCall('/admin/user-roles');
    // Parse permissions JSON
    return roles.map(role => ({
      ...role,
      permissions: role.permissions ? JSON.parse(role.permissions) : []
    }));
  } catch (error) {
    console.error('[Admin] Error loading user roles:', error);
    throw error;
  }
}

export async function createUserRole(roleData) {
  try {
    const result = await apiCall('/admin/user-roles', {
      method: 'POST',
      body: JSON.stringify(roleData),
    });
    return result;
  } catch (error) {
    console.error('[Admin] Error creating user role:', error);
    throw error;
  }
}

export async function updateUserRole(id, roleData) {
  try {
    const result = await apiCall(`/admin/user-roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(roleData),
    });
    return result;
  } catch (error) {
    console.error('[Admin] Error updating user role:', error);
    throw error;
  }
}

export async function deleteUserRole(id) {
  try {
    const result = await apiCall(`/admin/user-roles/${id}`, {
      method: 'DELETE',
    });
    return result;
  } catch (error) {
    console.error('[Admin] Error deleting user role:', error);
    throw error;
  }
}

export async function loadUserRoleAssignments(userId = null) {
  try {
    const url = userId 
      ? `/admin/user-role-assignments?user_id=${userId}`
      : '/admin/user-role-assignments';
    const assignments = await apiCall(url);
    return assignments;
  } catch (error) {
    console.error('[Admin] Error loading user role assignments:', error);
    throw error;
  }
}

export async function assignRoleToUser(userId, roleId) {
  try {
    const result = await apiCall('/admin/user-role-assignments', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role_id: roleId }),
    });
    return result;
  } catch (error) {
    console.error('[Admin] Error assigning role to user:', error);
    throw error;
  }
}

export async function removeRoleAssignment(id) {
  try {
    const result = await apiCall(`/admin/user-role-assignments/${id}`, {
      method: 'DELETE',
    });
    return result;
  } catch (error) {
    console.error('[Admin] Error removing role assignment:', error);
    throw error;
  }
}

// Render user roles table
export function renderUserRoles(roles, container) {
  const tableContainer = container.querySelector('#user-roles-table');
  if (!tableContainer) return;

  if (!roles || roles.length === 0) {
    tableContainer.innerHTML = '<div class="text-center text-slate-500 p-4">No user roles. Create one to get started.</div>';
    return;
  }

  tableContainer.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Description</th>
          <th>Permissions</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${roles.map(role => {
          const permsAttr = encodeURIComponent(JSON.stringify(role.permissions || []));
          return `
          <tr>
            <td><strong>${role.name || '--'}</strong></td>
            <td>${role.description || '--'}</td>
            <td>
              <div class="flex flex-wrap gap-1">
                ${(role.permissions || []).map(p => `<span class="status-pill approved">${p}</span>`).join('')}
                ${(!role.permissions || role.permissions.length === 0) ? '<span class="text-slate-400">No permissions</span>' : ''}
              </div>
            </td>
            <td>${new Date(role.createdAt).toLocaleDateString()}</td>
            <td>
              <button class="btn btn-ghost btn-sm" data-edit-role="${role.id}" data-role-name="${role.name}" data-role-desc="${role.description || ''}" data-role-perms="${permsAttr}">Edit</button>
              <button class="btn btn-outline btn-sm text-red-600" data-delete-role="${role.id}">Delete</button>
            </td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

// Hydrate user roles page
export async function hydrateUserRolesPage(container) {
  try {
    // Load and render roles
    const roles = await loadUserRoles();
    renderUserRoles(roles, container);
    
    // Load users and roles for assignment dropdowns
    const [allUsers] = await Promise.all([loadAllUsers()]);
    
    const userSelect = container.querySelector('#assign-role-user-select');
    const roleSelect = container.querySelector('#assign-role-role-select');
    
    if (userSelect) {
      userSelect.innerHTML = '<option value="">Select user</option>' +
        allUsers.filter(u => u.status === 'approved').map(u => 
          `<option value="${u.id}">${u.name} (${u.email})</option>`
        ).join('');
    }
    
    if (roleSelect) {
      roleSelect.innerHTML = '<option value="">Select role</option>' +
        roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    }
    
    // Inline form references
    const addRoleBtn = container.querySelector('[data-action="add-user-role"]');
    const addRoleForm = container.querySelector('#form-add-user-role');
    const addPermsContainer = container.querySelector('#permissions-add-list');
    const addRoleResetBtn = container.querySelector('[data-action="reset-add-role"]');
    const addRolePanel = container.querySelector('#add-role-panel');
    const editRoleForm = container.querySelector('#form-edit-user-role');
    const editRolePanel = container.querySelector('#edit-role-panel');
    const editRoleCancelBtn = container.querySelector('[data-action="cancel-edit-role"]');
    const editPermsContainer = container.querySelector('#permissions-edit-list');
    const assignmentsTable = container.querySelector('#user-role-assignments-table');
    const refreshAssignmentsBtn = container.querySelector('[data-action="refresh-assignments"]');

    // Render permission checkboxes for add form (initial)
    renderPermissionOptions(addPermsContainer, []);
    addRoleResetBtn?.addEventListener('click', () => {
      renderPermissionOptions(addPermsContainer, []);
    });

    // Scroll to add form when clicking header button
    addRoleBtn?.addEventListener('click', () => {
      addRolePanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      renderPermissionOptions(addPermsContainer, []);
    });

    // Wire up add role form
    addRoleForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(addRoleForm);
      const name = formData.get('name')?.trim();
      const description = formData.get('description')?.trim();
      const permissions = formData.getAll('permissions');
      
      if (!name) {
        showToast('Role name is required', 'error');
        return;
      }
      
      try {
        await createUserRole({ name, description, permissions });
        showToast('Role created successfully', 'success');
        addRoleForm.reset();
        renderPermissionOptions(addPermsContainer, []); // reset checkboxes
        await hydrateUserRolesPage(container);
      } catch (error) {
        showToast(error.message || 'Failed to create role', 'error');
      }
    });
    
    // Wire up edit role form submission (inline)
    if (editRoleForm) {
      editRoleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(editRoleForm);
        const id = formData.get('id');
        const name = formData.get('name')?.trim();
        const description = formData.get('description')?.trim();
        const permissions = formData.getAll('permissions');

        if (!id || !name) {
          showToast('Role ID and name are required', 'error');
          return;
        }

        try {
          await updateUserRole(id, { name, description, permissions });
          showToast('Role updated', 'success');
          editRoleForm.reset();
          renderPermissionOptions(editPermsContainer, []);
          editRolePanel?.classList.add('hidden');
          await hydrateUserRolesPage(container);
        } catch (error) {
          showToast(error.message || 'Failed to update role', 'error');
        }
      });
    }

    // Cancel edit
    editRoleCancelBtn?.addEventListener('click', () => {
      editRoleForm?.reset();
      renderPermissionOptions(editPermsContainer, []);
      editRolePanel?.classList.add('hidden');
      addRolePanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Wire up assign role button
    const assignBtn = container.querySelector('[data-action="assign-role-to-user"]');
    assignBtn?.addEventListener('click', async () => {
      const userId = userSelect?.value;
      const roleId = roleSelect?.value;
      
      if (!userId || !roleId) {
        showToast('Please select both user and role', 'error');
        return;
      }
      
      try {
        await assignRoleToUser(userId, roleId);
        showToast('Role assigned successfully', 'success');
        userSelect.value = '';
        roleSelect.value = '';
        await renderAssignments(container); // refresh assignments list
      } catch (error) {
        showToast(error.message || 'Failed to assign role', 'error');
      }
    });
    
    // Wire up edit/delete buttons
    const tableContainer = container.querySelector('#user-roles-table');
    if (tableContainer) {
      tableContainer.querySelectorAll('[data-edit-role]').forEach(btn => {
        btn.addEventListener('click', () => {
          const roleId = btn.dataset.editRole;
          const roleName = btn.dataset.roleName;
          const roleDesc = btn.dataset.roleDesc;
          const rolePerms = JSON.parse(decodeURIComponent(btn.dataset.rolePerms || '%5B%5D'));
          
          if (!editRoleForm || !editPermsContainer || !editRolePanel) return;

          // Populate form
          editRoleForm.querySelector('input[name="id"]').value = roleId;
          editRoleForm.querySelector('input[name="name"]').value = roleName || '';
          editRoleForm.querySelector('textarea[name="description"]').value = roleDesc || '';
          renderPermissionOptions(editPermsContainer, rolePerms);

          editRolePanel.classList.remove('hidden');
          editRolePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
      
      tableContainer.querySelectorAll('[data-delete-role]').forEach(btn => {
        btn.addEventListener('click', () => {
          const roleId = btn.dataset.deleteRole;
          if (confirm('Are you sure you want to delete this role? This will remove all assignments.')) {
            deleteUserRole(roleId)
              .then(() => {
                showToast('Role deleted', 'success');
                hydrateUserRolesPage(container);
              })
              .catch(error => {
                showToast(error.message || 'Failed to delete role', 'error');
              });
          }
        });
      });
    }
    
    // Render assignments table
    async function renderAssignments(targetContainer) {
      if (!assignmentsTable) return;
      try {
        assignmentsTable.innerHTML = '<div class="loading-state text-slate-500 text-sm">Loading assignments...</div>';
        const assignments = await loadUserRoleAssignments();
        if (!assignments.length) {
          assignmentsTable.innerHTML = '<div class="text-center text-slate-500 p-4">No assignments found</div>';
          return;
        }
        assignmentsTable.innerHTML = `
          <table class="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Permissions</th>
                <th>Assigned At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${assignments.map(a => `
                <tr>
                  <td>${a.user_name || '--'}</td>
                  <td>${a.email || '--'}</td>
                  <td>${a.role_name || '--'}</td>
                  <td>
                    <div class="flex flex-wrap gap-1">
                      ${(a.permissions || []).map(p => `<span class="status-pill approved">${p}</span>`).join('')}
                      ${(!a.permissions || a.permissions.length === 0) ? '<span class="text-slate-400">No permissions</span>' : ''}
                    </div>
                  </td>
                  <td>${a.assignedAt ? new Date(a.assignedAt).toLocaleString() : '--'}</td>
                  <td>
                    <button class="btn btn-outline btn-sm text-red-600" data-remove-assignment="${a.id}">Remove</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;

        // Wire remove buttons
        assignmentsTable.querySelectorAll('[data-remove-assignment]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.removeAssignment;
            if (confirm('Remove this assignment?')) {
              try {
                await removeRoleAssignment(id);
                showToast('Assignment removed', 'success');
                await renderAssignments(targetContainer);
              } catch (error) {
                showToast(error.message || 'Failed to remove assignment', 'error');
              }
            }
          });
        });
      } catch (error) {
        console.error('[Admin] Error loading assignments:', error);
        assignmentsTable.innerHTML = '<div class="text-red-500 text-sm p-3">Failed to load assignments</div>';
      }
    }

    // Initial assignments load
    await renderAssignments(container);
    refreshAssignmentsBtn?.addEventListener('click', async () => {
      await renderAssignments(container);
    });

    // Refresh button
    const refreshBtn = container.querySelector('[data-action="refresh-user-roles"]');
    refreshBtn?.addEventListener('click', () => {
      hydrateUserRolesPage(container);
    });
  } catch (error) {
    console.error('[Admin] Error hydrating user roles page:', error);
    showToast('Failed to load user roles', 'error');
  }
}

// Load permission modules
export async function loadPermissionModules() {
  try {
    const modules = await apiCall('/admin/permissions/modules');
    return modules;
  } catch (error) {
    console.error('[Admin] Error loading permission modules:', error);
    throw error;
  }
}

// Load features for a module
export async function loadFeaturesForModule(module) {
  try {
    const features = await apiCall(`/admin/permissions/features?module=${encodeURIComponent(module)}`);
    return features;
  } catch (error) {
    console.error('[Admin] Error loading features:', error);
    throw error;
  }
}

// Load user permissions
export async function loadUserPermissions(userId) {
  try {
    const data = await apiCall(`/admin/permissions/user/${userId}`);
    return data;
  } catch (error) {
    console.error('[Admin] Error loading user permissions:', error);
    throw error;
  }
}

// Update user permissions
export async function updateUserPermissions(userId, permissions) {
  try {
    const result = await apiCall(`/admin/permissions/user/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    });
    return result;
  } catch (error) {
    console.error('[Admin] Error updating user permissions:', error);
    throw error;
  }
}

// Load role permissions
export async function loadRolePermissions(roleId) {
  try {
    const data = await apiCall(`/admin/permissions/role/${roleId}`);
    return data;
  } catch (error) {
    console.error('[Admin] Error loading role permissions:', error);
    throw error;
  }
}

// Update role permissions
export async function updateRolePermissions(roleId, permissions) {
  try {
    const result = await apiCall(`/admin/permissions/role/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    });
    return result;
  } catch (error) {
    console.error('[Admin] Error updating role permissions:', error);
    throw error;
  }
}

// Hydrate permissions management page
export async function hydratePermissionsPage(container) {
  try {
    const moduleSelect = container.querySelector('#permission-module');
    const featureSelect = container.querySelector('#permission-feature');
    const permissionsPanel = container.querySelector('#permissions-panel');
    const crudPermissionsList = container.querySelector('#crud-permissions-list');
    const assignmentPanel = container.querySelector('#assignment-panel');
    const userSelector = container.querySelector('#permission-user-select');
    const roleSelector = container.querySelector('#permission-role-select');
    const userSelectorContainer = container.querySelector('#user-selector-container');
    const roleSelectorContainer = container.querySelector('#role-selector-container');
    const assignBtn = container.querySelector('#btn-assign-permissions');
    const clearBtn = container.querySelector('#btn-clear-selection');
    const currentPermissionsDisplay = container.querySelector('#current-permissions-display');
    const assignTypeRadios = container.querySelectorAll('input[name="assign-type"]');

    let selectedModule = '';
    let selectedFeature = '';
    let selectedFeatureData = null;
    let currentUserPermissions = [];
    let currentRolePermissions = [];
    let selectedUserId = '';
    let selectedRoleId = '';

    // Load modules
    const modules = await loadPermissionModules();
    moduleSelect.innerHTML = '<option value="">Select Module</option>' +
      Object.keys(modules).map(m => `<option value="${m}">${m}</option>`).join('');

    // Load users and roles
    const [users, roles] = await Promise.all([
      loadAllUsers(),
      loadUserRoles()
    ]);

    userSelector.innerHTML = '<option value="">Select User</option>' +
      users.map(u => `<option value="${u.id}">${u.name} (${u.email})</option>`).join('');

    roleSelector.innerHTML = '<option value="">Select Role</option>' +
      roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('');

    // Module selection handler
    moduleSelect.addEventListener('change', async (e) => {
      selectedModule = e.target.value;
      if (!selectedModule) {
        featureSelect.innerHTML = '<option value="">Select Module First</option>';
        featureSelect.disabled = true;
        permissionsPanel.classList.add('hidden');
        assignmentPanel.classList.add('hidden');
        return;
      }

      const features = await loadFeaturesForModule(selectedModule);
      featureSelect.innerHTML = '<option value="">Select Feature</option>' +
        Object.keys(features).map(f => `<option value="${f}">${f}</option>`).join('');
      featureSelect.disabled = false;
      permissionsPanel.classList.add('hidden');
      assignmentPanel.classList.add('hidden');
    });

    // Feature selection handler
    featureSelect.addEventListener('change', async (e) => {
      selectedFeature = e.target.value;
      if (!selectedFeature || !selectedModule) {
        permissionsPanel.classList.add('hidden');
        assignmentPanel.classList.add('hidden');
        return;
      }

      const features = await loadFeaturesForModule(selectedModule);
      selectedFeatureData = features[selectedFeature];
      
      if (!selectedFeatureData) {
        permissionsPanel.classList.add('hidden');
        assignmentPanel.classList.add('hidden');
        return;
      }

      // Display CRUD permissions
      const permissionLabels = {
        'view_': 'View',
        'create_': 'Create/Add',
        'edit_': 'Edit/Update',
        'delete_': 'Delete'
      };

      crudPermissionsList.innerHTML = selectedFeatureData.permissions.map(perm => {
        const label = Object.keys(permissionLabels).find(key => perm.startsWith(key)) 
          ? permissionLabels[Object.keys(permissionLabels).find(key => perm.startsWith(key))]
          : perm;
        return `
          <label class="flex items-center gap-2">
            <input type="checkbox" class="input" value="${perm}" data-permission="${perm}" />
            <span>${label}</span>
          </label>
        `;
      }).join('');

      permissionsPanel.classList.remove('hidden');
      assignmentPanel.classList.remove('hidden');
    });

    // Assign type change handler
    assignTypeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'user') {
          userSelectorContainer.classList.remove('hidden');
          roleSelectorContainer.classList.add('hidden');
          selectedRoleId = '';
          roleSelector.value = '';
        } else {
          userSelectorContainer.classList.add('hidden');
          roleSelectorContainer.classList.remove('hidden');
          selectedUserId = '';
          userSelector.value = '';
        }
        currentPermissionsDisplay.innerHTML = '<div class="text-slate-500 text-sm">Select a user or role to view their current permissions</div>';
      });
    });

    // User selection handler
    userSelector.addEventListener('change', async (e) => {
      selectedUserId = e.target.value;
      if (!selectedUserId) {
        currentPermissionsDisplay.innerHTML = '<div class="text-slate-500 text-sm">Select a user to view their current permissions</div>';
        return;
      }

      try {
        const data = await loadUserPermissions(selectedUserId);
        currentUserPermissions = data.permissions || [];
        currentPermissionsDisplay.innerHTML = `
          <div class="space-y-2">
            <div class="font-medium">${data.user.name} (${data.user.email})</div>
            <div class="flex flex-wrap gap-1">
              ${currentUserPermissions.length > 0 
                ? currentUserPermissions.map(p => `<span class="status-pill approved">${p}</span>`).join('')
                : '<span class="text-slate-400">No permissions assigned</span>'
              }
            </div>
          </div>
        `;
      } catch (error) {
        showToast('Failed to load user permissions', 'error');
      }
    });

    // Role selection handler
    roleSelector.addEventListener('change', async (e) => {
      selectedRoleId = e.target.value;
      if (!selectedRoleId) {
        currentPermissionsDisplay.innerHTML = '<div class="text-slate-500 text-sm">Select a role to view their current permissions</div>';
        return;
      }

      try {
        const data = await loadRolePermissions(selectedRoleId);
        currentRolePermissions = data.permissions || [];
        currentPermissionsDisplay.innerHTML = `
          <div class="space-y-2">
            <div class="font-medium">${data.role.name}</div>
            <div class="flex flex-wrap gap-1">
              ${currentRolePermissions.length > 0 
                ? currentRolePermissions.map(p => `<span class="status-pill approved">${p}</span>`).join('')
                : '<span class="text-slate-400">No permissions assigned</span>'
              }
            </div>
          </div>
        `;
      } catch (error) {
        showToast('Failed to load role permissions', 'error');
      }
    });

    // Assign permissions handler
    assignBtn.addEventListener('click', async () => {
      if (!selectedFeatureData) {
        showToast('Please select a feature first', 'error');
        return;
      }

      const checkedPermissions = Array.from(crudPermissionsList.querySelectorAll('input[type="checkbox"]:checked'))
        .map(cb => cb.value);

      if (checkedPermissions.length === 0) {
        showToast('Please select at least one permission', 'error');
        return;
      }

      const assignType = document.querySelector('input[name="assign-type"]:checked')?.value;
      
      try {
        if (assignType === 'user') {
          if (!selectedUserId) {
            showToast('Please select a user', 'error');
            return;
          }

          // Merge with existing permissions
          const existingPerms = currentUserPermissions || [];
          const newPerms = [...new Set([...existingPerms, ...checkedPermissions])];
          
          await updateUserPermissions(selectedUserId, newPerms);
          showToast('Permissions assigned to user successfully', 'success');
          
          // Refresh user permissions display
          const data = await loadUserPermissions(selectedUserId);
          currentUserPermissions = data.permissions || [];
          currentPermissionsDisplay.innerHTML = `
            <div class="space-y-2">
              <div class="font-medium">${data.user.name} (${data.user.email})</div>
              <div class="flex flex-wrap gap-1">
                ${currentUserPermissions.length > 0 
                  ? currentUserPermissions.map(p => `<span class="status-pill approved">${p}</span>`).join('')
                  : '<span class="text-slate-400">No permissions assigned</span>'
                }
              </div>
            </div>
          `;

          // Emit event to refresh sidebar
          document.dispatchEvent(new CustomEvent('permissions:updated', { 
            detail: { userId: selectedUserId, permissions: newPerms } 
          }));
        } else {
          if (!selectedRoleId) {
            showToast('Please select a role', 'error');
            return;
          }

          // Merge with existing permissions
          const existingPerms = currentRolePermissions || [];
          const newPerms = [...new Set([...existingPerms, ...checkedPermissions])];
          
          await updateRolePermissions(selectedRoleId, newPerms);
          showToast('Permissions assigned to role successfully', 'success');
          
          // Refresh role permissions display
          const data = await loadRolePermissions(selectedRoleId);
          currentRolePermissions = data.permissions || [];
          currentPermissionsDisplay.innerHTML = `
            <div class="space-y-2">
              <div class="font-medium">${data.role.name}</div>
              <div class="flex flex-wrap gap-1">
                ${currentRolePermissions.length > 0 
                  ? currentRolePermissions.map(p => `<span class="status-pill approved">${p}</span>`).join('')
                  : '<span class="text-slate-400">No permissions assigned</span>'
                }
              </div>
            </div>
          `;
        }

        // Clear checkboxes
        crudPermissionsList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
      } catch (error) {
        showToast(error.message || 'Failed to assign permissions', 'error');
      }
    });

    // Clear selection handler
    clearBtn.addEventListener('click', () => {
      moduleSelect.value = '';
      featureSelect.value = '';
      featureSelect.disabled = true;
      permissionsPanel.classList.add('hidden');
      assignmentPanel.classList.add('hidden');
      selectedModule = '';
      selectedFeature = '';
      selectedFeatureData = null;
      crudPermissionsList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    });

    // Refresh button
    const refreshBtn = container.querySelector('[data-action="refresh-permissions"]');
    refreshBtn?.addEventListener('click', () => {
      hydratePermissionsPage(container);
    });
  } catch (error) {
    console.error('[Admin] Error hydrating permissions page:', error);
    showToast('Failed to load permissions page', 'error');
  }
}

