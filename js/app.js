import { initRouter } from "./router.js";
import { mountFrame, hydratePage, unmountFrame } from "./ui.js";

// Suppress browser extension listener errors (not caused by our code)
// This error is harmless and comes from browser extensions interfering with the page
window.addEventListener('error', (event) => {
  if (event.message && typeof event.message === 'string' && event.message.includes('message channel closed')) {
    event.preventDefault();
    console.warn('[App] Suppressed browser extension error (safe to ignore):', event.message);
    return true;
  }
}, true);

// Handle unhandled promise rejections from extensions
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.message || event.reason?.toString() || '';
  if (typeof reason === 'string' && reason.includes('message channel closed')) {
    event.preventDefault();
    console.warn('[App] Suppressed browser extension promise rejection (safe to ignore)');
    return true;
  }
});

const view = document.getElementById("app-view");

async function bootstrap() {
  if (!view) {
    console.error('[App] App view element not found');
    return;
  }
  
  try {
    // Check if API server is available
    console.log('[App] Checking API server connection...');
    try {
      const response = await fetch('http://localhost:3001/api/products');
      if (!response.ok) {
        throw new Error('API server not responding');
      }
      console.log('[App] ✓ API server connected');
    } catch (error) {
      console.error('[App] ✗ API server not available:', error);
      view.innerHTML = `
        <div class="card">
          <h2>Server Connection Error</h2>
          <p>Cannot connect to the API server at http://localhost:3001</p>
          <p class="text-sm text-slate-500">Please make sure the server is running:</p>
          <pre class="bg-slate-100 p-4 rounded mt-2">npm install<br>npm start</pre>
        </div>
      `;
      return;
    }
    
    // Initialize router first (it will handle authentication redirects)
    console.log('[App] Initializing router...');
    initRouter(view);
    
    // Check if we're on a public route (login/signup) - don't mount frame for these
    const hash = window.location.hash.replace("#", "").trim();
    const publicRoutes = ['login', 'signup'];
    const isPublicRoute = publicRoutes.includes(hash);
    
    // Mount UI frame only if authenticated and not on public route
    const { verifyToken } = await import('./auth.js');
    const authenticated = await verifyToken();
    
    if (authenticated && !isPublicRoute) {
      console.log('[App] User authenticated, mounting UI frame...');
      await mountFrame();
    } else if (!isPublicRoute) {
      // Not authenticated and not on public route - router will redirect to login
      console.log('[App] User not authenticated, router will redirect to login...');
      // Ensure frame is hidden
      await unmountFrame();
    } else {
      console.log('[App] Public route, skipping frame mount...');
      // Ensure frame is hidden on public routes
      await unmountFrame();
    }
    
    console.log('[App] Bootstrap complete');
  } catch (error) {
    console.error('[App] Bootstrap error:', error);
    console.error('[App] Error stack:', error.stack);
    view.innerHTML = `
      <div class="card">
        <h2>Application Error</h2>
        <p>${error.message}</p>
        <p class="text-sm text-slate-500">Please check the browser console for details and refresh the page to try again.</p>
        <details class="mt-4">
          <summary class="cursor-pointer text-sm">Error Details</summary>
          <pre class="bg-slate-100 p-4 rounded mt-2 text-xs overflow-auto">${error.stack || 'No stack trace available'}</pre>
        </details>
      </div>
    `;
  }
}

document.addEventListener("route:change", (event) => {
  const container = view;
  if (!container) return;
  
  // Show loading state
  const loading = container.querySelector(".loading-state");
  if (loading) {
    loading.style.display = "flex";
  }
  
  // Small delay to ensure DOM is ready
  setTimeout(() => {
    hydratePage(container);
    if (loading) {
      loading.style.display = "none";
    }
    // Update active state for sidebar navigation
    const currentPage = event?.detail?.page;
    console.log(`[App] Route changed to: "${currentPage}"`);
    if (currentPage) {
      // Remove active class from all navigation items
      document.querySelectorAll("[data-route]").forEach((node) => {
        node.classList.remove("active");
      });
      // Add active class to the current page's navigation item
      const activeLinks = document.querySelectorAll(`[data-route="${currentPage}"]`);
      console.log(`[App] Found ${activeLinks.length} navigation item(s) for route "${currentPage}"`);
      activeLinks.forEach((node) => {
        node.classList.add("active");
        console.log(`[App] Set active on:`, node);
      });
    }
  }, 50);
});

document.addEventListener("DOMContentLoaded", bootstrap);

