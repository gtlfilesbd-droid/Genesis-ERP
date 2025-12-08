// Toast notification system
let toastContainer = null;

function initToastContainer() {
  if (toastContainer) return toastContainer;
  toastContainer = document.createElement("div");
  toastContainer.id = "toast-container";
  toastContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 400px;
  `;
  document.body.appendChild(toastContainer);
  return toastContainer;
}

export function showToast(message, type = "info", duration = 3000) {
  const container = initToastContainer();
  const toast = document.createElement("div");
  
  const colors = {
    success: { bg: "#10b981", text: "#fff" },
    error: { bg: "#ef4444", text: "#fff" },
    warning: { bg: "#f59e0b", text: "#fff" },
    info: { bg: "#2563eb", text: "#fff" },
  };
  
  const style = colors[type] || colors.info;
  
  toast.style.cssText = `
    background-color: ${style.bg};
    color: ${style.text};
    padding: 1rem 1.25rem;
    border-radius: 0.75rem;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    animation: slideIn 0.3s ease;
    font-size: 0.9rem;
    font-weight: 500;
  `;
  
  toast.innerHTML = `
    <span>${message}</span>
    <button style="background:none;border:none;color:inherit;cursor:pointer;font-size:1.2rem;opacity:0.8;">&times;</button>
  `;
  
  const closeBtn = toast.querySelector("button");
  const close = () => {
    toast.style.animation = "slideOut 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  };
  
  closeBtn.addEventListener("click", close);
  
  if (duration > 0) {
    setTimeout(close, duration);
  }
  
  container.appendChild(toast);
  return toast;
}

// Add CSS animations
if (!document.getElementById("toast-styles")) {
  const style = document.createElement("style");
  style.id = "toast-styles";
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

