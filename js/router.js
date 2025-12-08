const routes = {
  // Public routes (no authentication required)
  login: "login.html",
  signup: "signup.html",
  
  // Protected routes (authentication required)
  "user/dashboard": "user/dashboard.html",
  "user/profile": "user/profile.html",
  "user/settings": "user/settings.html",
  "admin/dashboard": "admin/dashboard.html",
  dashboard: "dashboard.html", // Legacy, redirects based on role
  "offers-list": "offers-list.html",
  "offer-create": "offer-create.html",
  "offer-preview": "offer-preview.html",
  "boq-list": "boq-list.html",
  "boq-create": "boq-create.html",
  "boq-details": "boq-details.html",
  "requests-list": "requests-list.html",
  "request-create": "request-create.html",
  "request-details": "request-details.html",
  "add-product": "add_product.html",
  "product-database": "product_database.html",
  "product-details": "product_details.html",
  products: "products.html",
  reports: "reports.html",
};

// Routes that don't require authentication
const publicRoutes = ['login', 'signup'];

// Routes that require admin role
const adminOnlyRoutes = ['admin/dashboard'];

let outlet;

export function initRouter(target) {
  if (!target) {
    console.error('[Router] Cannot initialize router: target element is null');
    return;
  }
  outlet = target;
  console.log('[Router] Router initialized, outlet:', outlet);
  window.addEventListener("hashchange", handleRoute);
  // Load initial route
  console.log('[Router] Loading initial route...');
  handleRoute();
}

function resolvePage() {
  const hash = window.location.hash.replace("#", "").trim();
  if (!hash) {
    // Check authentication and redirect accordingly
    return null; // Will be handled in handleRoute
  }
  // Extract route and query params
  const [route, queryString] = hash.split("?");
  // Check if the route exists
  if (routes.hasOwnProperty(route)) {
    return route;
  }
  // If route doesn't exist, try to find it
  console.warn(`[Router] Route "${route}" not found in routes`);
  console.log(`[Router] Available routes:`, Object.keys(routes));
  return null; // Will be handled in handleRoute
}

export function getQueryParams() {
  const hash = window.location.hash.replace("#", "").trim();
  if (!hash) return {};
  const [route, queryString] = hash.split("?");
  if (!queryString) return {};
  const params = {};
  queryString.split("&").forEach((param) => {
    const [key, value] = param.split("=");
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value || "");
    }
  });
  console.log("[Router] getQueryParams - hash:", hash, "params:", params);
  return params;
}

async function handleRoute() {
  if (!outlet) {
    console.error('[Router] Outlet not initialized');
    return;
  }
  
  const pageKey = resolvePage();
  
  // Import auth functions dynamically to avoid circular dependencies
  const { isAuthenticated, isAdmin, verifyToken, getCurrentRole } = await import('./auth.js');
  
  // If no route specified, redirect based on authentication
  if (!pageKey) {
    try {
      const authenticated = await verifyToken();
      if (authenticated) {
        const role = getCurrentRole();
        if (role === 'admin') {
          window.location.hash = '#admin/dashboard';
          return;
        } else {
          window.location.hash = '#user/dashboard';
          return;
        }
      } else {
        window.location.hash = '#login';
        return;
      }
    } catch (error) {
      console.error('[Router] Error checking authentication:', error);
      window.location.hash = '#login';
      return;
    }
  }
  
  // Check if route requires authentication
  if (!publicRoutes.includes(pageKey)) {
    const authenticated = await verifyToken();
    if (!authenticated) {
      console.log('[Router] Authentication required, redirecting to login');
      window.location.hash = '#login';
      return;
    }
    
    // Check if route requires admin role
    if (adminOnlyRoutes.includes(pageKey)) {
      if (!isAdmin()) {
        console.log('[Router] Admin role required, redirecting to user dashboard');
        window.location.hash = '#user/dashboard';
        return;
      }
    }
  }
  
  // Handle legacy dashboard route
  if (pageKey === 'dashboard') {
    const role = getCurrentRole();
    if (role === 'admin') {
      window.location.hash = '#admin/dashboard';
      return;
    } else {
      window.location.hash = '#user/dashboard';
      return;
    }
  }
  
  const filename = routes[pageKey];
  
  console.log(`[Router] Resolved page: "${pageKey}" -> file: "${filename}"`);
  console.log(`[Router] Current hash: "${window.location.hash}"`);
  
  if (!filename) {
    console.error(`Route "${pageKey}" not found in routes`);
    outlet.innerHTML = `<div class="card"><h2>Route Error</h2><p>Route "${pageKey}" not found in routes.</p></div>`;
    return;
  }
  
  try {
    console.log(`[Router] Fetching page: ./pages/${filename}`);
    const res = await fetch(`./pages/${filename}`);
    if (!res.ok) {
      throw new Error(`Failed to load ${filename}: ${res.status} ${res.statusText}`);
    }
    const html = await res.text();
    if (!html || html.trim().length === 0) {
      throw new Error(`Page ${filename} is empty`);
    }
    outlet.innerHTML = html;
    console.log(`[Router] ✓ Loaded page: ${filename}`);
    document.dispatchEvent(
      new CustomEvent("route:change", { detail: { page: pageKey } })
    );
  } catch (error) {
    console.error("[Router] Error loading route:", error);
    console.error("[Router] Error stack:", error.stack);
    outlet.innerHTML = `<div class="card"><h2>Page Load Error</h2><p>Error loading ${filename}: ${error.message}</p><p class="text-sm text-slate-500 mt-2">Please check the browser console for more details.</p></div>`;
  }
}

