// API Configuration
const API_BASE_URL = 'http://localhost:3001/api';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  try {
    // Import auth to get token (dynamic import to avoid circular dependencies)
    const { getAuthHeader } = await import('./auth.js');
    const authHeaders = getAuthHeader();
    
    const method = options.method || (options.body ? 'POST' : 'GET');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`[API] Error calling ${endpoint}:`, error);
    throw error;
  }
}

export const roles = ["User", "Department Head", "Management", "Admin"];

export const kpiData = {
  revenue: 420000,
  cost: 275000,
  profit: 145000,
  margin: 34.5,
};

export const departments = [
  { name: "Industrial", head: "Dennis Shaw", target: 280000 },
  { name: "Logistics", head: "Sandra Li", target: 190000 },
  { name: "Healthcare", head: "Priya Nair", target: 220000 },
];

export const activityLog = [
  {
    action: "Request submitted",
    actor: "Liam Patel",
    at: "10:24 AM",
  },
  {
    action: "Manager review started",
    actor: "Stella H.",
    at: "11:10 AM",
  },
  {
    action: "Comment added",
    actor: "Finance QA",
    at: "11:45 AM",
  },
];

export const chartsDataset = {
  profitTrend: [18, 22, 24, 19, 27, 31, 29, 34, 36, 32, 38, 41],
  monthlySales: [42, 55, 62, 58, 71, 80, 74, 88, 95, 90, 97, 110],
  departmentShare: [
    { label: "Industrial", value: 38 },
    { label: "Logistics", value: 26 },
    { label: "Healthcare", value: 22 },
    { label: "Corporate", value: 14 },
  ],
};

export const approvalTimeline = [
  { title: "Submitted", by: "Offer Owner", date: "Nov 13, 08:12" },
  { title: "Department Head Review", by: "D. Shaw", date: "Nov 13, 10:05" },
  { title: "Finance Review", by: "S. Brown", date: "Nov 13, 13:44" },
  { title: "Management Approval", by: "P. Nolan", date: "Nov 13, 16:58" },
];

// ==================== PRODUCTS ====================

export async function getProducts() {
  try {
    const products = await apiCall('/products');
    return products.map(product => ({
      id: product.id,
      name: product.name,
      format: product.format || "local",
      description: product.description || "",
      brand: product.brand || "",
      model: product.model || "",
      origin: product.origin || "",
      shipment: product.shipment || "",
      manufacturer: product.manufacturer || "",
      quantity: product.quantity || 0,
      unit: product.unit || "",
      unitPrice: product.unitPrice || 0,
      commission: product.commission || 0,
      image: product.image || "",
      serial: product.serial || "",
    }));
  } catch (error) {
    console.error("[Data] Error getting products:", error);
    return [];
  }
}

export async function setProducts(products) {
  try {
    // Delete all existing products and insert new ones
    const existingProducts = await getProducts();
    for (const product of existingProducts) {
      await apiCall(`/products/${product.id}`, { method: 'DELETE' });
    }
    
    // Insert all products
    for (const product of products) {
      await apiCall('/products', {
        method: 'POST',
        body: JSON.stringify({
          id: product.id,
          name: product.name || "",
          format: product.format || "local",
          description: product.description || "",
          brand: product.brand || "",
          model: product.model || "",
          origin: product.origin || "",
          shipment: product.shipment || "",
          manufacturer: product.manufacturer || "",
          quantity: product.quantity || 0,
          unit: product.unit || "",
          unitPrice: product.unitPrice || 0,
          commission: product.commission || 0,
          image: product.image || "",
          serial: product.serial || "",
        }),
      });
    }
    
    return true;
  } catch (error) {
    console.error("[Data] Error setting products:", error);
    return false;
  }
}

export async function addProduct(product) {
  try {
    const id = `PROD-${Date.now()}`;
    const result = await apiCall('/products', {
      method: 'POST',
      body: JSON.stringify({
        id,
        name: product.name || "",
        format: product.format || "local",
        description: product.description || "",
        brand: product.brand || "",
        model: product.model || "",
        origin: product.origin || "",
        shipment: product.shipment || "",
        manufacturer: product.manufacturer || "",
        quantity: product.quantity || 0,
        unit: product.unit || "",
        unitPrice: product.unitPrice || 0,
        commission: product.commission || 0,
        image: product.image || "",
        serial: product.serial || "",
      }),
    });
    
    return result.id || id;
  } catch (error) {
    console.error("[Data] Error adding product:", error);
    return null;
  }
}

