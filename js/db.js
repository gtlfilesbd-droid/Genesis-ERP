// SQLite Database Module using sql.js with IndexedDB persistence
let db = null;
let SQL = null;
const DB_NAME = 'genesis-erp-database';
const DB_STORE = 'sqlite-db';
const DB_VERSION = 1;

// Initialize IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('[DB] IndexedDB open error:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      console.log('[DB] IndexedDB opened successfully');
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
        console.log('[DB] IndexedDB object store created');
      }
    };
  });
}

// Save database to IndexedDB
async function saveDatabaseToIndexedDB() {
  if (!db) {
    console.warn('[DB] Cannot save: database not initialized');
    return false;
  }
  
  try {
    const data = db.export();
    if (!data || data.length === 0) {
      console.warn('[DB] Database export is empty');
      return false;
    }
    
    const buffer = new Uint8Array(data);
    const idb = await openIndexedDB();
    const transaction = idb.transaction([DB_STORE], 'readwrite');
    const store = transaction.objectStore(DB_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.put(buffer, 'database');
      
      request.onsuccess = () => {
        console.log('[DB] ✓ Database saved to IndexedDB (' + Math.round(buffer.length / 1024) + ' KB)');
        idb.close();
        resolve(true);
      };
      
      request.onerror = () => {
        console.error('[DB] Error saving to IndexedDB:', request.error);
        idb.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[DB] Error saving database to IndexedDB:', error);
    return false;
  }
}

// Load database from IndexedDB
async function loadDatabaseFromIndexedDB() {
  try {
    const idb = await openIndexedDB();
    const transaction = idb.transaction([DB_STORE], 'readonly');
    const store = transaction.objectStore(DB_STORE);
    
    return new Promise((resolve, reject) => {
      const request = store.get('database');
      
      request.onsuccess = () => {
        idb.close();
        if (request.result) {
          console.log('[DB] ✓ Database loaded from IndexedDB (' + request.result.length + ' bytes)');
          resolve(request.result);
        } else {
          console.log('[DB] No database found in IndexedDB');
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error('[DB] Error loading from IndexedDB:', request.error);
        idb.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[DB] Error loading database from IndexedDB:', error);
    return null;
  }
}

// Initialize SQL.js and create/load database
export async function initDatabase() {
  if (db) {
    return db; // Already initialized
  }

  try {
    // Wait for sql.js to be available (from CDN)
    if (typeof window !== 'undefined' && typeof window.initSqlJs !== 'undefined') {
      SQL = await window.initSqlJs({
        locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`
      });
    } else if (typeof initSqlJs !== 'undefined') {
      SQL = await initSqlJs({
        locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`
      });
    } else {
      // Wait a bit for the script to load
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if ((typeof window !== 'undefined' && typeof window.initSqlJs !== 'undefined') || typeof initSqlJs !== 'undefined') {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 5000);
      });
      
      if (typeof window !== 'undefined' && typeof window.initSqlJs !== 'undefined') {
        SQL = await window.initSqlJs({
          locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`
        });
      } else if (typeof initSqlJs !== 'undefined') {
        SQL = await initSqlJs({
          locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`
        });
      } else {
        throw new Error('sql.js library not loaded. Please check the CDN link.');
      }
    }

    // Try to load existing database from IndexedDB
    console.log('[DB] Checking IndexedDB for saved database...');
    const savedData = await loadDatabaseFromIndexedDB();
    
    if (savedData && savedData.length > 0) {
      try {
        // Create database from saved data
        db = new SQL.Database(savedData);
        console.log('[DB] ✓ Loaded existing database from IndexedDB');
        
        // Verify database is working by checking if tables exist
        try {
          const testResult = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
          const tableNames = testResult[0]?.values?.map(v => v[0]) || [];
          console.log('[DB] Database tables found:', tableNames);
          
          // If no tables exist, create schema
          if (tableNames.length === 0) {
            console.log('[DB] No tables found, creating schema...');
            createSchema();
            await saveDatabaseToIndexedDB();
          } else {
            // Ensure schema exists (in case of migration)
            createSchema();
          }
        } catch (testError) {
          console.warn('[DB] Error checking tables, recreating schema:', testError);
          createSchema();
          await saveDatabaseToIndexedDB();
        }
      } catch (error) {
        console.warn('[DB] Error loading saved database, creating new one:', error);
        // If loading fails, create a new database
        db = new SQL.Database();
        createSchema();
        await saveDatabaseToIndexedDB();
      }
    } else {
      // Create new database
      db = new SQL.Database();
      console.log('[DB] Created new database');
      // Initialize schema
      createSchema();
      // Save initial empty database
      await saveDatabaseToIndexedDB();
    }

    return db;
  } catch (error) {
    console.error('[DB] Error initializing database:', error);
    throw error;
  }
}

// Create database schema
function createSchema() {
  if (!db) {
    console.error('[DB] Cannot create schema: database not initialized');
    return;
  }
  
  // Products table
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      format TEXT DEFAULT 'local',
      description TEXT,
      brand TEXT,
      model TEXT,
      origin TEXT,
      shipment TEXT,
      manufacturer TEXT,
      quantity INTEGER DEFAULT 0,
      unit TEXT,
      unitPrice REAL DEFAULT 0,
      commission REAL DEFAULT 0,
      image TEXT,
      serial TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);

  // Offers table
  db.run(`
    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      customer TEXT,
      department TEXT,
      value REAL DEFAULT 0,
      status TEXT DEFAULT 'Pending',
      owner TEXT,
      createdAt TEXT,
      notes TEXT
    )
  `);

  // Offer Products (many-to-many relationship)
  db.run(`
    CREATE TABLE IF NOT EXISTS offer_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      offer_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  // BOQs table
  db.run(`
    CREATE TABLE IF NOT EXISTS boqs (
      id TEXT PRIMARY KEY,
      project TEXT,
      department TEXT,
      approver TEXT,
      status TEXT DEFAULT 'Pending',
      budget REAL DEFAULT 0,
      createdAt TEXT
    )
  `);

  // BOQ Line Items
  db.run(`
    CREATE TABLE IF NOT EXISTS boq_line_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      boq_id TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT,
      product_description TEXT,
      brand TEXT,
      model TEXT,
      origin TEXT,
      shipment TEXT,
      manufacturer TEXT,
      quantity INTEGER DEFAULT 0,
      unit TEXT,
      unit_price REAL DEFAULT 0,
      profit_margin REAL DEFAULT 0,
      format TEXT DEFAULT 'local',
      vat REAL DEFAULT 0,
      ait REAL DEFAULT 0,
      ex_works_cost REAL DEFAULT 0,
      cnf_cost REAL DEFAULT 0,
      shipping_cost REAL DEFAULT 0,
      total_unit_price REAL DEFAULT 0,
      total_price REAL DEFAULT 0,
      FOREIGN KEY (boq_id) REFERENCES boqs(id) ON DELETE CASCADE
    )
  `);

  // BOQ Timeline
  db.run(`
    CREATE TABLE IF NOT EXISTS boq_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      boq_id TEXT NOT NULL,
      title TEXT,
      by TEXT,
      date TEXT,
      FOREIGN KEY (boq_id) REFERENCES boqs(id) ON DELETE CASCADE
    )
  `);

  // Requests table
  db.run(`
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      type TEXT,
      requester TEXT,
      amount REAL DEFAULT 0,
      status TEXT DEFAULT 'Pending',
      manager TEXT,
      department TEXT,
      notes TEXT,
      createdAt TEXT
    )
  `);

  // Request Activity Log
  db.run(`
    CREATE TABLE IF NOT EXISTS request_activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL,
      action TEXT,
      actor TEXT,
      at TEXT,
      FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
    )
  `);

  console.log('[DB] Schema created/verified successfully');
}

// Save database to IndexedDB (exported for use in data.js)
export async function saveDatabase() {
  return await saveDatabaseToIndexedDB();
}

// Export database as a downloadable .db file
export async function exportDatabaseAsFile() {
  if (!db) {
    console.error('[DB] Cannot export: database not initialized');
    return false;
  }
  
  try {
    const data = db.export();
    const buffer = new Uint8Array(data);
    const blob = new Blob([buffer], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'genesis-erp-data.db';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('[DB] Database exported as genesis-erp-data.db');
    return true;
  } catch (error) {
    console.error('[DB] Error exporting database:', error);
    return false;
  }
}

// Import database from a .db file
export async function importDatabaseFromFile(file) {
  if (!file) {
    console.error('[DB] No file provided');
    return false;
  }
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Close existing database if any
    if (db) {
      db.close();
    }
    
    // Create new database from file
    db = new SQL.Database(bytes);
    console.log('[DB] Database imported from file:', file.name);
    
    // Verify database
    try {
      const testResult = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
      const tableNames = testResult[0]?.values?.map(v => v[0]) || [];
      console.log('[DB] Imported database tables:', tableNames);
      
      // Ensure schema exists
      createSchema();
      
      // Save to IndexedDB
      await saveDatabaseToIndexedDB();
      console.log('[DB] Imported database saved to IndexedDB');
      return true;
    } catch (testError) {
      console.error('[DB] Error verifying imported database:', testError);
      return false;
    }
  } catch (error) {
    console.error('[DB] Error importing database:', error);
    return false;
  }
}

// Get database instance
export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Helper function to convert SQL result to array of objects
export function resultToArray(result) {
  if (!result || !result.length) return [];
  
  const rows = result[0].values;
  const columns = result[0].columns;
  
  return rows.map(row => {
    const obj = {};
    columns.forEach((col, index) => {
      obj[col] = row[index];
    });
    return obj;
  });
}

// Helper function to execute query and return single result
export function executeQuery(sql, params = []) {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  
  if (params.length > 0) {
    stmt.bind(params);
  }
  
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  
  return result;
}

// Helper function to execute query and return all results
export function executeQueryAll(sql, params = []) {
  const database = getDatabase();
  const stmt = database.prepare(sql);
  
  if (params.length > 0) {
    stmt.bind(params);
  }
  
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  
  return results;
}

// Helper function to execute SQL (for CREATE, INSERT, UPDATE, DELETE)
export async function executeSQL(sql, params = []) {
  const database = getDatabase();
  
  if (params.length > 0) {
    const stmt = database.prepare(sql);
    stmt.run(params);
    stmt.free();
  } else {
    database.run(sql);
  }
  
  // Auto-save after modifications (async)
  saveDatabase().catch(err => {
    console.error('[DB] Error auto-saving after SQL execution:', err);
  });
}
