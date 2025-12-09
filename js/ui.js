import {
  getOffers,
  addOffer,
  updateOffer,
  getBoqs,
  addBoq,
  updateBoq,
  getRequests,
  addRequest,
  updateRequest,
  getProducts,
  addProduct,
  updateProduct,
  getProductById,
  deleteProduct,
  importProducts,
  exportProductsToCSV,
  exportProductsToJSON,
  activityLog,
  approvalTimeline,
} from "./data.js";
import { renderCharts } from "./charts.js";
import { applyRoleVisibility, getCurrentRole, setCurrentRole, getCurrentUser } from "./auth.js";
import { showToast } from "./notifications.js";
import { getQueryParams } from "./router.js";

async function loadComponent(id, file) {
  const target = document.getElementById(id);
  if (!target) {
    console.warn(`[UI] Component target "${id}" not found`);
    return;
  }
  try {
    console.log(`[UI] Loading component: ${file} into #${id}`);
    const res = await fetch(`./components/${file}`);
    if (!res.ok) {
      throw new Error(`Failed to load component ${file}: ${res.status} ${res.statusText}`);
    }
    const html = await res.text();
    target.innerHTML = html;
    console.log(`[UI] ✓ Loaded component: ${file}`);
  } catch (error) {
    console.error(`[UI] Error loading component ${file}:`, error);
    target.innerHTML = `<div class="text-red-500 text-sm">Error loading component: ${file}</div>`;
  }
}

function toggleSidebar(force) {
  const shell = document.getElementById("sidebar");
  const sidebar = shell?.querySelector(".sidebar");
  if (!shell || !sidebar) return;

  const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
  if (isDesktop) {
    sidebar.classList.remove("open");
    shell.classList.remove("hidden");
    return;
  }

  const shouldOpen =
    typeof force === "boolean" ? force : !sidebar.classList.contains("open");

  sidebar.classList.toggle("open", shouldOpen);
  shell.classList.toggle("hidden", !shouldOpen);
}

let navigationWired = false;

function wireNavigation() {
  // Only wire once to avoid duplicate listeners
  if (navigationWired) {
    console.log("[Navigation] Already wired, skipping");
    return;
  }
  
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-route]");
    if (!link) return;
    
    // Prevent default anchor behavior
    event.preventDefault();
    event.stopPropagation();
    
    // Get the full href to preserve query parameters
    const href = link.getAttribute("href");
    const dataRoute = link.dataset.route;
    
    if (!href && !dataRoute) {
      console.warn("[Navigation] No route found for link:", link);
      return;
    }
    
    // Always prioritize href if it exists and starts with #, as it may contain query params
    // Only use data-route as fallback if href doesn't exist or isn't a hash link
    let targetHash;
    if (href && href.startsWith("#")) {
      // Use full href to preserve query parameters (e.g., #product-details?id=123)
      targetHash = href;
    } else if (dataRoute) {
      // Fallback to data-route if href is not a hash link
      targetHash = `#${dataRoute}`;
    } else if (href) {
      // Last resort: use href and add # if needed
      targetHash = href.startsWith("#") ? href : `#${href.replace("#", "")}`;
    } else {
      console.warn("[Navigation] No valid route found");
      return;
    }
    
    console.log(`[Navigation] Clicked link, navigating to: ${targetHash}`);
    console.log(`[Navigation] Link href: "${href}", data-route: "${dataRoute}"`);
    
    // Set the hash to trigger routing - this will fire hashchange event
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    } else {
      // If hash is already set, manually trigger route handler
      console.log("[Navigation] Hash already set, manually triggering route");
      const routerEvent = new CustomEvent("hashchange");
      window.dispatchEvent(routerEvent);
    }
  });
  
  navigationWired = true;
  console.log("[Navigation] Navigation wired successfully");
}

function wireModalRoot() {
  const modalRoot = document.getElementById("modal-root");
  if (!modalRoot) return;
  modalRoot.addEventListener("click", (event) => {
    if (event.target.dataset?.modalClose) {
      event.target.closest(".modal-backdrop")?.classList.add("hidden");
      return;
    }
    if (event.target.classList.contains("modal-backdrop")) {
      event.target.classList.add("hidden");
    }
  });
}

const FALLBACK_IMAGE =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHJ4PSIxMiIgZmlsbD0iI0VBRUVGQiIvPjxwYXRoIGQ9Ik0yMCAzNC41QzIyLjIwOSAzNC41IDI0IDMyLjcwOSAyNCAzMC41QzI0IDI4LjI5MSAyMi4yMDkgMjYuNSAyMC AyNi41QzE3Ljc5MSAyNi41IDE2IDI4LjI5MSAxNiAzMC41QzE2IDMyLjcwOSAxNy43OTEgMzQuNSAyMCAzNC41WiIgZmlsbD0iI0Q2RERFOCIvPjxjaXJjbGUgY3g9IjQxIiBjeT0iMjMiIHI9IjciIGZpbGw9IiNENkRERTgiLz48L3N2Zz4=";

function formatCurrency(value) {
  if (isNaN(value)) return "--";
  return `BDT ${Number(value).toLocaleString()}`;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadFile(filename, content, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function splitCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.length || line.endsWith(",")) {
    result.push(current.trim());
  }
  return result;
}

function parseCSVProducts(csv) {
  const lines = csv.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const headers = splitCSVLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = splitCSVLine(line);
    const product = {};
    headers.forEach((header, idx) => {
      product[header] = cols[idx];
    });
    return product;
  });
}

async function refreshProductSelectors() {
  const selects = [
    ...document.querySelectorAll("[data-offer-product]"),
    ...document.querySelectorAll("[data-boq-product-select]")
  ];
  await Promise.all(selects.map(select => populateProductSelect(select)));
}

async function populateProductSelect(select) {
  if (!select) return;
  try {
    const catalog = await getProducts();
    select.innerHTML =
      `<option value="">Select product</option>` +
      catalog
        .map(
          (p) =>
            `<option value="${p.id}" data-price="${p.unitPrice}" data-commission="${p.commission || 0}">${p.name} (${p.model || p.serial || "N/A"})</option>`
        )
        .join("");
  } catch (error) {
    console.error("[UI] Error populating product select:", error);
    select.innerHTML = '<option value="">Error loading products</option>';
  }
}

function hydrateOfferForm(container) {
  const select = container.querySelector("[data-offer-product]");
  const qtyInput = container.querySelector("[data-offer-qty]");
  const priceField = container.querySelector("[data-offer-price]");
  const commissionFields = container.querySelectorAll("[data-offer-commission]");
  const subtotalField = container.querySelector("[data-offer-subtotal]");
  const totalField = container.querySelector("[data-offer-total]");

  if (!select || !qtyInput || !priceField || !commissionFields.length || !subtotalField || !totalField) {
    return;
  }

  const recalc = async () => {
    const catalog = await getProducts();
    const selected = catalog.find((p) => p.id === select.value);
    const qty = Number(qtyInput.value) || 0;
    if (!selected || qty <= 0) {
      priceField.textContent = "--";
      commissionFields.forEach((node) => (node.textContent = "--"));
      subtotalField.textContent = "--";
      totalField.textContent = "--";
      return;
    }
    const subtotal = selected.unitPrice * qty;
    const commission = ((selected.commission || 0) / 100) * subtotal;
    priceField.textContent = `BDT ${selected.unitPrice.toLocaleString()}`;
    commissionFields.forEach(
      (node) => (node.textContent = `BDT ${commission.toFixed(2)}`)
    );
    subtotalField.textContent = `BDT ${subtotal.toLocaleString()}`;
    totalField.textContent = `BDT ${(subtotal + commission).toLocaleString()}`;
  };

  select?.addEventListener("change", recalc);
  qtyInput?.addEventListener("input", recalc);
  populateProductSelect(select);
}

function hydrateLineItems(container) {
  const wrapper = container.querySelector("[data-line-items]");
  if (!wrapper) return;
  const template = () => `
    <div class="line-item" data-item-row>
      <input type="text" placeholder="Description" class="input" />
      <input type="number" placeholder="Qty" class="input" value="1" min="1" />
      <input type="number" placeholder="Unit Cost" class="input" value="0" min="0" />
      <input type="number" placeholder="Line Total" class="input" value="0" min="0" />
      <button type="button" title="Remove">&times;</button>
    </div>
  `;
  const addBtn = container.querySelector("[data-add-line]");
  addBtn?.addEventListener("click", () => {
    wrapper.insertAdjacentHTML("beforeend", template());
  });
  wrapper?.addEventListener("click", (e) => {
    if (e.target.matches("button")) {
      e.target.closest("[data-item-row]")?.remove();
    }
  });
  if (wrapper && !wrapper.children.length) {
    wrapper.insertAdjacentHTML("beforeend", template());
  }
}

function hydrateRequestActivity(container) {
  const target = container.querySelector("[data-activity-log]");
  if (!target) return;
  target.innerHTML = activityLog
    .map(
      (entry) => `
      <div class="activity-entry">
        <div>
          <div class="font-semibold">${entry.action}</div>
          <div class="text-slate-500 text-sm">${entry.actor}</div>
        </div>
        <div class="meta">${entry.at}</div>
      </div>`
    )
    .join("");
}

function hydrateApprovalTimeline(container) {
  const target = container.querySelector("[data-approval-timeline]");
  if (!target) return;
  target.innerHTML = approvalTimeline
    .map(
      (step) => `
      <div class="timeline-item">
        <div class="font-semibold">${step.title}</div>
        <div class="text-sm text-slate-500">${step.by}</div>
        <div class="text-xs text-slate-500">${step.date}</div>
      </div>`
    )
    .join("");
}

