import { getAuthHeader } from '../auth.js';
import { showToast } from '../notifications.js';

const API_BASE_URL = 'http://localhost:3001/api';

// Helper for API calls with auth
async function apiCall(endpoint, options = {}) {
  const authHeaders = getAuthHeader();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return await response.json();
}

// Get current user profile
export async function getUserProfile() {
  try {
    const profile = await apiCall('/user/profile');
    return profile;
  } catch (error) {
    console.error('[Profile] Error getting user profile:', error);
    throw error;
  }
}

// Update user profile
export async function updateUserProfile(profileData) {
  try {
    const result = await apiCall('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    return result;
  } catch (error) {
    console.error('[Profile] Error updating user profile:', error);
    throw error;
  }
}

// Change user password
export async function changePassword(currentPassword, newPassword, confirmPassword) {
  try {
    const result = await apiCall('/user/password', {
      method: 'PUT',
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    });
    return result;
  } catch (error) {
    console.error('[Profile] Error changing password:', error);
    throw error;
  }
}

// Convert image file to base64
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Invalid file type. Please select an image file.'));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      reject(new Error('Image size must be less than 2MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Get user initials from name
export function getUserInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// Format date for display
export function formatDate(dateString) {
  if (!dateString) return '--';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch (error) {
    return dateString;
  }
}

// Update avatar display (used in navbar and profile pages)
export function updateAvatarDisplay(profilePicture, name, elements) {
  const initials = getUserInitials(name);
  
  elements.forEach(({ avatar, img, initialsSpan }) => {
    if (avatar) {
      if (profilePicture && profilePicture.startsWith('data:image')) {
        if (img) {
          img.src = profilePicture;
          img.style.display = 'block';
          if (initialsSpan) initialsSpan.style.display = 'none';
        }
        avatar.style.background = 'transparent';
      } else {
        if (img) img.style.display = 'none';
        if (initialsSpan) {
          initialsSpan.textContent = initials;
          initialsSpan.style.display = 'flex';
        }
        avatar.style.background = 'var(--brand-primary, #3b82f6)';
      }
    }
    
    if (initialsSpan && !img) {
      initialsSpan.textContent = initials;
    }
  });
}

