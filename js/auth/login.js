import { login } from '../auth.js';
import { showToast } from '../notifications.js';

export function hydrateLoginForm(container) {
  const form = container.querySelector('#login-form');
  if (!form) return;

  const errorDiv = container.querySelector('#login-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    if (errorDiv) {
      errorDiv.classList.add('hidden');
      errorDiv.textContent = '';
    }

    const formData = new FormData(form);
    const username = formData.get('username')?.trim();
    const password = formData.get('password');

    if (!username || !password) {
      showError('Please fill in all fields');
      return;
    }

    try {
      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';

      const result = await login(username, password);

      if (result.success) {
        showToast('Login successful!', 'success');
        
        // Redirect based on role
        if (result.user.role === 'admin') {
          window.location.hash = '#admin/dashboard';
        } else {
          window.location.hash = '#user/dashboard';
        }
      }
    } catch (error) {
      showError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
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

