import { signup } from '../auth.js';
import { showToast } from '../notifications.js';

const API_BASE_URL = 'http://localhost:3001/api';

// Load departments
async function loadDepartments() {
  try {
    console.log('[Signup] Loading departments from API...');
    const response = await fetch(`${API_BASE_URL}/departments`);
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to load departments';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      console.error('[Signup] API error loading departments:', response.status, errorMessage);
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('[Signup] Loaded departments:', data.length, 'items');
    
    if (!Array.isArray(data)) {
      console.error('[Signup] Invalid response format - expected array, got:', typeof data);
      throw new Error('Invalid response from server');
    }
    
    if (data.length === 0) {
      console.warn('[Signup] No departments found in database');
    }
    
    return data;
  } catch (error) {
    console.error('[Signup] Error loading departments:', error);
    if (error.message) {
      throw error;
    }
    throw new Error('Network error: Unable to connect to server. Please check if the server is running.');
  }
}

// Load designations by department
async function loadDesignations(departmentId) {
  try {
    const url = departmentId 
      ? `${API_BASE_URL}/designations?department_id=${departmentId}`
      : `${API_BASE_URL}/designations`;
    
    console.log('[Signup] Loading designations from API:', url);
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to load designations';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      console.error('[Signup] API error loading designations:', response.status, errorMessage);
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('[Signup] Loaded designations:', data.length, 'items');
    
    if (!Array.isArray(data)) {
      console.error('[Signup] Invalid response format - expected array, got:', typeof data);
      throw new Error('Invalid response from server');
    }
    
    if (data.length === 0) {
      console.warn('[Signup] No designations found for department:', departmentId);
    }
    
    return data;
  } catch (error) {
    console.error('[Signup] Error loading designations:', error);
    if (error.message) {
      throw error;
    }
    throw new Error('Network error: Unable to connect to server. Please check if the server is running.');
  }
}

export function hydrateSignupForm(container) {
  const form = container.querySelector('#signup-form');
  if (!form) return;

  const errorDiv = container.querySelector('#signup-error');
  const successDiv = container.querySelector('#signup-success');
  const deptSelect = container.querySelector('#signup-department');
  const desgSelect = container.querySelector('#signup-designation');

  // Load departments on form load
  if (deptSelect) {
    deptSelect.disabled = true;
    deptSelect.innerHTML = '<option value="">Loading departments...</option>';
  }
  
  loadDepartments()
    .then(departments => {
      if (deptSelect) {
        if (departments.length === 0) {
          deptSelect.innerHTML = '<option value="">No departments available</option>';
          showError('No departments found. Please contact administrator.');
        } else {
          deptSelect.innerHTML = '<option value="">Select department</option>' +
            departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
          deptSelect.disabled = false;
          console.log('[Signup] Departments dropdown populated successfully');
        }
      }
    })
    .catch(error => {
      console.error('[Signup] Failed to load departments:', error);
      if (deptSelect) {
        deptSelect.innerHTML = '<option value="">Error loading departments</option>';
        deptSelect.disabled = true;
      }
      showError(error.message || 'Failed to load departments. Please refresh the page or contact administrator.');
    });

  // Load designations when department changes
  deptSelect?.addEventListener('change', async (e) => {
    const departmentId = e.target.value;
    if (desgSelect) {
      if (!departmentId) {
        desgSelect.innerHTML = '<option value="">Select department first</option>';
        desgSelect.disabled = true;
        return;
      }

      desgSelect.disabled = true;
      desgSelect.innerHTML = '<option value="">Loading...</option>';

      try {
        const designations = await loadDesignations(departmentId);
        if (designations.length === 0) {
          desgSelect.innerHTML = '<option value="">No designations available</option>';
          showError('No designations found for selected department. Please contact administrator.');
        } else {
          desgSelect.innerHTML = '<option value="">Select designation</option>' +
            designations.map(d => `<option value="${d.id}">${d.title}</option>`).join('');
          console.log('[Signup] Designations dropdown populated successfully');
        }
        desgSelect.disabled = false;
      } catch (error) {
        console.error('[Signup] Failed to load designations:', error);
        desgSelect.innerHTML = '<option value="">Error loading designations</option>';
        desgSelect.disabled = true;
        showError(error.message || 'Failed to load designations. Please try again.');
      }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous messages
    if (errorDiv) {
      errorDiv.classList.add('hidden');
      errorDiv.textContent = '';
    }
    if (successDiv) {
      successDiv.classList.add('hidden');
      successDiv.textContent = '';
    }

    const formData = new FormData(form);
    const name = formData.get('name')?.trim();
    const email = formData.get('email')?.trim();
    const username = formData.get('username')?.trim();
    const password = formData.get('password');
    const departmentId = formData.get('department_id');
    const designationId = formData.get('designation_id');
    const mobile = formData.get('mobile')?.trim();
    const address = formData.get('address')?.trim();

    // Validation
    if (!name || !email || !username || !password || !departmentId || !designationId || !mobile || !address) {
      showError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters long');
      return;
    }

    if (!email.includes('@')) {
      showError('Please enter a valid email address');
      return;
    }

    try {
      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';

      const result = await signup(name, email, username, password, departmentId, designationId, mobile, address);

      if (result.success) {
        // Show success message
        if (successDiv) {
          successDiv.textContent = result.message || 'Account created successfully! Please wait for admin approval.';
          successDiv.classList.remove('hidden');
        } else {
          showToast(result.message || 'Account created successfully!', 'success');
        }

        // Clear form
        form.reset();
        if (desgSelect) {
          desgSelect.disabled = true;
          desgSelect.innerHTML = '<option value="">Select department first</option>';
        }

        // Redirect to login after 2 seconds
        setTimeout(() => {
          window.location.hash = '#login';
        }, 2000);
      }
    } catch (error) {
      showError(error.message || 'Signup failed. Please try again.');
    } finally {
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  });

  function showError(message) {
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.remove('hidden');
    } else {
      showToast(message, 'error');
    }
  }
}

