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

  // Wire up edit/delete buttons
  tableContainer.querySelectorAll('[data-edit-dept]').forEach(btn => {
    btn.addEventListener('click', () => {
      const deptId = btn.dataset.editDept;
      const deptName = btn.dataset.deptName;
      const newName = prompt('Enter new department name:', deptName);
      if (newName && newName.trim() && newName !== deptName) {
        updateDepartment(deptId, newName.trim())
          .then(() => {
            showToast('Department updated', 'success');
            refreshAdminDashboard();
          })
          .catch(error => {
            showToast(error.message || 'Failed to update department', 'error');
          });
      }
    });
  });

  tableContainer.querySelectorAll('[data-delete-dept]').forEach(btn => {
    btn.addEventListener('click', () => {
      const deptId = btn.dataset.deleteDept;
      if (confirm('Are you sure you want to delete this department? This will also delete all associated designations.')) {
        deleteDepartment(deptId)
          .then(() => {
            showToast('Department deleted', 'success');
            refreshAdminDashboard();
          })
          .catch(error => {
            showToast(error.message || 'Failed to delete department', 'error');
          });
      }
    });
  });
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

  // Wire up edit/delete buttons
  tableContainer.querySelectorAll('[data-edit-desg]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const desgId = btn.dataset.editDesg;
      const desgTitle = btn.dataset.desgTitle;
      const desgDept = btn.dataset.desgDept;
      
      const departments = await loadDepartments();
      const deptSelect = departments.map(d => 
        `<option value="${d.id}" ${d.id === desgDept ? 'selected' : ''}>${d.name}</option>`
      ).join('');
      
      const newTitle = prompt('Enter new designation title:', desgTitle);
      if (newTitle && newTitle.trim() && newTitle !== desgTitle) {
        updateDesignation(desgId, desgDept, newTitle.trim())
          .then(() => {
            showToast('Designation updated', 'success');
            refreshAdminDashboard();
          })
          .catch(error => {
            showToast(error.message || 'Failed to update designation', 'error');
          });
      }
    });
  });

  tableContainer.querySelectorAll('[data-delete-desg]').forEach(btn => {
    btn.addEventListener('click', () => {
      const desgId = btn.dataset.deleteDesg;
      if (confirm('Are you sure you want to delete this designation?')) {
        deleteDesignation(desgId)
          .then(() => {
            showToast('Designation deleted', 'success');
            refreshAdminDashboard();
          })
          .catch(error => {
            showToast(error.message || 'Failed to delete designation', 'error');
          });
      }
    });
  });
}

// Refresh admin dashboard
export async function refreshAdminDashboard() {
  const container = document.getElementById('app-view');
  if (!container) return;

  try {
    // Load all data
    const [pendingUsers, allUsers, departments, designations] = await Promise.all([
      loadPendingUsers(),
      loadAllUsers(),
      loadDepartments(),
      loadDesignations(),
    ]);

    // Update counts
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
  refreshAdminDashboard();

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
      refreshAdminDashboard();
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
      refreshAdminDashboard();
    } catch (error) {
      showToast(error.message || 'Failed to add designation', 'error');
    }
  });

  // Refresh button
  const refreshBtn = container.querySelector('[data-action="refresh-admin"]');
  refreshBtn?.addEventListener('click', () => {
    refreshAdminDashboard();
  });
}