export async function updateProduct(id, updates) {
  try {
    await apiCall(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return true;
  } catch (error) {
    console.error("[Data] Error updating product:", error);
    return false;
  }
}

export async function deleteProduct(id) {
  try {
    await apiCall(`/products/${id}`, { method: 'DELETE' });
    return true;
  } catch (error) {
    console.error("[Data] Error deleting product:", error);
    return false;
  }
}

export async function getProductById(id) {
  try {
    const product = await apiCall(`/products/${id}`);
    return {
      id: product.id,
      name: product.name,
      format: product.format || "local",
      description: product.description || "",
      brand: product.brand || "",
      model: product.model || "",
      origin: product.origin || "",
      shipment: product.shipment || "",
      manufacturer: product.manufacturer || "",
      quantity: product.quantity || 0,
      unit: product.unit || "",
      unitPrice: product.unitPrice || 0,
      commission: product.commission || 0,
      image: product.image || "",
      serial: product.serial || "",
    };
  } catch (error) {
    console.error("[Data] Error getting product by ID:", error);
    return null;
  }
}

export async function importProducts(products) {
  try {
    const normalized = products.map((product) => ({
      id: product.id || `PROD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: product.name || "Unnamed Product",
      format: (product.format || "local").toLowerCase() === "foreign" ? "foreign" : "local",
      description: product.description || "",
      brand: product.brand || "",
      model: product.model || "",
      origin: product.origin || "",
      shipment: product.shipment || "",
      manufacturer: product.manufacturer || "",
      quantity: Number(product.quantity) || 0,
      unit: product.unit || "",
      unitPrice: Number(product.unitPrice) || 0,
      commission: Number(product.commission) || 0,
      image: product.image || "",
      serial: product.serial || product.model || "",
    }));
    
    // Insert all products
    for (const product of normalized) {
      await apiCall('/products', {
        method: 'POST',
        body: JSON.stringify(product),
      });
    }
    
    return normalized.length;
  } catch (error) {
    console.error("[Data] Error importing products:", error);
    return 0;
  }
}

export async function exportProductsToCSV() {
  const items = await getProducts();
  const headers = [
    "id",
    "name",
    "description",
    "brand",
    "model",
    "origin",
    "shipment",
    "manufacturer",
    "quantity",
    "unit",
    "unitPrice",
    "commission",
    "image",
    "serial",
  ];
  const rows = items.map((item) =>
    headers
      .map((key) => {
        const value = item[key] ?? "";
        if (typeof value === "string" && value.includes(",")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export async function exportProductsToJSON() {
  const products = await getProducts();
  return JSON.stringify(products, null, 2);
}

// ==================== OFFERS ====================

export async function getOffers() {
  try {
    return await apiCall('/offers');
  } catch (error) {
    console.error("[Data] Error getting offers:", error);
    return [];
  }
}

export async function setOffers(offers) {
  try {
    // Delete all existing offers
    const existingOffers = await getOffers();
    for (const offer of existingOffers) {
      await apiCall(`/offers/${offer.id}`, { method: 'DELETE' }).catch(() => {});
    }
    
    // Insert all offers
    for (const offer of offers) {
      await apiCall('/offers', {
        method: 'POST',
        body: JSON.stringify(offer),
      });
    }
    
    return true;
  } catch (error) {
    console.error("[Data] Error setting offers:", error);
    return false;
  }
}

export async function addOffer(offer) {
  try {
    const result = await apiCall('/offers', {
      method: 'POST',
      body: JSON.stringify(offer),
    });
    return result.id;
  } catch (error) {
    console.error("[Data] Error adding offer:", error);
    return null;
  }
}

export async function updateOffer(id, updates) {
  try {
    await apiCall(`/offers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return true;
  } catch (error) {
    console.error("[Data] Error updating offer:", error);
    return false;
  }
}

// ==================== BOQs ====================

export async function getBoqs() {
  try {
    return await apiCall('/boqs');
  } catch (error) {
    console.error("[Data] Error getting BOQs:", error);
    return [];
  }
}

export async function setBoqs(boqs) {
  try {
    // Delete all existing BOQs
    const existingBoqs = await getBoqs();
    for (const boq of existingBoqs) {
      await apiCall(`/boqs/${boq.id}`, { method: 'DELETE' }).catch(() => {});
    }
    
    // Insert all BOQs
    for (const boq of boqs) {
      await apiCall('/boqs', {
        method: 'POST',
        body: JSON.stringify(boq),
      });
    }
    
    return true;
  } catch (error) {
    console.error("[Data] Error setting BOQs:", error);
    return false;
  }
}

export async function addBoq(boq) {
  try {
    const result = await apiCall('/boqs', {
      method: 'POST',
      body: JSON.stringify(boq),
    });
    return result.id;
  } catch (error) {
    console.error("[Data] Error adding BOQ:", error);
    return null;
  }
}

export async function updateBoq(id, updates) {
  try {
    await apiCall(`/boqs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return true;
  } catch (error) {
    console.error("[Data] Error updating BOQ:", error);
    return false;
  }
}

// ==================== REQUESTS ====================

export async function getRequests() {
  try {
    return await apiCall('/requests');
  } catch (error) {
    console.error("[Data] Error getting requests:", error);
    return [];
  }
}

export async function setRequests(requests) {
  try {
    // Delete all existing requests
    const existingRequests = await getRequests();
    for (const request of existingRequests) {
      await apiCall(`/requests/${request.id}`, { method: 'DELETE' }).catch(() => {});
    }
    
    // Insert all requests
    for (const request of requests) {
      await apiCall('/requests', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    }
    
    return true;
  } catch (error) {
    console.error("[Data] Error setting requests:", error);
    return false;
  }
}

export async function addRequest(request) {
  try {
    const result = await apiCall('/requests', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return result.id;
  } catch (error) {
    console.error("[Data] Error adding request:", error);
    return null;
  }
}

export async function updateRequest(id, updates) {
  try {
    await apiCall(`/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return true;
  } catch (error) {
    console.error("[Data] Error updating request:", error);
    return false;
  }
}