async function hydrateTables(container) {
  const offers = await getOffers();
  const requests = await getRequests();
  const boqs = await getBoqs();

  container.querySelectorAll("[data-fill=offers]").forEach((node) => {
    node.innerHTML = offers
      .map(
        (offer) => `
      <tr>
        <td><a href="#offer-preview" data-route="offer-preview" style="color:var(--brand-primary);text-decoration:underline;">${offer.id}</a></td>
        <td>${offer.customer}</td>
        <td>${offer.department}</td>
        <td>$${offer.value.toLocaleString()}</td>
        <td><span class="status-pill ${offer.status.toLowerCase()}">${offer.status}</span></td>
        <td>${offer.owner}</td>
        <td>${offer.createdAt || ""}</td>
        <td><button class="btn btn-ghost btn-sm" data-view-offer="${offer.id}">View</button></td>
      </tr>`
      )
      .join("");
    
    // Add click handlers for view buttons
    node.querySelectorAll("[data-view-offer]").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.location.hash = `#offer-preview`;
      });
    });
  });

  container.querySelectorAll("[data-fill=requests]").forEach((node) => {
    node.innerHTML = requests
      .map(
        (req) => `
      <tr>
        <td><a href="#request-details" data-route="request-details" style="color:var(--brand-primary);text-decoration:underline;">${req.id}</a></td>
        <td>${req.type}</td>
        <td>${req.requester}</td>
        <td>$${req.amount.toLocaleString()}</td>
        <td><span class="status-pill ${req.status.toLowerCase()}">${req.status}</span></td>
        <td>${req.manager}</td>
        <td><button class="btn btn-ghost btn-sm" data-view-request="${req.id}">View</button></td>
      </tr>`
      )
      .join("");
    
    node.querySelectorAll("[data-view-request]").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.location.hash = `#request-details`;
      });
    });
  });

  container.querySelectorAll("[data-fill=boqs]").forEach((node) => {
    node.innerHTML = boqs
      .map(
        (boq) => `
      <tr>
        <td><a href="#boq-details" data-route="boq-details" style="color:var(--brand-primary);text-decoration:underline;">${boq.id}</a></td>
        <td>${boq.project}</td>
        <td>${boq.department}</td>
        <td>${boq.approver}</td>
        <td><span class="status-pill ${boq.status.toLowerCase().replace(" ", "")}">${boq.status}</span></td>
        <td><button class="btn btn-ghost btn-sm" data-view-boq="${boq.id}">Open</button></td>
      </tr>`
      )
      .join("");
    
    node.querySelectorAll("[data-view-boq]").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.location.hash = `#boq-details`;
      });
    });
  });
}

