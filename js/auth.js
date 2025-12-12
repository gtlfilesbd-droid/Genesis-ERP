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
  console.log('[Auth] getCurrentUser called, stored exists:', !!stored);
  if (stored) {
    try {
      const user = JSON.parse(stored);
      console.log('[Auth] getCurrentUser: Parsed user object:', user);
      console.log('[Auth] getCurrentUser: user.permissions before processing:', user.permissions);
      console.log('[Auth] getCurrentUser: user.permissions type:', typeof user.permissions);
      console.log('[Auth] getCurrentUser: user.permissions is array:', Array.isArray(user.permissions));
      
      // Ensure permissions are parsed if they're a JSON string
      if (user && user.permissions && typeof user.permissions === 'string') {
        try {
          user.permissions = JSON.parse(user.permissions);
          console.log('[Auth] getCurrentUser: Parsed permissions from JSON string:', user.permissions);
        } catch (e) {
          console.warn('[Auth] getCurrentUser: Failed to parse permissions JSON, using empty array:', e);
          user.permissions = [];
        }
      } else if (user && !Array.isArray(user.permissions)) {
        console.warn('[Auth] getCurrentUser: Permissions is not an array, setting to empty array. Type:', typeof user.permissions, 'Value:', user.permissions);
        user.permissions = [];
      }
      
      console.log('[Auth] getCurrentUser: Final user.permissions:', user.permissions);
      console.log('[Auth] getCurrentUser: Final user.permissions length:', Array.isArray(user.permissions) ? user.permissions.length : 'N/A');
      
      return user;
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
    // Ensure permissions are parsed if they're a JSON string
    if (user.permissions && typeof user.permissions === 'string') {
      try {
        user.permissions = JSON.parse(user.permissions);
        console.log('[Auth] Parsed permissions from JSON string:', user.permissions);
      } catch (e) {
        console.warn('[Auth] Failed to parse permissions JSON, using empty array:', e);
        user.permissions = [];
      }
    } else if (!Array.isArray(user.permissions)) {
      console.warn('[Auth] Permissions is not an array, setting to empty array');
      user.permissions = [];
    }
    
    console.log('[Auth] ===== setCurrentUser START =====');
    console.log('[Auth] User ID:', user.id);
    console.log('[Auth] User name:', user.name);
    console.log('[Auth] User role:', user.role);
    console.log('[Auth] User permissions:', user.permissions);
    console.log('[Auth] Permissions type:', typeof user.permissions);
    console.log('[Auth] Permissions is array:', Array.isArray(user.permissions));
    console.log('[Auth] Permissions length:', Array.isArray(user.permissions) ? user.permissions.length : 'N/A');
    
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(ROLE_KEY, user.role || 'user');
    
    document.dispatchEvent(new CustomEvent("role:change", { detail: user.role }));
    // Trigger user data update event for UI refresh
    document.dispatchEvent(new CustomEvent("user:updated", { detail: user }));
    
    console.log('[Auth] ===== setCurrentUser END =====');
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
      console.warn('[Auth] No current user found, cannot refresh permissions');
      return null;
    }

    console.log('[Auth] Refreshing permissions for user:', user.id);
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
      cache: 'no-cache', // Ensure fresh data
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh permissions: ${response.status} ${response.statusText}`);
    }

    const profile = await response.json();
    
    // Ensure permissions is an array
    if (profile.permissions && typeof profile.permissions === 'string') {
      try {
        profile.permissions = JSON.parse(profile.permissions);
      } catch (e) {
        console.warn('[Auth] Failed to parse permissions JSON, using empty array');
        profile.permissions = [];
      }
    } else if (!Array.isArray(profile.permissions)) {
      profile.permissions = [];
    }
    
    console.log('[Auth] Refreshed permissions:', profile.permissions);
    setCurrentUser(profile);
    
    // Emit event for sidebar refresh
    document.dispatchEvent(new CustomEvent('permissions:refreshed', { detail: profile }));
    
    // Also trigger user:updated event for other listeners
    document.dispatchEvent(new CustomEvent('user:updated', { detail: profile }));
    
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

// Check if current user has a specific permission.
// Admin role bypasses permission checks to reduce friction for superusers.
export function hasPermission(requiredPermission) {
  if (!requiredPermission) return false;
  const user = getCurrentUser();
  if (!user) return false;

  // Admins are allowed by default
  if (user.role === 'admin') return true;

  // Legacy fallback: if permissions are not set or empty, allow access
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  if (permissions.length === 0) return true;

  return permissions.includes(requiredPermission);
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
      console.log('[Auth] ===== LOGIN SUCCESS =====');
      console.log('[Auth] Login response data.user:', data.user);
      console.log('[Auth] Login response data.user.permissions:', data.user.permissions);
      console.log('[Auth] Login response data.user.permissions type:', typeof data.user.permissions);
      console.log('[Auth] Login response data.user.permissions is array:', Array.isArray(data.user.permissions));
      console.log('[Auth] Login response data.user.permissions length:', Array.isArray(data.user.permissions) ? data.user.permissions.length : 'N/A');
      console.log('[Auth] Login response data.user.permissions (JSON):', JSON.stringify(data.user.permissions));
      setToken(data.token);
      setCurrentUser(data.user);
      console.log('[Auth] ===== END LOGIN SUCCESS =====');
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

