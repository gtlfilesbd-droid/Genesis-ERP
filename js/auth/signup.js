import { signup } from '../auth.js';
import { showToast } from '../notifications.js';

const API_BASE_URL = 'http://localhost:3001/api';

// Load departments
async function loadDepartments() {
  try {
    const response = await fetch(`${API_BASE_URL}/departments`);
    if (!response.ok) {
      throw new Error('Failed to load departments');
    }
    return await response.json();
  } catch (error) {
    console.error('[Signup] Error loading departments:', error);
    throw error;
  }
}

// Load designations by department
async function loadDesignations(departmentId) {
  try {
    const url = departmentId 
      ? `${API_BASE_URL}/designations?department_id=${departmentId}`
      : `${API_BASE_URL}/designations`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to load designations');
    }
    return await response.json();
  } catch (error) {
    console.error('[Signup] Error loading designations:', error);
    throw error;
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
  loadDepartments().then(departments => {
    if (deptSelect) {
      deptSelect.innerHTML = '<option value="">Select department</option>' +
        departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    }
  }).catch(error => {
    console.error('[Signup] Failed to load departments:', error);
    showError('Failed to load departments. Please refresh the page.');
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
        desgSelect.innerHTML = '<option value="">Select designation</option>' +
          designations.map(d => `<option value="${d.id}">${d.title}</option>`).join('');
        desgSelect.disabled = false;
      } catch (error) {
        console.error('[Signup] Failed to load designations:', error);
        desgSelect.innerHTML = '<option value="">Error loading designations</option>';
        showError('Failed to load designations. Please try again.');
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