async function hydrateProductTable(container) {
  try {
    const catalog = await getProducts();
    container.querySelectorAll("[data-fill=products]").forEach((tbody) => {
      if (!catalog.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7">
              <div class="loading-state">
                <span class="loading-spinner"></span>
                No products available. Add your first product to get started.
              </div>
            </td>
          </tr>`;
        return;
      }

      tbody.innerHTML = catalog
        .map(
          (product, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>
            <div class="font-semibold">
              <a href="#product-details?id=${encodeURIComponent(product.id)}" data-route="product-details" style="color: var(--brand-primary); text-decoration: underline; cursor: pointer;">${product.name}</a>
            </div>
          </td>
          <td>${product.description ? (product.description.includes('<') ? product.description : product.description) : "--"}</td>
          <td>${product.brand || "--"}</td>
          <td>${product.model || "--"}</td>
          <td>${formatCurrency(product.unitPrice)}</td>
          <td>
            <img src="${product.image || FALLBACK_IMAGE}" alt="${product.name}" class="product-thumb" />
          </td>
        </tr>`
        )
        .join("");
    });
  } catch (error) {
    console.error("[UI] Error loading products:", error);
    container.querySelectorAll("[data-fill=products]").forEach((tbody) => {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="loading-state">
              <span class="text-red-500">Error loading products. Please refresh the page.</span>
            </div>
          </td>
        </tr>`;
    });
  }
}

function hydrateRichTextEditor(container) {
  const editor = container.querySelector(".rich-text-editor");
  if (!editor) return;

  const toolbar = editor.querySelector(".rich-text-toolbar");
  const content = editor.querySelector(".rich-text-content");
  const hiddenInput = editor.querySelector('input[name="description"]');
  const boldBtn = toolbar.querySelector('[data-command="bold"]');
  const fontSizeSelect = toolbar.querySelector('[data-command="fontSize"]');

  // Update hidden input when content changes
  function updateHiddenInput() {
    const html = content.innerHTML.trim();
    hiddenInput.value = html;
    // Update required validation
    if (html) {
      hiddenInput.setCustomValidity("");
    } else {
      hiddenInput.setCustomValidity("Product description is required");
    }
  }

  // Handle bold button
  boldBtn.addEventListener("click", (e) => {
    e.preventDefault();
    document.execCommand("bold", false, null);
    updateToolbarState();
    updateHiddenInput();
    content.focus();
  });

  // Handle font size select
  fontSizeSelect.addEventListener("change", (e) => {
    const size = e.target.value;
    if (size) {
      const sizeMap = { "1": "8px", "2": "10px", "3": "12px", "4": "14px", "5": "16px", "6": "18px", "7": "24px" };
      const fontSize = sizeMap[size] || "14px";
      
      // Apply font size using inline style
      const selection = window.getSelection();
      if (selection.rangeCount > 0 && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const span = document.createElement("span");
        span.style.fontSize = fontSize;
        try {
          range.surroundContents(span);
        } catch (e) {
          // If surroundContents fails, extract and wrap
          const contents = range.extractContents();
          span.appendChild(contents);
          range.insertNode(span);
        }
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // If no selection, apply to next typed text
        document.execCommand("fontSize", false, size);
        // Clean up font tags after a short delay
        setTimeout(() => {
          const fontElements = content.querySelectorAll("font[size]");
          fontElements.forEach((font) => {
            const span = document.createElement("span");
            span.style.fontSize = sizeMap[font.getAttribute("size")] || "14px";
            while (font.firstChild) {
              span.appendChild(font.firstChild);
            }
            font.parentNode.replaceChild(span, font);
          });
          updateHiddenInput();
        }, 10);
      }
    }
    fontSizeSelect.value = "";
    updateHiddenInput();
    content.focus();
  });

  // Update toolbar button states
  function updateToolbarState() {
    if (document.queryCommandState("bold")) {
      boldBtn.classList.add("active");
    } else {
      boldBtn.classList.remove("active");
    }
  }

  // Update on selection change
  content.addEventListener("keyup", () => {
    updateToolbarState();
    updateHiddenInput();
  });

  content.addEventListener("mouseup", () => {
    updateToolbarState();
  });

  content.addEventListener("input", () => {
    updateHiddenInput();
  });

  // Handle paste to clean up formatting
  content.addEventListener("paste", (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, text);
    updateHiddenInput();
  });

  // Initial update
  updateHiddenInput();
}

function hydrateProductForm(container) {
  const form = container.querySelector("[data-form=product-add]");
  if (!form) return;

  // Initialize rich text editor
  hydrateRichTextEditor(container);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // Get description from rich text editor
    const richTextContent = container.querySelector(".rich-text-content");
    const descriptionHtml = richTextContent ? richTextContent.innerHTML.trim() : "";
    
    if (!descriptionHtml) {
      showToast("Product description is required", "error");
      return;
    }

    const formData = new FormData(form);
    const requiredFields = ["name", "brand", "model", "manufacturer", "origin", "shipment", "quantity", "unit", "unitPrice"];
    const missing = requiredFields.filter((field) => !(formData.get(field) || "").toString().trim());
    if (missing.length) {
      showToast("Please complete all required fields", "error");
      return;
    }

    const imageFile = formData.get("image");
    if (!imageFile || !imageFile.size) {
      showToast("Product image is required", "error");
      return;
    }
    if (!imageFile.type.startsWith("image/")) {
      showToast("Unsupported image format", "error");
      return;
    }
    if (imageFile.size > 2 * 1024 * 1024) {
      showToast("Image must be smaller than 2MB", "error");
      return;
    }

    try {
      const imageData = await readFileAsDataURL(imageFile);
      const product = {
        name: formData.get("name").trim(),
        description: descriptionHtml, // Use HTML from rich text editor
        brand: formData.get("brand").trim(),
        model: formData.get("model").trim(),
        origin: formData.get("origin").trim(),
        shipment: formData.get("shipment").trim(),
        manufacturer: formData.get("manufacturer").trim(),
        quantity: Number(formData.get("quantity")) || 0,
        unit: formData.get("unit").trim(),
        unitPrice: Number(formData.get("unitPrice")) || 0,
        commission: Number(formData.get("commission")) || 0,
        format: formData.get("format") || "local",
        image: imageData,
        serial: formData.get("serial")?.trim() || `${formData.get("model") || "SN"}-${Date.now()}`,
      };

      const id = addProduct(product);
      showToast(`Product ${id} added successfully`, "success");
      form.reset();
      // Clear rich text editor
      if (richTextContent) {
        richTextContent.innerHTML = "";
      }
      await hydrateProductTable(document);
      await refreshProductSelectors();
    } catch (error) {
      console.error("Product image upload failed", error);
      showToast("Unable to process image", "error");
    }
  });
}

function hydrateProductImportExport(container) {
  // Database export/import
  container.querySelectorAll("[data-action=export-database]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        const { exportDatabaseAsFile } = await import("./db.js");
        const success = await exportDatabaseAsFile();
        if (success) {
          showToast("Database exported as data.db file", "success");
        } else {
          showToast("Failed to export database", "error");
        }
      } catch (error) {
        console.error("[UI] Error exporting database:", error);
        showToast("Error exporting database", "error");
      }
    });
  });

  container.querySelectorAll("[data-action=import-database]").forEach((input) => {
    input.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const { importDatabaseFromFile } = await import("./db.js");
        const success = await importDatabaseFromFile(file);
        if (success) {
          showToast("Database imported successfully. Refreshing page...", "success");
          // Reload the page to refresh data
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          showToast("Failed to import database", "error");
        }
      } catch (error) {
        console.error("[UI] Error importing database:", error);
        showToast("Error importing database", "error");
      }
      // Reset input
      event.target.value = "";
    });
  });

  container.querySelectorAll("[data-action=export-products-json]").forEach((btn) => {
    btn.addEventListener("click", () => {
      downloadFile("products.json", exportProductsToJSON(), "application/json");
      showToast("Product list exported (JSON)", "success");
    });
  });

  container.querySelectorAll("[data-action=export-products-csv]").forEach((btn) => {
    btn.addEventListener("click", () => {
      downloadFile("products.csv", exportProductsToCSV(), "text/csv");
      showToast("Product list exported (CSV)", "success");
    });
  });

  container.querySelectorAll("[data-action=import-products]").forEach((input) => {
    input.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        let imported = [];
        if (file.name.endsWith(".json")) {
          imported = JSON.parse(text);
        } else if (file.name.endsWith(".csv")) {
          imported = parseCSVProducts(text);
        } else {
          showToast("Unsupported file format", "error");
          return;
        }
        const count = importProducts(imported);
        showToast(`Imported ${count} products`, "success");
        hydrateProductTable(document);
        refreshProductSelectors();
      } catch (error) {
        console.error("Import failed", error);
        showToast("Unable to import products", "error");
      } finally {
        input.value = "";
      }
    });
  });
}

function hydrateBoqProductPicker(container) {
  const picker = container.querySelector("[data-boq-product-picker]");
  const table = container.querySelector("[data-boq-items-table]");
  const boqForm = container.querySelector("[data-form=boq-create]");
  if (!picker || !table || !boqForm) return;
  boqForm._lineItems = boqForm._lineItems || [];

  const select = picker.querySelector("[data-boq-product-select]");
  const qtyInput = picker.querySelector("[data-boq-product-qty]");
  const unitInput = picker.querySelector("[data-boq-product-unit]");
  const marginInput = picker.querySelector("[data-boq-product-margin]");
  const typeSelect = picker.querySelector("[data-boq-product-type]");
  const exWorksInput = picker.querySelector("[data-boq-product-exworks]");
  const cnfInput = picker.querySelector("[data-boq-product-cnf]");
  const shippingInput = picker.querySelector("[data-boq-product-shipping]");
  const vatInput = picker.querySelector("[data-boq-product-vat]");
  const aitInput = picker.querySelector("[data-boq-product-ait]");
  const brandEl = picker.querySelector("[data-boq-product-brand]");
  const modelEl = picker.querySelector("[data-boq-product-model]");
  const originEl = picker.querySelector("[data-boq-product-origin]");
  const shipmentEl = picker.querySelector("[data-boq-product-shipment]");
  const manufacturerEl = picker.querySelector("[data-boq-product-manufacturer]");
  const priceEl = picker.querySelector("[data-boq-product-price]");
  const descriptionEl = picker.querySelector("[data-boq-product-description]");
  const totalEl = picker.querySelector("[data-boq-product-total]");
  const addBtn = picker.querySelector("[data-boq-add-product]");
  const totalLocalEl = container.querySelector("[data-boq-total-local]");
  const totalForeignEl = container.querySelector("[data-boq-total-foreign]");
  const totalCostEl = container.querySelector("[data-boq-total-cost]");
  const sumVatEl = container.querySelector("[data-boq-sum-vat]");
  const sumAitEl = container.querySelector("[data-boq-sum-ait]");
  const sumExWorksEl = container.querySelector("[data-boq-sum-exworks]");
  const sumCnfEl = container.querySelector("[data-boq-sum-cnf]");
  const sumShippingEl = container.querySelector("[data-boq-sum-shipping]");
  const viewModeSelect = container.querySelector("[data-boq-view-mode]");
  const localFields = picker.querySelectorAll("[data-visible-local]");
  const foreignFields = picker.querySelectorAll("[data-visible-foreign]");
  let typeOverridden = false;

  populateProductSelect(select);

  const toggleFormatFields = () => {
    const type = typeSelect?.value || "local";
    localFields.forEach((node) =>
      node.classList.toggle("hidden", type !== "local")
    );
    foreignFields.forEach((node) =>
      node.classList.toggle("hidden", type !== "foreign")
    );
  };

  const calculateCost = async (selectedProduct) => {
    const catalog = await getProducts();
    const product = selectedProduct || catalog.find((p) => p.id === select.value);
    if (!product) return null;
    const qty = Number(qtyInput.value) || 0;
    const marginPct = Number(marginInput?.value) || 0;
    const productFormat = (product.format || "local").toLowerCase();
    const format = (typeSelect?.value || productFormat).toLowerCase();
    const exWorks = Number(exWorksInput?.value) || 0;
    const cnf = Number(cnfInput?.value) || 0;
    const shipping = Number(shippingInput?.value) || 0;
    const unitPrice = product?.unitPrice || 0;
    const unit = unitInput?.value || product?.unit || "piece";
    const marginValue = unitPrice * (marginPct / 100);
    let vat = 0;
    let ait = 0;
    let perUnit = 0;

    if (format === "local") {
      vat = unitPrice * 0.1;
      ait = unitPrice * 0.05;
      perUnit = unitPrice + marginValue + vat + ait;
    } else {
      perUnit = exWorks + cnf + shipping + marginValue;
    }

    return {
      product,
      qty,
      unit,
      format,
      marginPct,
      marginValue,
      vat,
      ait,
      exWorks,
      cnf,
      shipping,
      unitPriceBase: unitPrice,
      perUnit,
      total: perUnit * qty,
    };
  };

  const renderDetails = async () => {
    toggleFormatFields();
    const catalog = await getProducts();
    const product = catalog.find((p) => p.id === select.value);
    if (!product) {
      [brandEl, modelEl, originEl, shipmentEl, manufacturerEl, priceEl, descriptionEl, totalEl].forEach((el) => {
        if (el) el.textContent = "--";
      });
      if (vatInput) vatInput.value = "--";
      if (aitInput) aitInput.value = "--";
      return;
    }
    if (!typeOverridden && typeSelect) {
      typeSelect.value = product.format || "local";
    }
    if (!unitInput?.value) {
      unitInput.value = product.unit || "piece";
    }
    const cost = await calculateCost(product);
    if (!cost) {
      [priceEl, totalEl].forEach((el) => el && (el.textContent = "--"));
      return;
    }
    brandEl.textContent = product.brand || "--";
    modelEl.textContent = product.model || "--";
    originEl.textContent = product.origin || "--";
    shipmentEl.textContent = product.shipment || "--";
    manufacturerEl.textContent = product.manufacturer || "--";
    priceEl.textContent = formatCurrency(cost.perUnit);
    descriptionEl.textContent = `${product.description || ""} (${product.serial || ""})`;
    totalEl.textContent = cost.qty > 0 ? formatCurrency(cost.total) : "--";
    if (vatInput) {
      vatInput.value = cost.format === "local" ? formatCurrency(cost.vat) : "--";
    }
    if (aitInput) {
      aitInput.value = cost.format === "local" ? formatCurrency(cost.ait) : "--";
    }
  };

  select?.addEventListener("change", async () => {
    typeOverridden = false;
    unitInput.value = "";
    await renderDetails();
  });
  qtyInput?.addEventListener("input", async () => await renderDetails());
  marginInput?.addEventListener("input", async () => await renderDetails());
  typeSelect?.addEventListener("change", async () => {
    typeOverridden = true;
    await renderDetails();
  });
  [exWorksInput, cnfInput, shippingInput].forEach((input) =>
    input?.addEventListener("input", async () => await renderDetails())
  );

  const applyViewMode = () => {
    const mode = viewModeSelect?.value || "local";
    const showLocal = mode === "local" || mode === "all";
    const showForeign = mode === "foreign" || mode === "all";
    container
      .querySelectorAll("th[data-col-local], td[data-col-local]")
      .forEach((node) => node.classList.toggle("hidden", !showLocal));
    container
      .querySelectorAll("th[data-col-foreign], td[data-col-foreign]")
      .forEach((node) => node.classList.toggle("hidden", !showForeign));
    table.querySelectorAll("tr[data-format]").forEach((row) => {
      const format = row.dataset.format || "local";
      const visible =
        mode === "all" ||
        (mode === "local" && format === "local") ||
        (mode === "foreign" && format === "foreign");
      row.classList.toggle("hidden", !visible);
    });
  };
  viewModeSelect?.addEventListener("change", applyViewMode);

  const renderBoqItems = () => {
    const items = boqForm._lineItems || [];
    if (!items.length) {
      table.innerHTML = `
        <tr>
          <td colspan="20">
            <div class="loading-state">
              <span class="loading-spinner"></span>
              No products added yet
            </div>
          </td>
        </tr>`;
      [totalCostEl, totalLocalEl, totalForeignEl, sumVatEl, sumAitEl, sumExWorksEl, sumCnfEl, sumShippingEl].forEach(
        (el) => el && (el.textContent = formatCurrency(0))
      );
      applyViewMode();
      return;
    }
    table.innerHTML = items
      .map(
        (item, idx) => `
      <tr data-format="${item.format}">
        <td>${idx + 1}</td>
        <td>${item.name}</td>
        <td>${item.description} (${item.serial || ""})</td>
        <td>${item.brand}</td>
        <td>${item.model}</td>
        <td>${item.origin}</td>
        <td>${item.shipment || "--"}</td>
        <td>${item.manufacturer || "--"}</td>
        <td>${item.qty}</td>
        <td>${item.unit}</td>
        <td>${formatCurrency(item.unitPriceBase || item.unitPrice)}</td>
        <td>${item.marginPct || 0}%</td>
        <td data-col-local>${item.format === "local" ? formatCurrency(item.vat) : "--"}</td>
        <td data-col-local>${item.format === "local" ? formatCurrency(item.ait) : "--"}</td>
        <td data-col-foreign>${item.format === "foreign" ? formatCurrency(item.exWorksCost) : "--"}</td>
        <td data-col-foreign>${item.format === "foreign" ? formatCurrency(item.cnfCost) : "--"}</td>
        <td data-col-foreign>${item.format === "foreign" ? formatCurrency(item.shippingCost) : "--"}</td>
        <td>${formatCurrency(item.unitPrice)}</td>
        <td>${formatCurrency(item.total)}</td>
        <td>
          <img src="${item.image || FALLBACK_IMAGE}" alt="${item.name}" class="product-thumb" />
          <button type="button" class="btn btn-ghost btn-sm" data-remove-line="${idx}">Remove</button>
        </td>
      </tr>`
      )
      .join("");

    table.querySelectorAll("[data-remove-line]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.removeLine);
        boqForm._lineItems.splice(index, 1);
        renderBoqItems();
      });
    });

    const totals = items.reduce(
      (acc, item) => {
        acc.total += item.total || 0;
        if (item.format === "local") {
          acc.local += item.total || 0;
          acc.vat += item.vat || 0;
          acc.ait += item.ait || 0;
        } else {
          acc.foreign += item.total || 0;
          acc.exworks += item.exWorksCost || 0;
          acc.cnf += item.cnfCost || 0;
          acc.shipping += item.shippingCost || 0;
        }
        return acc;
      },
      { total: 0, local: 0, foreign: 0, vat: 0, ait: 0, exworks: 0, cnf: 0, shipping: 0 }
    );

    if (totalCostEl) totalCostEl.textContent = formatCurrency(totals.total);
    if (totalLocalEl) totalLocalEl.textContent = formatCurrency(totals.local);
    if (totalForeignEl) totalForeignEl.textContent = formatCurrency(totals.foreign);
    if (sumVatEl) sumVatEl.textContent = formatCurrency(totals.vat);
    if (sumAitEl) sumAitEl.textContent = formatCurrency(totals.ait);
    if (sumExWorksEl) sumExWorksEl.textContent = formatCurrency(totals.exworks);
    if (sumCnfEl) sumCnfEl.textContent = formatCurrency(totals.cnf);
    if (sumShippingEl) sumShippingEl.textContent = formatCurrency(totals.shipping);
    applyViewMode();
  };

  addBtn?.addEventListener("click", async () => {
    const catalog = await getProducts();
    const product = catalog.find((p) => p.id === select.value);
    if (!product) {
      showToast("Select a product", "error");
      return;
    }
    const cost = await calculateCost(product);
    if (cost.qty <= 0) {
      showToast("Quantity must be greater than zero", "error");
      return;
    }
    if (cost.marginPct < 0) {
      showToast("Margin cannot be negative", "error");
      return;
    }
    boqForm._lineItems = boqForm._lineItems || [];
    boqForm._lineItems.push({
      productId: product.id,
      name: product.name,
      description: product.description,
      brand: product.brand,
      model: product.model,
      origin: product.origin,
      shipment: product.shipment,
      manufacturer: product.manufacturer,
      qty: cost.qty,
      unit: cost.unit,
      format: cost.format,
      marginPct: cost.marginPct,
      marginValue: cost.marginValue,
      unitPriceBase: product.unitPrice,
      vat: cost.vat,
      ait: cost.ait,
      exWorksCost: cost.exWorks,
      cnfCost: cost.cnf,
      shippingCost: cost.shipping,
      unitPrice: cost.perUnit,
      total: cost.total,
      image: product.image,
      serial: product.serial,
    });
    renderBoqItems();
    showToast(`${product.name} added to BOQ`, "success");
    qtyInput.value = "1";
    unitInput.value = product.unit || "piece";
    renderDetails();
  });

  renderDetails().catch(err => console.error('[UI] Error rendering details:', err));
  renderBoqItems();
}

function hydrateModals(container) {
  container.querySelectorAll("[data-modal-trigger]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.modalTrigger;
      document.getElementById(targetId)?.classList.remove("hidden");
    });
  });

  container.querySelectorAll("[data-modal-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.closest(".modal-backdrop")?.classList.add("hidden");
    });
  });

  // Handle rejection submission
  container.querySelectorAll("[data-action=submit-rejection]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const modal = btn.closest(".modal-backdrop");
      const comment = modal?.querySelector("textarea")?.value;
      if (!comment || comment.trim() === "") {
        showToast("Please provide a rejection comment", "error");
        return;
      }
      
      // Get entity ID from the button that triggered the modal
      const triggerBtn = document.querySelector(`[data-modal-trigger="${modal?.id}"]`);
      const entity = triggerBtn?.dataset.entity;
      const id = triggerBtn?.dataset.id;
      
      if (entity === "boq" && id) {
        await updateBoq(id, { status: "Rejected", rejectionComment: comment });
        showToast("BOQ rejected successfully", "success");
      } else if (entity === "request" && id) {
        await updateRequest(id, { status: "Rejected", rejectionComment: comment });
        showToast("Request rejected successfully", "success");
      }
      
      modal?.classList.add("hidden");
      setTimeout(() => window.location.reload(), 1000);
    });
  });
}

function hydrateRoleSelector() {
  const select = document.querySelector("[data-role-select]");
  if (!select) return;
  select.value = getCurrentRole();
  select.addEventListener("change", (e) => {
    setCurrentRole(e.target.value);
  });
}

function updateRoleBadges(role) {
  document.querySelectorAll("[data-role-label]").forEach((el) => {
    el.textContent = role;
  });
  document.querySelectorAll("[data-role-display]").forEach((el) => {
    el.textContent = role;
  });
}

// Apply permission-based visibility to sidebar items
async function applyPermissionVisibility() {
  const user = getCurrentUser();
  if (!user) return;
  
  // Admin users see all items
  if (user.role === 'admin') {
    document.querySelectorAll("[data-permission]").forEach((el) => {
      el.style.display = "";
    });
    return;
  }
  
  // For regular users, check permissions
  // For now, if user has permissions array, use it; otherwise show all user items
  const permissions = user.permissions || [];
  
  // If no permissions defined, show all user items (backward compatibility)
  if (!permissions || permissions.length === 0) {
    document.querySelectorAll("[data-permission]").forEach((el) => {
      el.style.display = "";
    });
    return;
  }
  
  // Hide items that user doesn't have permission for
  document.querySelectorAll("[data-permission]").forEach((el) => {
    const requiredPermission = el.getAttribute("data-permission");
    if (permissions.includes(requiredPermission)) {
      el.style.display = "";
    } else {
      el.style.display = "none";
    }
  });
}

export async function mountFrame() {
  const sidebar = document.getElementById("sidebar");
  const navbar = document.getElementById("navbar");
  
  // Show sidebar and navbar
  if (sidebar) {
    sidebar.classList.remove("hidden");
    sidebar.classList.add("lg:flex");
  }
  if (navbar) {
    navbar.classList.remove("hidden");
  }
  
  await Promise.all([
    loadComponent("sidebar", "sidebar.html"),
    loadComponent("navbar", "navbar.html"),
    loadComponent("modal-root", "modal.html"),
  ]);
  
  // Wire navigation after components are loaded
  wireNavigation();
  wireModalRoot();
  hydrateRoleSelector();
  hydrateUserDisplay();
  wireLogout();
  hydrateUserDropdown();
  applyPermissionVisibility();

  document
    .querySelector("[data-toggle-sidebar]")
    ?.addEventListener("click", toggleSidebar);

  const role = getCurrentRole();
  applyRoleVisibility(role);
  updateRoleBadges(role);
  
  // Show/hide nav sections based on role
  document.querySelectorAll('[data-role]').forEach((navSection) => {
    const allowedRoles = navSection.getAttribute('data-role').split(',').map(r => r.trim());
    if (allowedRoles.includes(role)) {
      navSection.style.display = '';
    } else {
      navSection.style.display = 'none';
    }
  });

  document.addEventListener("role:change", (event) => {
    const nextRole = event.detail;
    applyRoleVisibility(nextRole);
    updateRoleBadges(nextRole);
  });

  document.addEventListener("route:change", () => {
    toggleSidebar(false);
    // Close dropdown on route change
    const dropdown = document.getElementById('user-dropdown-menu');
    if (dropdown) dropdown.classList.add('hidden');
  });

  // Listen for user profile updates to refresh UI
  document.addEventListener("user:updated", (event) => {
    hydrateUserDisplay();
    applyPermissionVisibility();
  });
  
  console.log("[UI] Frame mounted, navigation wired");
}

export async function unmountFrame() {
  const sidebar = document.getElementById("sidebar");
  const navbar = document.getElementById("navbar");
  
  // Hide sidebar and navbar
  if (sidebar) {
    sidebar.classList.add("hidden");
    sidebar.classList.remove("lg:flex");
    sidebar.innerHTML = "";
  }
  if (navbar) {
    navbar.classList.add("hidden");
    navbar.innerHTML = "";
  }
  
  console.log("[UI] Frame unmounted");
}

function hydrateUserDropdown() {
  const trigger = document.querySelector('[data-user-menu-trigger]');
  const dropdown = document.getElementById('user-dropdown-menu');
  
  if (!trigger || !dropdown) return;

  // Toggle dropdown on click
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });

  // Close dropdown when clicking on menu items (they will navigate)
  dropdown.querySelectorAll('.dropdown-item').forEach((item) => {
    item.addEventListener('click', () => {
      dropdown.classList.add('hidden');
    });
  });

  // Add hover effect
  dropdown.querySelectorAll('.dropdown-item').forEach((item) => {
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = '#f1f5f9';
    });
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'transparent';
    });
  });
}

function hydrateUserDisplay() {
  const user = getCurrentUser();
  if (!user) return;

  // Update sidebar
  const userNameElements = document.querySelectorAll("[data-user-name]");
  userNameElements.forEach((el) => {
    el.textContent = user.name || user.username || 'User';
  });

  // Update navbar
  const navbarNameElements = document.querySelectorAll("[data-user-name-navbar]");
  navbarNameElements.forEach((el) => {
    el.textContent = user.name || user.username || 'User';
  });

  // Update dropdown user info
  const dropdownNameElements = document.querySelectorAll("[data-user-name-dropdown]");
  dropdownNameElements.forEach((el) => {
    el.textContent = user.name || user.username || 'User';
  });

  // Update avatar initials and profile pictures
  const initials = (user.name || user.username || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  const initialsElements = document.querySelectorAll("[data-user-initials], [data-user-initials-dropdown]");
  initialsElements.forEach((el) => {
    el.textContent = initials;
  });

  // Update avatars with profile pictures if available
  const navbarImg = document.getElementById('user-avatar-img-navbar');
  const dropdownImg = document.getElementById('user-avatar-img-dropdown');
  const navbarAvatar = document.querySelector('[data-user-avatar]');
  const dropdownAvatar = document.querySelector('[data-user-avatar-dropdown]');
  const navbarInitialsEl = navbarAvatar?.querySelector('[data-user-initials]');
  const dropdownInitialsEl = dropdownAvatar?.querySelector('[data-user-initials-dropdown]');
  
  if (user.profilePicture && user.profilePicture.startsWith('data:image')) {
    if (navbarImg && navbarAvatar) {
      navbarImg.src = user.profilePicture;
      navbarImg.style.display = 'block';
      if (navbarInitialsEl) navbarInitialsEl.style.display = 'none';
      navbarAvatar.style.background = 'transparent';
    }
    
    if (dropdownImg && dropdownAvatar) {
      dropdownImg.src = user.profilePicture;
      dropdownImg.style.display = 'block';
      if (dropdownInitialsEl) dropdownInitialsEl.style.display = 'none';
      dropdownAvatar.style.background = 'transparent';
    }
  } else {
    // Use initials - hide images and show initials
    if (navbarImg) navbarImg.style.display = 'none';
    if (dropdownImg) dropdownImg.style.display = 'none';
    if (navbarInitialsEl) navbarInitialsEl.style.display = 'flex';
    if (dropdownInitialsEl) dropdownInitialsEl.style.display = 'flex';
    if (navbarAvatar) navbarAvatar.style.background = 'var(--brand-primary, #3b82f6)';
    if (dropdownAvatar) dropdownAvatar.style.background = 'var(--brand-primary, #3b82f6)';
  }

  // Update role display
  const roleElements = document.querySelectorAll("[data-role-display], [data-role-display-dropdown]");
  roleElements.forEach((el) => {
    el.textContent = user.role || 'user';
  });
  
  updateRoleBadges(user.role || 'user');
}

function wireLogout() {
  document.querySelectorAll("[data-action=logout]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm("Are you sure you want to logout?")) {
        import('./auth.js').then(({ logout }) => {
          logout();
        });
      }
    });
  });
}

async function hydrateUserDashboard(container) {
  try {
    const { getOffers, getRequests } = await import('./data.js');
    const { getCurrentUser } = await import('./auth.js');
    
    const user = getCurrentUser();
    if (!user) return;

    const permissions = user.permissions || [];
    
    // If user has no permissions defined, show all (backward compatibility)
    const hasPermission = (perm) => {
      if (!permissions || permissions.length === 0) return true;
      return permissions.includes(perm);
    };

    // Only load data if user has permission
    let offers = [];
    let requests = [];
    
    if (hasPermission('view_offers') || hasPermission('dashboard')) {
      offers = await getOffers();
    }
    
    if (hasPermission('view_requests') || hasPermission('dashboard')) {
      requests = await getRequests();
    }

    // Filter user's own offers and requests
    const userOffers = offers.filter(o => o.owner === user.name || o.owner === user.username);
    const userRequests = requests.filter(r => r.requester === user.name || r.requester === user.username);

    // Calculate stats
    const offersCount = userOffers.length;
    const pendingCount = userOffers.filter(o => o.status === 'Pending').length;
    const approvedCount = userOffers.filter(o => o.status === 'Approved').length;
    const requestsCount = userRequests.length;

    // Update KPI cards (hide if no permission)
    const offersCard = container.querySelector('#user-offers-count');
    if (offersCard) {
      if (hasPermission('view_offers') || hasPermission('dashboard')) {
        offersCard.textContent = offersCount;
        offersCard.closest('.kpi-card')?.classList.remove('hidden');
      } else {
        offersCard.closest('.kpi-card')?.classList.add('hidden');
      }
    }
    
    const pendingCard = container.querySelector('#user-pending-count');
    if (pendingCard) {
      if (hasPermission('view_offers') || hasPermission('dashboard')) {
        pendingCard.textContent = pendingCount;
        pendingCard.closest('.kpi-card')?.classList.remove('hidden');
      } else {
        pendingCard.closest('.kpi-card')?.classList.add('hidden');
      }
    }
    
    const approvedCard = container.querySelector('#user-approved-count');
    if (approvedCard) {
      if (hasPermission('view_offers') || hasPermission('dashboard')) {
        approvedCard.textContent = approvedCount;
        approvedCard.closest('.kpi-card')?.classList.remove('hidden');
      } else {
        approvedCard.closest('.kpi-card')?.classList.add('hidden');
      }
    }
    
    const requestsCard = container.querySelector('#user-requests-count');
    if (requestsCard) {
      if (hasPermission('view_requests') || hasPermission('dashboard')) {
        requestsCard.textContent = requestsCount;
        requestsCard.closest('.kpi-card')?.classList.remove('hidden');
      } else {
        requestsCard.closest('.kpi-card')?.classList.add('hidden');
      }
    }

    // Update tables with user's data (only if permission exists)
    const offersTbody = container.querySelector('[data-fill="offers"]');
    if (offersTbody) {
      if (hasPermission('view_offers') || hasPermission('dashboard')) {
        if (userOffers.length > 0) {
          offersTbody.innerHTML = userOffers.slice(0, 5).map(
            (offer) => `
              <tr>
                <td><a href="#offer-preview" data-route="offer-preview" style="color:var(--brand-primary);text-decoration:underline;">${offer.id}</a></td>
                <td>${offer.customer}</td>
                <td>$${offer.value.toLocaleString()}</td>
                <td><span class="status-pill ${offer.status.toLowerCase()}">${offer.status}</span></td>
              </tr>`
          ).join("");
        } else {
          offersTbody.innerHTML = '<tr><td colspan="4" class="text-center text-slate-500">No offers yet</td></tr>';
        }
        offersTbody.closest('.card')?.classList.remove('hidden');
      } else {
        offersTbody.closest('.card')?.classList.add('hidden');
      }
    }

    const requestsTbody = container.querySelector('[data-fill="requests"]');
    if (requestsTbody) {
      if (hasPermission('view_requests') || hasPermission('dashboard')) {
        if (userRequests.length > 0) {
          requestsTbody.innerHTML = userRequests.slice(0, 5).map(
            (req) => `
              <tr>
                <td><a href="#request-details" data-route="request-details" style="color:var(--brand-primary);text-decoration:underline;">${req.id}</a></td>
                <td>${req.type}</td>
                <td>$${req.amount.toLocaleString()}</td>
                <td><span class="status-pill ${req.status.toLowerCase()}">${req.status}</span></td>
              </tr>`
          ).join("");
        } else {
          requestsTbody.innerHTML = '<tr><td colspan="4" class="text-center text-slate-500">No requests yet</td></tr>';
        }
        requestsTbody.closest('.card')?.classList.remove('hidden');
      } else {
        requestsTbody.closest('.card')?.classList.add('hidden');
      }
    }
    
    // Hide quick actions based on permissions
    const quickActions = container.querySelectorAll('.card a[data-route]');
    quickActions.forEach(action => {
      const route = action.getAttribute('data-route');
      let shouldShow = false;
      
      if (route === 'offer-create' && hasPermission('create_offer')) shouldShow = true;
      else if (route === 'request-create' && hasPermission('create_request')) shouldShow = true;
      else if (route === 'products' && hasPermission('view_product')) shouldShow = true;
      else if (route === 'boq-create' && hasPermission('create_boq')) shouldShow = true;
      else shouldShow = true; // Default show for other actions
      
      if (!shouldShow) {
        action.closest('.card')?.classList.add('hidden');
      }
    });
  } catch (error) {
    console.error('[UI] Error hydrating user dashboard:', error);
  }
}

function hydrateFormSubmissions(container) {
  // Offer creation form
  const offerForm = container.querySelector("[data-form=offer-create]");
  if (offerForm) {
    offerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(offerForm);
      const customer = formData.get("customer") || offerForm.querySelector("[name=customer]")?.value;
      const department = formData.get("department") || offerForm.querySelector("[name=department]")?.value;
      const productIdx = offerForm.querySelector("[data-offer-product]")?.value;
      const qty = Number(offerForm.querySelector("[data-offer-qty]")?.value || 0);
      const notes = offerForm.querySelector("textarea")?.value || "";

      if (!customer || !department || !productIdx || qty <= 0) {
        showToast("Please fill all required fields", "error");
        return;
      }

      const catalog = await getProducts();
      const product = catalog.find((p) => p.id === productIdx);
      if (!product) {
        showToast("Select a valid product", "error");
        return;
      }
      const subtotal = product.unitPrice * qty;
      const commission = ((product.commission || 0) / 100) * subtotal;
      const total = subtotal + commission;

      const newOffer = {
        customer,
        department,
        value: total,
        owner: getCurrentUser().name,
        products: [{ product: product.name, qty, price: product.price }],
        notes,
      };

      const id = await addOffer(newOffer);
      showToast(`Offer ${id} created successfully`, "success");
      setTimeout(() => {
        window.location.hash = "#offers-list";
      }, 1000);
    });
  }

  // BOQ creation form
  const boqForm = container.querySelector("[data-form=boq-create]");
  if (boqForm) {
    boqForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const project = boqForm.querySelector("[name=project]")?.value;
      const department = boqForm.querySelector("[name=department]")?.value;
      const owner = boqForm.querySelector("[name=owner]")?.value;
      const budget = Number(boqForm.querySelector("[name=budget]")?.value || 0);

      if (!project || !department || !owner || budget <= 0) {
        showToast("Please fill all required fields", "error");
        return;
      }

      const lineItems = (boqForm._lineItems || []).filter((item) => item?.name);
      if (!lineItems.length) {
        showToast("Please add at least one product to the BOQ", "error");
        return;
      }
      const totalCost = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);

      const newBoq = {
        project,
        department,
        approver: owner,
        budget,
        lineItems,
        totalCost,
      };

      const id = await addBoq(newBoq);
      showToast(`BOQ ${id} created successfully`, "success");
      setTimeout(() => {
        window.location.hash = "#boq-list";
      }, 1000);
    });
  }

  // Request creation form
  const requestForm = container.querySelector("[data-form=request-create]");
  if (requestForm) {
    requestForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const type = requestForm.querySelector("[name=type]")?.value;
      const amount = Number(requestForm.querySelector("[name=amount]")?.value || 0);
      const department = requestForm.querySelector("[name=department]")?.value;
      const requiredDate = requestForm.querySelector("[name=requiredDate]")?.value;
      const notes = requestForm.querySelector("textarea")?.value || "";

      if (!type || amount <= 0 || !department || !requiredDate) {
        showToast("Please fill all required fields", "error");
        return;
      }

      const newRequest = {
        type,
        amount,
        department,
        requiredDate,
        notes,
        requester: getCurrentUser().name,
        manager: "Pending Assignment",
      };

      const id = await addRequest(newRequest);
      showToast(`Request ${id} submitted successfully`, "success");
      setTimeout(() => {
        window.location.hash = "#requests-list";
      }, 1000);
    });
  }
}

function hydrateButtonActions(container) {
  // New Offer button
  container.querySelectorAll("[data-action=new-offer]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.location.hash = "#offer-create";
    });
  });

  // New BOQ button
  container.querySelectorAll("[data-action=new-boq]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.location.hash = "#boq-create";
    });
  });

  // New Request button
  container.querySelectorAll("[data-action=new-request]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.location.hash = "#request-create";
    });
  });

  // Approve/Reject buttons
  container.querySelectorAll("[data-action=approve]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const entity = btn.dataset.entity;
      const id = btn.dataset.id;
      if (entity === "boq") {
        await updateBoq(id, { status: "Approved" });
        showToast("BOQ approved successfully", "success");
      } else if (entity === "request") {
        await updateRequest(id, { status: "Approved" });
        showToast("Request approved successfully", "success");
      }
      setTimeout(() => window.location.reload(), 1000);
    });
  });

  container.querySelectorAll("[data-action=reject]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modalId = btn.dataset.modalTrigger;
      if (modalId) {
        document.getElementById(modalId)?.classList.remove("hidden");
      }
    });
  });

  // Export buttons
  container.querySelectorAll("[data-action=export-pdf]").forEach((btn) => {
    btn.addEventListener("click", () => {
      showToast("PDF export initiated", "info");
      window.print();
    });
  });

  container.querySelectorAll("[data-action=export-csv]").forEach((btn) => {
    btn.addEventListener("click", () => {
      showToast("CSV export initiated", "info");
      // CSV export logic would go here
    });
  });

  // Save Draft buttons
  container.querySelectorAll("[data-action=save-draft]").forEach((btn) => {
    btn.addEventListener("click", () => {
      showToast("Draft saved", "success");
    });
  });
}

function hydrateFilters(container) {
  const filters = container.querySelectorAll(".filters select, .filters input");
  filters.forEach((filter) => {
    filter.addEventListener("change", () => {
      // Trigger table refresh with filters
      hydrateTables(container);
    });
  });
}

function hydrateLineItemCalculations(container) {
  const lineItems = container.querySelectorAll("[data-line-items]");
  lineItems.forEach((wrapper) => {
    wrapper.addEventListener("input", (e) => {
      const row = e.target.closest("[data-item-row]");
      if (!row) return;
      
      const qtyInput = row.querySelector("input[placeholder='Qty']");
      const unitCostInput = row.querySelector("input[placeholder='Unit Cost']");
      const totalInput = row.querySelector("input[placeholder='Line Total']");
      
      if (qtyInput && unitCostInput && totalInput) {
        const qty = Number(qtyInput.value) || 0;
        const unitCost = Number(unitCostInput.value) || 0;
        totalInput.value = (qty * unitCost).toFixed(2);
      }
    });
  });
}

async function hydrateProductDetails(container) {
  // Only run if we're on the product details page
  const productForm = container.querySelector("[data-form=product-edit]");
  if (!productForm) {
    return; // Not on product details page, skip
  }

  // Get form and buttons first (needed by setMode function)
  const form = container.querySelector("[data-form=product-edit]");
  const editBtn = container.querySelector("#btn-edit-product");
  const cancelBtn = container.querySelector("#btn-cancel-edit");
  const saveBtn = container.querySelector("#btn-save-product");
  
  // Store current product data for form submission (accessible to submit handler)
  let currentProductData = null;

  // Helper function to get mode from URL (defaults to "view")
  const getModeFromURL = () => {
    const params = getQueryParams();
    return params.mode === "edit" ? "edit" : "view";
  };

  // Helper function to build URL with mode
  const buildProductDetailsURL = (productId, mode = "view") => {
    const baseURL = `#product-details?id=${encodeURIComponent(productId)}`;
    return mode === "edit" ? `${baseURL}&mode=edit` : baseURL;
  };

  // Function to set view/edit mode UI state
  const setMode = (mode) => {
    const isEditMode = mode === "edit";
    
    if (form) {
      const inputs = form.querySelectorAll("input, textarea, .rich-text-content");
      inputs.forEach((input) => {
        if (input.classList.contains("rich-text-content")) {
          input.contentEditable = isEditMode ? "true" : "false";
        } else {
          input.disabled = !isEditMode;
        }
      });
    }
    
    // Show/hide buttons based on mode
    if (editBtn) editBtn.style.display = isEditMode ? "none" : "inline-block";
    if (cancelBtn) cancelBtn.style.display = isEditMode ? "inline-block" : "none";
    if (saveBtn) saveBtn.style.display = isEditMode ? "inline-block" : "none";
  };

  // Function to load product details
  const loadProductDetails = async () => {
    const hash = window.location.hash;
    console.log("[Product Details] Full hash:", hash);
    
    // Extract product ID and mode from URL
    const params = getQueryParams();
    const productId = params.id;
    const mode = getModeFromURL();
    
    console.log("[Product Details] Extracted Product ID:", productId);
    console.log("[Product Details] Mode:", mode);
    
    if (!productId) {
      // Don't replace the entire container, just show error in a better way
      const existingError = container.querySelector(".product-error-message");
      if (existingError) return; // Already showing error
      
      const errorDiv = document.createElement("div");
      errorDiv.className = "card product-error-message";
      errorDiv.innerHTML = `<h2>Product Not Found</h2><p>No product ID provided in URL.</p><p class="text-sm text-slate-500">Hash: ${hash}</p><a href="#product-database" class="btn btn-primary" data-route="product-database">Back to Database</a>`;
      // Insert before the form instead of replacing everything
      productForm.parentNode.insertBefore(errorDiv, productForm);
      productForm.style.display = "none";
      return;
    }

    const product = await getProductById(productId);
    if (!product) {
      const existingError = container.querySelector(".product-error-message");
      if (existingError) return;
      
      const errorDiv = document.createElement("div");
      errorDiv.className = "card product-error-message";
      errorDiv.innerHTML = `<h2>Product Not Found</h2><p>Product with ID "${productId}" does not exist.</p><a href="#product-database" class="btn btn-primary" data-route="product-database">Back to Database</a>`;
      productForm.parentNode.insertBefore(errorDiv, productForm);
      productForm.style.display = "none";
      return;
    }
    
    // Remove any existing error messages
    const existingError = container.querySelector(".product-error-message");
    if (existingError) {
      existingError.remove();
    }
    productForm.style.display = "";

    // Populate product data
    const titleEl = container.querySelector("#product-detail-title");
    if (titleEl) titleEl.textContent = product.name || "Product Details";

    // Populate form fields
    const fields = {
    name: container.querySelector("#edit-name"),
    brand: container.querySelector("#edit-brand"),
    model: container.querySelector("#edit-model"),
    manufacturer: container.querySelector("#edit-manufacturer"),
    origin: container.querySelector("#edit-origin"),
    shipment: container.querySelector("#edit-shipment"),
    quantity: container.querySelector("#edit-quantity"),
    unit: container.querySelector("#edit-unit"),
    unitPrice: container.querySelector("#edit-unitPrice"),
    serial: container.querySelector("#edit-serial"),
    description: container.querySelector("#edit-description"),
    descriptionHidden: container.querySelector("#edit-description-hidden"),
  };

  if (fields.name) fields.name.value = product.name || "";
  if (fields.brand) fields.brand.value = product.brand || "";
  if (fields.model) fields.model.value = product.model || "";
  if (fields.manufacturer) fields.manufacturer.value = product.manufacturer || "";
  if (fields.origin) fields.origin.value = product.origin || "";
  if (fields.shipment) fields.shipment.value = product.shipment || "";
  if (fields.quantity) fields.quantity.value = product.quantity || 0;
  if (fields.unit) fields.unit.value = product.unit || "";
  if (fields.unitPrice) fields.unitPrice.value = product.unitPrice || 0;
  if (fields.serial) fields.serial.value = product.serial || "";
  if (fields.description) {
    fields.description.innerHTML = product.description || "";
    if (fields.descriptionHidden) fields.descriptionHidden.value = product.description || "";
  }

  // Populate image and metadata
  const imageDisplay = container.querySelector("#product-image-display");
  const imagePlaceholder = container.querySelector("#product-image-placeholder");
  if (product.image) {
    if (imageDisplay) {
      imageDisplay.src = product.image;
      imageDisplay.style.display = "block";
    }
    if (imagePlaceholder) imagePlaceholder.style.display = "none";
  } else {
    if (imageDisplay) imageDisplay.style.display = "none";
    if (imagePlaceholder) imagePlaceholder.style.display = "block";
  }

  // Show current image preview
  const currentImagePreview = container.querySelector("#current-image-preview");
  if (currentImagePreview) {
    if (product.image) {
      currentImagePreview.innerHTML = `<p class="text-sm text-slate-600 mb-2">Current image:</p><img src="${product.image}" alt="Current image" class="product-thumb" />`;
      currentImagePreview.style.display = "block";
    } else {
      currentImagePreview.style.display = "none";
    }
  }

  // Populate metadata
  const idDisplay = container.querySelector("#product-id-display");
  const serialDisplay = container.querySelector("#product-serial-display");
  const formatDisplay = container.querySelector("#product-format-display");
  if (idDisplay) idDisplay.textContent = product.id || "--";
  if (serialDisplay) serialDisplay.textContent = product.serial || "--";
  if (formatDisplay) formatDisplay.textContent = (product.format || "local").charAt(0).toUpperCase() + (product.format || "local").slice(1);

  // Store product data for form submission (accessible to submit handler)
  currentProductData = product;

  // Initialize rich text editor
  hydrateRichTextEditor(container);
  
  // Set initial mode based on URL (buttons and form already declared at top)
  setMode(mode);

  // Handle image file input change for preview
  const imageInput = container.querySelector("#edit-image");
  if (imageInput) {
    imageInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith("image/")) {
        try {
          const imageData = await readFileAsDataURL(file);
          if (currentImagePreview) {
            currentImagePreview.innerHTML = `
              <p class="text-sm text-slate-600 mb-2">New image preview:</p>
              <img src="${imageData}" alt="New image preview" class="product-thumb" />
            `;
            currentImagePreview.style.display = "block";
          }
          // Update right-side image display with new preview
          const imageDisplay = container.querySelector("#product-image-display");
          const imagePlaceholder = container.querySelector("#product-image-placeholder");
          if (imageDisplay) {
            imageDisplay.src = imageData;
            imageDisplay.style.display = "block";
          }
          if (imagePlaceholder) imagePlaceholder.style.display = "none";
        } catch (error) {
          console.error("Error reading image file:", error);
          showToast("Unable to preview image", "error");
        }
      } else if (file) {
        showToast("Please select a valid image file", "error");
        e.target.value = "";
      }
    });
  }

  // Edit button - navigates to edit mode via URL
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      window.location.hash = buildProductDetailsURL(productId, "edit");
    });
  }

  // Cancel button - navigates back to view mode via URL
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      window.location.hash = buildProductDetailsURL(productId, "view");
    });
  }


  // Save/Update functionality
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      // Check if we're in edit mode from URL
      const currentMode = getModeFromURL();
      if (currentMode !== "edit") return;

      const formData = new FormData(form);
      const richTextContent = container.querySelector("#edit-description");
      const descriptionHtml = richTextContent ? richTextContent.innerHTML.trim() : "";

      if (!descriptionHtml) {
        showToast("Product description is required", "error");
        return;
      }

      const requiredFields = ["name", "brand", "model", "manufacturer", "origin", "shipment", "quantity", "unit", "unitPrice"];
      const missing = requiredFields.filter((field) => !(formData.get(field) || "").toString().trim());
      if (missing.length) {
        showToast("Please complete all required fields", "error");
        return;
      }

      try {
        const updates = {
          name: formData.get("name").trim(),
          description: descriptionHtml,
          brand: formData.get("brand").trim(),
          model: formData.get("model").trim(),
          origin: formData.get("origin").trim(),
          shipment: formData.get("shipment").trim(),
          manufacturer: formData.get("manufacturer").trim(),
          quantity: Number(formData.get("quantity")) || 0,
          unit: formData.get("unit").trim(),
          unitPrice: Number(formData.get("unitPrice")) || 0,
        };

        // Handle serial number update - preserve existing if not provided
        const serialValue = formData.get("serial")?.trim();
        if (serialValue) {
          updates.serial = serialValue;
        } else if (currentProductData && currentProductData.serial) {
          // If serial is empty, keep the existing one
          updates.serial = currentProductData.serial;
        } else {
          updates.serial = "";
        }

        // Handle image update if new image is provided
        const imageFile = formData.get("image");
        if (imageFile && imageFile.size > 0) {
          if (!imageFile.type.startsWith("image/")) {
            showToast("Unsupported image format", "error");
            return;
          }
          if (imageFile.size > 2 * 1024 * 1024) {
            showToast("Image must be smaller than 2MB", "error");
            return;
          }
          const imageData = await readFileAsDataURL(imageFile);
          updates.image = imageData;
        }

        const success = updateProduct(productId, updates);
        if (success) {
          showToast("Product updated successfully", "success");
          // Navigate back to view mode after successful update
          setTimeout(() => {
            window.location.hash = buildProductDetailsURL(productId, "view");
          }, 500);
        } else {
          showToast("Failed to update product", "error");
        }
      } catch (error) {
        console.error("Product update failed", error);
        showToast("Unable to update product", "error");
      }
    });
  }

    // Delete functionality
    const deleteBtn = container.querySelector("#btn-delete-product");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        if (confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
          const success = deleteProduct(productId);
          if (success) {
            showToast("Product deleted successfully", "success");
            setTimeout(() => {
              window.location.hash = "#product-database";
            }, 1000);
          } else {
            showToast("Failed to delete product", "error");
          }
        }
      });
    }
  };

  // Call immediately with a small delay to ensure hash is set
  setTimeout(() => {
    loadProductDetails();
  }, 100);

  // Also listen for hash changes in case user navigates directly
  window.addEventListener('hashchange', () => {
    // Only reload if we're still on product-details page
    if (container.querySelector("[data-form=product-edit]")) {
      loadProductDetails();
    }
  });
}

