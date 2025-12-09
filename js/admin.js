import { getAuthHeader, getCurrentUser } from './auth.js';
import { showToast } from './notifications.js';

const API_BASE_URL = 'http://localhost:3001/api';

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

// Load all users
export async function loadAllUsers() {
  try {
    const users = await apiCall('/admin/users');
    return users;
  } catch (error) {
    console.error('[Admin] Error loading users:', error);
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
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
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
        refreshAdminDashboard();
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
          refreshAdminDashboard();
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
    const allUsers = await loadAllUsers();
    const activeUsers = allUsers.filter(u => u.status === 'approved');
    renderActiveUsers(activeUsers, container);
  } catch (error) {
    console.error('[Admin] Error refreshing active users page:', error);
    showToast('Failed to refresh active users', 'error');
  }
}

export async function refreshTotalUsersPage(container) {
  if (!container) container = document.getElementById('app-view');
  if (!container) return;

  try {
    const allUsers = await loadAllUsers();
    renderTotalUsers(allUsers, container);
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
            <td>${user.role || 'user'}</td>
            <td><span class="status-pill ${user.status || 'approved'}">${user.status || 'approved'}</span></td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
              <button class="btn btn-ghost btn-sm" data-view-user="${user.id}">View</button>
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
            <td>${user.role || 'user'}</td>
            <td><span class="status-pill ${user.status || 'pending'}">${user.status || 'pending'}</span></td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
              <button class="btn btn-ghost btn-sm" data-view-user="${user.id}">View</button>
              ${user.status === 'pending' ? `
                <button class="btn btn-primary btn-sm" data-approve-user="${user.id}">Approve</button>
                <button class="btn btn-outline btn-sm" data-reject-user="${user.id}">Reject</button>
              ` : ''}
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
        loadAndRenderTotalUsers(container);
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
          loadAndRenderTotalUsers(container);
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
}

// Load and render total users
export async function loadAndRenderTotalUsers(container) {
  await refreshTotalUsersPage(container);
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
        ${roles.map(role => `
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
              <button class="btn btn-ghost btn-sm" data-edit-role="${role.id}" data-role-name="${role.name}" data-role-desc="${role.description || ''}" data-role-perms="${JSON.stringify(role.permissions || [])}">Edit</button>
              <button class="btn btn-outline btn-sm text-red-600" data-delete-role="${role.id}">Delete</button>
            </td>
          </tr>
        `).join('')}
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
    
    // Wire up add role button
    const addRoleBtn = container.querySelector('[data-action="add-user-role"]');
    const addRoleModal = container.querySelector('#modal-add-user-role');
    const addRoleForm = container.querySelector('#form-add-user-role');
    
    addRoleBtn?.addEventListener('click', () => {
      addRoleModal?.classList.remove('hidden');
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
        addRoleModal?.classList.add('hidden');
        addRoleForm.reset();
        await hydrateUserRolesPage(container);
      } catch (error) {
        showToast(error.message || 'Failed to create role', 'error');
      }
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
          const rolePerms = JSON.parse(btn.dataset.rolePerms || '[]');
          
          // For now, use prompt for editing (can be enhanced with modal)
          const newName = prompt('Enter new role name:', roleName);
          if (newName && newName.trim() && newName !== roleName) {
            updateUserRole(roleId, { name: newName.trim(), description: roleDesc, permissions: rolePerms })
              .then(() => {
                showToast('Role updated', 'success');
                hydrateUserRolesPage(container);
              })
              .catch(error => {
                showToast(error.message || 'Failed to update role', 'error');
              });
          }
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

