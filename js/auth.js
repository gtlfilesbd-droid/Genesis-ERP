const TOKEN_KEY = "genesis-token";
const USER_KEY = "genesis-user";
const ROLE_KEY = "genesis-role";
const API_BASE_URL = 'http://localhost:3001/api';

// Get authentication token
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Set authentication token
export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
}
}

// Get current user
export function getCurrentUser() {
  const stored = localStorage.getItem(USER_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (err) {
      console.warn("[Auth] Unable to parse stored user", err);
      return null;
    }
  }
  return null;
}

// Set current user
export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(ROLE_KEY, user.role || 'user');
    console.log('[Auth] setCurrentUser role:', user.role, 'permissions:', user.permissions);
    document.dispatchEvent(new CustomEvent("role:change", { detail: user.role }));
    // Trigger user data update event for UI refresh
    document.dispatchEvent(new CustomEvent("user:updated", { detail: user }));
  } else {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
  }
}

// Refresh user profile from server
export async function refreshUserProfile() {
  try {
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to refresh profile');
    }

    const profile = await response.json();
    setCurrentUser(profile);
    return profile;
  } catch (error) {
    console.error('[Auth] Error refreshing user profile:', error);
    throw error;
  }
}

// Refresh user permissions (for current user)
export async function refreshUserPermissions() {
  try {
    const user = getCurrentUser();
    if (!user || !user.id) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to refresh permissions');
    }

    const profile = await response.json();
    setCurrentUser(profile);
    
    // Emit event for sidebar refresh
    document.dispatchEvent(new CustomEvent('permissions:refreshed', { detail: profile }));
    
    return profile;
  } catch (error) {
    console.error('[Auth] Error refreshing user permissions:', error);
    throw error;
  }
}

// Get current role
export function getCurrentRole() {
  const user = getCurrentUser();
  if (user) {
    return user.role || 'user';
  }
  return null;
}

// Set current role
export function setCurrentRole(role) {
  localStorage.setItem(ROLE_KEY, role);
  const user = getCurrentUser();
  if (user) {
    user.role = role;
    setCurrentUser(user);
  }
  document.dispatchEvent(new CustomEvent("role:change", { detail: role }));
}

// Check if user is authenticated
export function isAuthenticated() {
  return !!getToken() && !!getCurrentUser();
}

// Check if user is admin
export function isAdmin() {
  return getCurrentRole() === 'admin';
}

// Login function
export async function login(username, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
}

    if (data.success && data.token && data.user) {
      console.log('[Auth] login success role:', data.user.role, 'permissions:', data.user.permissions);
      setToken(data.token);
      setCurrentUser(data.user);
      return { success: true, user: data.user };
    }

    throw new Error('Invalid response from server');
  } catch (error) {
    console.error('[Auth] Login error:', error);
    throw error;
  }
}

// Signup function
export async function signup(name, email, username, password, departmentId, designationId, mobile, address) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        name, 
        email, 
        username, 
        password, 
        department_id: departmentId,
        designation_id: designationId,
        mobile,
        address
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Signup failed');
    }

    return { success: true, message: data.message };
  } catch (error) {
    console.error('[Auth] Signup error:', error);
    throw error;
  }
}

// Logout function
export async function logout() {
  setToken(null);
  setCurrentUser(null);
  
  // Unmount frame (sidebar and navbar)
  try {
    const { unmountFrame } = await import('./ui.js');
    await unmountFrame();
  } catch (error) {
    console.error('[Auth] Error unmounting frame:', error);
  }
  
  // Show logout message (if notifications are available)
  try {
    import('./notifications.js').then(({ showToast }) => {
      showToast('Logged out successfully', 'success');
    }).catch(() => {
      // Notifications module not available, skip
    });
  } catch (error) {
    // Ignore errors
  }
  
  window.location.hash = '#login';
}

// Verify token with server
export async function verifyToken() {
  const token = getToken();
  if (!token) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      logout();
      return false;
    }

    const data = await response.json();
    if (data.success && data.user) {
      console.log('[Auth] verify token role:', data.user.role, 'permissions:', data.user.permissions);
      setCurrentUser(data.user);
      return true;
    }

    return false;
  } catch (error) {
    console.error('[Auth] Token verification error:', error);
    logout();
    return false;
  }
}

// Get authorization header for API calls
export function getAuthHeader() {
  const token = getToken();
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

// Apply role-based visibility
export function applyRoleVisibility(role) {
  document.querySelectorAll("[data-role]").forEach((node) => {
    const allowed = node.dataset.role.split(",").map((item) => item.trim());
    const isVisible = allowed.includes(role);
    node.classList.toggle("hidden-role", !isVisible);
  });
}

// Legacy function for backward compatibility
export function mockLogin(role) {
  setCurrentRole(role);
  return Promise.resolve({
    user: getCurrentUser(),
    role,
  });
}