// Hydrate user profile page (read-only)
async function hydrateUserProfilePage(container) {
  try {
    const { getUserProfile, formatDate, getUserInitials } = await import('./user/profile.js');
    const profile = await getUserProfile();

    // Update profile picture/avatar
    const avatarLarge = container.querySelector('#profile-avatar-large');
    const imgLarge = container.querySelector('#profile-picture-large');
    const initialsLarge = container.querySelector('#profile-initials-large');
    
    if (profile.profilePicture && profile.profilePicture.startsWith('data:image')) {
      imgLarge.src = profile.profilePicture;
      imgLarge.style.display = 'block';
      initialsLarge.style.display = 'none';
      avatarLarge.style.background = 'transparent';
    } else {
      imgLarge.style.display = 'none';
      initialsLarge.textContent = getUserInitials(profile.name);
      initialsLarge.style.display = 'flex';
    }

    // Update basic info
    container.querySelector('#profile-name').textContent = profile.name || '--';
    container.querySelector('#profile-role').textContent = profile.role || 'user';
    container.querySelector('#profile-email').textContent = profile.email || '--';
    container.querySelector('#profile-created').textContent = formatDate(profile.createdAt);
    container.querySelector('#profile-updated').textContent = formatDate(profile.updatedAt);

    // Update personal information
    container.querySelector('#profile-field-name').textContent = profile.name || '--';
    container.querySelector('#profile-field-username').textContent = profile.username || '--';
    container.querySelector('#profile-field-email').textContent = profile.email || '--';
    const roleBadge = container.querySelector('#profile-role-badge');
    if (roleBadge) {
      roleBadge.textContent = profile.role || 'user';
      roleBadge.className = `status-pill ${(profile.role || 'user').toLowerCase()}`;
    }

    // Update contact information
    container.querySelector('#profile-field-phone').textContent = profile.phone || '--';
    container.querySelector('#profile-field-address').textContent = profile.address || '--';
    container.querySelector('#profile-field-city').textContent = profile.city || '--';
    container.querySelector('#profile-field-country').textContent = profile.country || '--';

    // Update bio
    const bioElement = container.querySelector('#profile-field-bio');
    if (profile.bio && profile.bio.trim()) {
      bioElement.innerHTML = profile.bio;
      bioElement.classList.remove('text-slate-400', 'italic');
    } else {
      bioElement.innerHTML = '<div class="text-slate-400 italic">No bio provided</div>';
    }
  } catch (error) {
    console.error('[UI] Error hydrating user profile page:', error);
    showToast('Failed to load profile information', 'error');
  }
}

