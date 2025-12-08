import { signup } from '../auth.js';
import { showToast } from '../notifications.js';

export function hydrateSignupForm(container) {
  const form = container.querySelector('#signup-form');
  if (!form) return;

  const errorDiv = container.querySelector('#signup-error');
  const successDiv = container.querySelector('#signup-success');

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

    // Validation
    if (!name || !email || !username || !password) {
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

      const result = await signup(name, email, username, password);

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