// Hydrate user settings page (editable)
async function hydrateUserSettingsPage(container) {
  try {
    const { getUserProfile, updateUserProfile, changePassword, readFileAsDataURL, getUserInitials } = await import('./user/profile.js');
    const { getCurrentUser, setCurrentUser } = await import('./auth.js');

    // Load current profile
    let profile = await getUserProfile();

    // Populate form fields
    container.querySelector('#settings-name').value = profile.name || '';
    container.querySelector('#settings-email').value = profile.email || '';
    container.querySelector('#settings-username').value = profile.username || '';
    container.querySelector('#settings-role').value = profile.role || 'user';
    container.querySelector('#settings-bio').value = profile.bio || '';
    container.querySelector('#settings-phone').value = profile.phone || '';
    container.querySelector('#settings-address').value = profile.address || '';
    container.querySelector('#settings-city').value = profile.city || '';
    container.querySelector('#settings-country').value = profile.country || '';

    // Update profile picture preview
    const previewWrapper = container.querySelector('#profile-picture-preview');
    const previewImg = container.querySelector('#profile-picture-preview-img');
    const previewInitials = container.querySelector('#profile-picture-preview-initials');
    
    if (profile.profilePicture && profile.profilePicture.startsWith('data:image')) {
      previewImg.src = profile.profilePicture;
      previewImg.style.display = 'block';
      previewInitials.style.display = 'none';
      previewWrapper.style.background = 'transparent';
    } else {
      previewImg.style.display = 'none';
      previewInitials.textContent = getUserInitials(profile.name);
      previewInitials.style.display = 'flex';
    }

    let newProfilePicture = profile.profilePicture || null;

    // Handle profile picture upload
    const pictureInput = container.querySelector('#profile-picture-input');
    const pictureError = container.querySelector('#profile-picture-error');
    
    pictureInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        pictureError.classList.add('hidden');
        const base64 = await readFileAsDataURL(file);
        newProfilePicture = base64;

        // Update preview
        previewImg.src = base64;
        previewImg.style.display = 'block';
        previewInitials.style.display = 'none';
        previewWrapper.style.background = 'transparent';
      } catch (error) {
        pictureError.textContent = error.message;
        pictureError.classList.remove('hidden');
        e.target.value = '';
      }
    });

    // Handle profile form submission
    const profileForm = container.querySelector('#profile-settings-form');
    const profileError = container.querySelector('#profile-form-error');
    const profileSuccess = container.querySelector('#profile-form-success');

    profileForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      profileError.classList.add('hidden');
      profileSuccess.classList.add('hidden');

      try {
        const formData = new FormData(profileForm);
        const profileData = {
          name: formData.get('name')?.trim() || '',
          bio: formData.get('bio')?.trim() || '',
          phone: formData.get('phone')?.trim() || '',
          address: formData.get('address')?.trim() || '',
          city: formData.get('city')?.trim() || '',
          country: formData.get('country')?.trim() || '',
          profilePicture: newProfilePicture || profile.profilePicture || '',
        };

        const result = await updateUserProfile(profileData);
        
        if (result.success) {
          // Update local user data
          const updatedUser = { ...getCurrentUser(), ...result.user };
          setCurrentUser(updatedUser);
          
          // Refresh user display in navbar
          hydrateUserDisplay();
          
          profileSuccess.textContent = 'Profile updated successfully!';
          profileSuccess.classList.remove('hidden');
          showToast('Profile updated successfully', 'success');

          // Reload profile data
          profile = await getUserProfile();
        }
      } catch (error) {
        profileError.textContent = error.message || 'Failed to update profile';
        profileError.classList.remove('hidden');
        showToast(error.message || 'Failed to update profile', 'error');
      }
    });

    // Handle password form submission
    const passwordForm = container.querySelector('#password-change-form');
    const passwordError = container.querySelector('#password-form-error');
    const passwordSuccess = container.querySelector('#password-form-success');

    passwordForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      passwordError.classList.add('hidden');
      passwordSuccess.classList.add('hidden');

      const formData = new FormData(passwordForm);
      const currentPassword = formData.get('currentPassword');
      const newPassword = formData.get('newPassword');
      const confirmPassword = formData.get('confirmPassword');

      // Validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        passwordError.textContent = 'All password fields are required';
        passwordError.classList.remove('hidden');
        return;
      }

      if (newPassword.length < 6) {
        passwordError.textContent = 'New password must be at least 6 characters';
        passwordError.classList.remove('hidden');
        return;
      }

      if (newPassword !== confirmPassword) {
        passwordError.textContent = 'New password and confirmation do not match';
        passwordError.classList.remove('hidden');
        return;
      }

      try {
        const result = await changePassword(currentPassword, newPassword, confirmPassword);
        
        if (result.success) {
          passwordSuccess.textContent = 'Password changed successfully!';
          passwordSuccess.classList.remove('hidden');
          passwordForm.reset();
          showToast('Password changed successfully', 'success');
        }
      } catch (error) {
        passwordError.textContent = error.message || 'Failed to change password';
        passwordError.classList.remove('hidden');
        showToast(error.message || 'Failed to change password', 'error');
      }
    });

    // Cancel buttons
    container.querySelector('#cancel-profile-btn')?.addEventListener('click', () => {
      window.location.hash = '#user/profile';
    });

    container.querySelector('#cancel-password-btn')?.addEventListener('click', () => {
      passwordForm?.reset();
      passwordError.classList.add('hidden');
      passwordSuccess.classList.add('hidden');
    });
  } catch (error) {
    console.error('[UI] Error hydrating user settings page:', error);
    showToast('Failed to load settings', 'error');
  }
}

export function hydratePage(container) {
  // Get current route from hash
  const hash = window.location.hash.replace("#", "").trim();
  const [route] = hash.split("?");
  
  // Check if we're on login or signup page
  const loginForm = container.querySelector('#login-form');
  const signupForm = container.querySelector('#signup-form');
  
  if (loginForm) {
    import('./auth/login.js').then(({ hydrateLoginForm }) => {
      hydrateLoginForm(container);
    });
    return; // Don't run other hydration for login page
  }
  
  if (signupForm) {
    import('./auth/signup.js').then(({ hydrateSignupForm }) => {
      hydrateSignupForm(container);
    });
    return; // Don't run other hydration for signup page
  }

  // Route-based detection for admin pages
  if (route === 'admin/dashboard') {
    import('./admin.js').then(({ hydrateAdminDashboard }) => {
      hydrateAdminDashboard(container);
    });
    hydrateModals(container);
    return;
  }

  if (route === 'admin/active-users') {
    import('./admin.js').then(({ hydrateActiveUsersPage }) => {
      hydrateActiveUsersPage(container);
    });
    hydrateModals(container);
    return;
  }

  if (route === 'admin/pending-users') {
    import('./admin.js').then(({ hydratePendingUsersPage }) => {
      hydratePendingUsersPage(container);
    });
    hydrateModals(container);
    return;
  }

  if (route === 'admin/total-users') {
    import('./admin.js').then(({ hydrateTotalUsersPage }) => {
      hydrateTotalUsersPage(container);
    });
    hydrateModals(container);
    return;
  }

  if (route === 'admin/departments') {
    import('./admin.js').then(({ loadDepartments, renderDepartments, hydrateDepartmentsPage }) => {
      hydrateDepartmentsPage(container);
    });
    hydrateModals(container);
    return;
  }

  if (route === 'admin/designations') {
    import('./admin.js').then(({ loadDesignations, renderDesignations, loadDepartments, hydrateDesignationsPage }) => {
      hydrateDesignationsPage(container);
    });
    hydrateModals(container);
    return;
  }

  if (route === 'admin/user-roles') {
    import('./admin.js').then(({ hydrateUserRolesPage }) => {
      hydrateUserRolesPage(container);
    });
    hydrateModals(container);
    return;
  }

  if (route === 'admin/reporting') {
    import('./admin.js').then(({ loadAllUsers, loadDepartments, loadDesignations, exportToCSV, exportToPDF }) => {
      // Wire up export buttons
      container.querySelector('[data-action="export-users-pdf"]')?.addEventListener('click', async () => {
        const users = await loadAllUsers();
        exportToPDF(users, 'Users Report', 'users-report.pdf');
      });
      container.querySelector('[data-action="export-users-csv"]')?.addEventListener('click', async () => {
        const users = await loadAllUsers();
        exportToCSV(users, 'users-report.csv');
      });
      container.querySelector('[data-action="export-departments-pdf"]')?.addEventListener('click', async () => {
        const depts = await loadDepartments();
        exportToPDF(depts, 'Departments Report', 'departments-report.pdf');
      });
      container.querySelector('[data-action="export-departments-csv"]')?.addEventListener('click', async () => {
        const depts = await loadDepartments();
        exportToCSV(depts, 'departments-report.csv');
      });
      container.querySelector('[data-action="export-designations-pdf"]')?.addEventListener('click', async () => {
        const desgs = await loadDesignations();
        exportToPDF(desgs, 'Designations Report', 'designations-report.pdf');
      });
      container.querySelector('[data-action="export-designations-csv"]')?.addEventListener('click', async () => {
        const desgs = await loadDesignations();
        exportToCSV(desgs, 'designations-report.csv');
      });
      container.querySelector('[data-action="export-user-roles-pdf"]')?.addEventListener('click', async () => {
        const { loadUserRoles } = await import('./admin.js');
        const roles = await loadUserRoles();
        exportToPDF(roles, 'User Roles Report', 'user-roles-report.pdf');
      });
      container.querySelector('[data-action="export-user-roles-csv"]')?.addEventListener('click', async () => {
        const { loadUserRoles } = await import('./admin.js');
        const roles = await loadUserRoles();
        exportToCSV(roles, 'user-roles-report.csv');
      });
      container.querySelector('[data-action="refresh-reports"]')?.addEventListener('click', () => {
        showToast('Reports refreshed', 'success');
      });
    });
    return;
  }

  // Check if we're on user dashboard
  const userDashboard = container.querySelector('#user-offers-count');
  if (userDashboard) {
    hydrateUserDashboard(container);
    return;
  }

  // Check if we're on user profile page
  const userProfile = container.querySelector('#profile-name');
  if (userProfile) {
    hydrateUserProfilePage(container);
    return;
  }

  // Check if we're on user settings page
  const userSettings = container.querySelector('#profile-settings-form');
  if (userSettings) {
    hydrateUserSettingsPage(container);
    return;
  }
  
  // Regular page hydration
  hydrateRoleSelector();
  hydrateTables(container);
  hydrateLineItems(container);
  hydrateLineItemCalculations(container);
  hydrateProductTable(container);
  hydrateProductForm(container);
  hydrateProductImportExport(container);
  hydrateProductDetails(container);
  hydrateBoqProductPicker(container);
  hydrateOfferForm(container);
  hydrateRequestActivity(container);
  hydrateApprovalTimeline(container);
  hydrateModals(container);
  hydrateFormSubmissions(container);
  hydrateButtonActions(container);
  hydrateFilters(container);
  renderCharts(container);
  applyRoleVisibility(getCurrentRole());
  updateRoleBadges(getCurrentRole());
}

