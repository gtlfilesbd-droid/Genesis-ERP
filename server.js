const initSqlJs = require('sql.js');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'genesis-erp-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static(__dirname));

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Role-based middleware
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Database setup
const dbPath = path.join(__dirname, 'data.db');
let db = null;

// Initialize database
async function initDatabase() {
  try {
    const SQL = await initSqlJs();
    
    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
      console.log('[Server] Database loaded from file');
    } else {
      db = new SQL.Database();
      console.log('[Server] New database created');
    }

    // Create schema
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

    db.run(`
      CREATE TABLE IF NOT EXISTS offer_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        offer_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER DEFAULT 1
      )
    `);

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

    // Users table for authentication
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        status TEXT DEFAULT 'pending',
        profilePicture TEXT,
        bio TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        country TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
      )
    `);
    
    // Migrate existing users table if needed (add new columns)
    try {
      const tableInfo = executeQueryAll("PRAGMA table_info(users)");
      const columns = tableInfo.map(col => col.name);
      
      if (!columns.includes('profilePicture')) {
        db.run('ALTER TABLE users ADD COLUMN profilePicture TEXT');
        console.log('[Server] Added profilePicture column to users table');
      }
      if (!columns.includes('bio')) {
        db.run('ALTER TABLE users ADD COLUMN bio TEXT');
        console.log('[Server] Added bio column to users table');
      }
      if (!columns.includes('phone')) {
        db.run('ALTER TABLE users ADD COLUMN phone TEXT');
        console.log('[Server] Added phone column to users table');
      }
      if (!columns.includes('address')) {
        db.run('ALTER TABLE users ADD COLUMN address TEXT');
        console.log('[Server] Added address column to users table');
      }
      if (!columns.includes('city')) {
        db.run('ALTER TABLE users ADD COLUMN city TEXT');
        console.log('[Server] Added city column to users table');
      }
      if (!columns.includes('country')) {
        db.run('ALTER TABLE users ADD COLUMN country TEXT');
        console.log('[Server] Added country column to users table');
      }
    } catch (error) {
      console.warn('[Server] Migration check failed (table may already have columns):', error.message);
    }

    // Departments table
    db.run(`
      CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        createdAt TEXT DEFAULT (datetime('now'))
      )
    `);

    // Designations table
    db.run(`
      CREATE TABLE IF NOT EXISTS designations (
        id TEXT PRIMARY KEY,
        department_id TEXT NOT NULL,
        title TEXT NOT NULL,
        createdAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
      )
    `);

    // Create default admin user if no users exist
    const existingUsers = executeQueryAll('SELECT * FROM users LIMIT 1');
    if (existingUsers.length === 0) {
      const adminPassword = await bcrypt.hash('admin123', 10);
      const adminId = `USER-${Date.now()}`;
      const stmt = db.prepare('INSERT INTO users (id, name, email, username, password, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
      stmt.run([adminId, 'System Admin', 'admin@genesis.com', 'admin', adminPassword, 'admin', 'approved']);
      stmt.free();
      console.log('[Server] Default admin user created: username=admin, password=admin123');
    }

    // Save initial schema
    saveDatabase();
    console.log('[Server] Database initialized');
  } catch (error) {
    console.error('[Server] Database initialization error:', error);
    throw error;
  }
}

// Save database to file
function saveDatabase() {
  try {
    if (db) {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    }
  } catch (error) {
    console.error('[Server] Error saving database:', error);
  }
}

// Helper to convert SQL result to array of objects
function resultToArray(result) {
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

// Helper to execute query and return all results
function executeQueryAll(sql, params = []) {
  const stmt = db.prepare(sql);
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

// Helper to execute query and return single result
function executeQuery(sql, params = []) {
  const results = executeQueryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

// Initialize database before starting server
initDatabase().then(() => {
  // =============================
  // Authentication API Endpoints
  // =============================

  // Signup endpoint
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { name, email, username, password } = req.body;

      // Validation
      if (!name || !email || !username || !password) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Check if email or username already exists
      const existingEmail = executeQuery('SELECT * FROM users WHERE email = ?', [email]);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const existingUsername = executeQuery('SELECT * FROM users WHERE username = ?', [username]);
      if (existingUsername) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = `USER-${Date.now()}`;
      const createdAt = new Date().toISOString();

      // Insert user with pending status
      const stmt = db.prepare('INSERT INTO users (id, name, email, username, password, role, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      stmt.run([id, name, email, username, hashedPassword, 'user', 'pending', createdAt, createdAt]);
      stmt.free();
      saveDatabase();

      res.json({ 
        success: true, 
        message: 'Account created successfully. Please wait for admin approval.',
        userId: id
      });
    } catch (err) {
      console.error('[Server] Signup error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      // Find user
      const user = executeQuery('SELECT * FROM users WHERE username = ?', [username]);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if user is approved
      if (user.status !== 'approved') {
        return res.status(403).json({ error: 'Account pending approval. Please wait for admin approval.' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          email: user.email, 
          role: user.role,
          name: user.name
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          status: user.status
        }
      });
    } catch (err) {
      console.error('[Server] Login error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Verify token endpoint
  app.get('/api/auth/verify', authenticateToken, (req, res) => {
    try {
      const userId = req.user.id;
      // Get full user profile from database
      const user = executeQuery('SELECT id, name, email, username, role, status, profilePicture, bio, phone, address, city, country, createdAt, updatedAt FROM users WHERE id = ?', [userId]);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        success: true,
        user: user
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // =============================
  // Admin API Endpoints
  // =============================

  // Get pending users
  app.get('/api/admin/pending-users', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const results = executeQueryAll('SELECT id, name, email, username, role, status, createdAt FROM users WHERE status = ? ORDER BY createdAt DESC', ['pending']);
      res.json(results || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get all users
  app.get('/api/admin/users', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const results = executeQueryAll('SELECT id, name, email, username, role, status, createdAt, updatedAt FROM users ORDER BY createdAt DESC');
      res.json(results || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Approve or reject user
  app.put('/api/admin/users/:id/status', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
      }

      const updatedAt = new Date().toISOString();
      const stmt = db.prepare('UPDATE users SET status = ?, updatedAt = ? WHERE id = ?');
      stmt.run([status, updatedAt, id]);
      stmt.free();
      saveDatabase();

      const updatedUser = executeQuery('SELECT id, name, email, username, role, status FROM users WHERE id = ?', [id]);
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ success: true, user: updatedUser });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Departments CRUD
  app.get('/api/admin/departments', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const results = executeQueryAll('SELECT * FROM departments ORDER BY name');
      res.json(results || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/departments', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Department name is required' });
      }

      // Check if department already exists
      const existing = executeQuery('SELECT * FROM departments WHERE name = ?', [name.trim()]);
      if (existing) {
        return res.status(400).json({ error: 'Department already exists' });
      }

      const id = `DEPT-${Date.now()}`;
      const createdAt = new Date().toISOString();
      const stmt = db.prepare('INSERT INTO departments (id, name, createdAt) VALUES (?, ?, ?)');
      stmt.run([id, name.trim(), createdAt]);
      stmt.free();
      saveDatabase();

      res.json({ success: true, id, name: name.trim() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/departments/:id', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Department name is required' });
      }

      // Check if another department with same name exists
      const existing = executeQuery('SELECT * FROM departments WHERE name = ? AND id != ?', [name.trim(), id]);
      if (existing) {
        return res.status(400).json({ error: 'Department name already exists' });
      }

      const stmt = db.prepare('UPDATE departments SET name = ? WHERE id = ?');
      stmt.run([name.trim(), id]);
      stmt.free();
      saveDatabase();

      const updated = executeQuery('SELECT * FROM departments WHERE id = ?', [id]);
      if (!updated) {
        return res.status(404).json({ error: 'Department not found' });
      }

      res.json({ success: true, department: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/departments/:id', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const { id } = req.params;

      const existing = executeQuery('SELECT * FROM departments WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ error: 'Department not found' });
      }

      const stmt = db.prepare('DELETE FROM departments WHERE id = ?');
      stmt.run([id]);
      stmt.free();
      saveDatabase();

      res.json({ success: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Designations CRUD
  app.get('/api/admin/designations', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const departmentId = req.query.department_id;
      let sql = 'SELECT d.*, dept.name as department_name FROM designations d LEFT JOIN departments dept ON d.department_id = dept.id';
      let params = [];
      
      if (departmentId) {
        sql += ' WHERE d.department_id = ?';
        params.push(departmentId);
      }
      
      sql += ' ORDER BY dept.name, d.title';
      const results = executeQueryAll(sql, params);
      res.json(results || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/designations', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const { department_id, title } = req.body;
      if (!department_id || !title || !title.trim()) {
        return res.status(400).json({ error: 'Department ID and title are required' });
      }

      // Check if department exists
      const dept = executeQuery('SELECT * FROM departments WHERE id = ?', [department_id]);
      if (!dept) {
        return res.status(400).json({ error: 'Department not found' });
      }

      const id = `DESG-${Date.now()}`;
      const createdAt = new Date().toISOString();
      const stmt = db.prepare('INSERT INTO designations (id, department_id, title, createdAt) VALUES (?, ?, ?, ?)');
      stmt.run([id, department_id, title.trim(), createdAt]);
      stmt.free();
      saveDatabase();

      const created = executeQuery('SELECT d.*, dept.name as department_name FROM designations d LEFT JOIN departments dept ON d.department_id = dept.id WHERE d.id = ?', [id]);
      res.json({ success: true, designation: created });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/designations/:id', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const { id } = req.params;
      const { department_id, title } = req.body;

      if (!department_id || !title || !title.trim()) {
        return res.status(400).json({ error: 'Department ID and title are required' });
      }

      // Check if department exists
      const dept = executeQuery('SELECT * FROM departments WHERE id = ?', [department_id]);
      if (!dept) {
        return res.status(400).json({ error: 'Department not found' });
      }

      const stmt = db.prepare('UPDATE designations SET department_id = ?, title = ? WHERE id = ?');
      stmt.run([department_id, title.trim(), id]);
      stmt.free();
      saveDatabase();

      const updated = executeQuery('SELECT d.*, dept.name as department_name FROM designations d LEFT JOIN departments dept ON d.department_id = dept.id WHERE d.id = ?', [id]);
      if (!updated) {
        return res.status(404).json({ error: 'Designation not found' });
      }

      res.json({ success: true, designation: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/designations/:id', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const { id } = req.params;

      const existing = executeQuery('SELECT * FROM designations WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ error: 'Designation not found' });
      }

      const stmt = db.prepare('DELETE FROM designations WHERE id = ?');
      stmt.run([id]);
      stmt.free();
      saveDatabase();

      res.json({ success: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // =============================
  // User Profile API Endpoints
  // =============================

  // Get current user profile
  app.get('/api/user/profile', authenticateToken, (req, res) => {
    try {
      const userId = req.user.id;
      const user = executeQuery('SELECT id, name, email, username, role, status, profilePicture, bio, phone, address, city, country, createdAt, updatedAt FROM users WHERE id = ?', [userId]);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update user profile
  app.put('/api/user/profile', authenticateToken, (req, res) => {
    try {
      const userId = req.user.id;
      const { name, bio, phone, address, city, country, profilePicture } = req.body;
      
      // Check if user exists
      const existingUser = executeQuery('SELECT * FROM users WHERE id = ?', [userId]);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Update profile
      const updatedAt = new Date().toISOString();
      const sql = `UPDATE users SET name = ?, bio = ?, phone = ?, address = ?, city = ?, country = ?, profilePicture = ?, updatedAt = ? WHERE id = ?`;
      const stmt = db.prepare(sql);
      stmt.run([
        name || existingUser.name || "",
        bio || existingUser.bio || "",
        phone || existingUser.phone || "",
        address || existingUser.address || "",
        city || existingUser.city || "",
        country || existingUser.country || "",
        profilePicture || existingUser.profilePicture || "",
        updatedAt,
        userId
      ]);
      stmt.free();
      saveDatabase();
      
      // Return updated user (excluding password)
      const updatedUser = executeQuery('SELECT id, name, email, username, role, status, profilePicture, bio, phone, address, city, country, createdAt, updatedAt FROM users WHERE id = ?', [userId]);
      res.json({ success: true, user: updatedUser });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Change user password
  app.put('/api/user/password', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ error: 'All password fields are required' });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
      
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'New password and confirmation do not match' });
      }
      
      // Get user and verify current password
      const user = executeQuery('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      
      // Hash new password and update
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updatedAt = new Date().toISOString();
      const stmt = db.prepare('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?');
      stmt.run([hashedPassword, updatedAt, userId]);
      stmt.free();
      saveDatabase();
      
      res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // =============================
  // Protected ERP API Endpoints
  // =============================
  
  // Note: Existing endpoints below are kept as-is but can be protected by adding authenticateToken middleware

  // Products API
  app.get('/api/products', (req, res) => {
    try {
      const results = executeQueryAll('SELECT * FROM products ORDER BY createdAt DESC');
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/products/:id', (req, res) => {
    try {
      const id = req.params.id;
      const result = executeQuery('SELECT * FROM products WHERE id = ?', [id]);
      if (!result) return res.status(404).json({ error: 'Product not found' });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/products', (req, res) => {
    try {
      const p = req.body;
      const id = p.id || `PROD-${Date.now()}`;
      const sql = `INSERT INTO products (id, name, format, description, brand, model, origin, shipment, manufacturer, quantity, unit, unitPrice, commission, image, serial) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const stmt = db.prepare(sql);
      stmt.run([
        id, p.name || "", p.format || "local", p.description || "", p.brand || "", p.model || "",
        p.origin || "", p.shipment || "", p.manufacturer || "", p.quantity || 0, p.unit || "",
        p.unitPrice || 0, p.commission || 0, p.image || "", p.serial || ""
      ]);
      stmt.free();
      saveDatabase();
      res.json({ id, success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/products/:id', (req, res) => {
    try {
      const id = req.params.id;
      const p = req.body;
      const sql = `UPDATE products SET name = ?, format = ?, description = ?, brand = ?, model = ?, origin = ?, shipment = ?, manufacturer = ?, quantity = ?, unit = ?, unitPrice = ?, commission = ?, image = ?, serial = ? WHERE id = ?`;
      const stmt = db.prepare(sql);
      stmt.run([
        p.name || "", p.format || "local", p.description || "", p.brand || "", p.model || "",
        p.origin || "", p.shipment || "", p.manufacturer || "", p.quantity || 0, p.unit || "",
        p.unitPrice || 0, p.commission || 0, p.image || "", p.serial || "", id
      ]);
      stmt.free();
      saveDatabase();
      
      // Check if row was updated
      const checkResult = executeQuery('SELECT * FROM products WHERE id = ?', [id]);
      if (!checkResult) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json({ id, success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/products/:id', (req, res) => {
    try {
      const id = req.params.id;
      // Check if exists first
      const checkResult = executeQuery('SELECT * FROM products WHERE id = ?', [id]);
      if (!checkResult) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      const stmt = db.prepare('DELETE FROM products WHERE id = ?');
      stmt.run([id]);
      stmt.free();
      saveDatabase();
      res.json({ id, success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== OFFERS API ====================

  app.get('/api/offers', (req, res) => {
    try {
      const results = executeQueryAll('SELECT * FROM offers ORDER BY createdAt DESC');
      res.json(results || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/offers', (req, res) => {
    try {
      const o = req.body;
      const id = o.id || `OFFER-${Date.now()}`;
      const createdAt = o.createdAt || new Date().toISOString();
      const sql = `INSERT INTO offers (id, customer, department, value, status, owner, createdAt, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      const stmt = db.prepare(sql);
      stmt.run([
        id, o.customer || "", o.department || "", o.value || 0, o.status || "Pending", 
        o.owner || "", createdAt, o.notes || ""
      ]);
      stmt.free();
      saveDatabase();
      res.json({ id, success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/offers/:id', (req, res) => {
    try {
      const id = req.params.id;
      const o = req.body;
      const sql = `UPDATE offers SET customer = ?, department = ?, value = ?, status = ?, owner = ?, createdAt = ?, notes = ? WHERE id = ?`;
      const stmt = db.prepare(sql);
      stmt.run([
        o.customer || "", o.department || "", o.value || 0, o.status || "Pending",
        o.owner || "", o.createdAt || "", o.notes || "", id
      ]);
      stmt.free();
      saveDatabase();
      
      const checkResult = executeQuery('SELECT * FROM offers WHERE id = ?', [id]);
      if (!checkResult) {
        return res.status(404).json({ error: 'Offer not found' });
      }
      res.json({ id, success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/offers/:id', (req, res) => {
    try {
      const id = req.params.id;
      const checkResult = executeQuery('SELECT * FROM offers WHERE id = ?', [id]);
      if (!checkResult) {
        return res.status(404).json({ error: 'Offer not found' });
      }
      
      const stmt = db.prepare('DELETE FROM offers WHERE id = ?');
      stmt.run([id]);
      stmt.free();
      saveDatabase();
      res.json({ id, success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== BOQs API ====================

  app.get('/api/boqs', (req, res) => {
    try {
      const results = executeQueryAll('SELECT * FROM boqs ORDER BY createdAt DESC');
      res.json(results || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/boqs', (req, res) => {
    try {
      const b = req.body;
      const id = b.id || `BOQ-${Date.now()}`;
      const createdAt = b.createdAt || new Date().toISOString();
      const sql = `INSERT INTO boqs (id, project, department, approver, status, budget, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      const stmt = db.prepare(sql);
      stmt.run([
        id, b.project || "", b.department || "", b.approver || "", b.status || "Pending",
        b.budget || 0, createdAt
      ]);
      stmt.free();
      saveDatabase();
      res.json({ id, success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/boqs/:id', (req, res) => {
    try {
      const id = req.params.id;
      const b = req.body;
      const sql = `UPDATE boqs SET project = ?, department = ?, approver = ?, status = ?, budget = ?, createdAt = ? WHERE id = ?`;
      const stmt = db.prepare(sql);
      stmt.run([
        b.project || "", b.department || "", b.approver || "", b.status || "Pending",
        b.budget || 0, b.createdAt || "", id
      ]);
      stmt.free();
      saveDatabase();
      
      const checkResult = executeQuery('SELECT * FROM boqs WHERE id = ?', [id]);
      if (!checkResult) {
        return res.status(404).json({ error: 'BOQ not found' });
      }
      res.json({ id, success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/boqs/:id', (req, res) => {
    try {
      const id = req.params.id;
      const checkResult = executeQuery('SELECT * FROM boqs WHERE id = ?', [id]);
      if (!checkResult) {
        return res.status(404).json({ error: 'BOQ not found' });
      }
      
      const stmt = db.prepare('DELETE FROM boqs WHERE id = ?');
      stmt.run([id]);
      stmt.free();
      saveDatabase();
      res.json({ id, success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== REQUESTS API ====================

  app.get('/api/requests', (req, res) => {
    try {
      const results = executeQueryAll('SELECT * FROM requests ORDER BY createdAt DESC');
      res.json(results || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/requests', (req, res) => {
    try {
      const r = req.body;
      const id = r.id || `REQ-${Date.now()}`;
      const createdAt = r.createdAt || new Date().toISOString();
      const sql = `INSERT INTO requests (id, type, requester, amount, status, manager, department, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const stmt = db.prepare(sql);
      stmt.run([
        id, r.type || "", r.requester || "", r.amount || 0, r.status || "Pending",
        r.manager || "", r.department || "", r.notes || "", createdAt
      ]);
      stmt.free();
      saveDatabase();
      res.json({ id, success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/requests/:id', (req, res) => {
    try {
      const id = req.params.id;
      const r = req.body;
      const sql = `UPDATE requests SET type = ?, requester = ?, amount = ?, status = ?, manager = ?, department = ?, notes = ?, createdAt = ? WHERE id = ?`;
      const stmt = db.prepare(sql);
      stmt.run([
        r.type || "", r.requester || "", r.amount || 0, r.status || "Pending",
        r.manager || "", r.department || "", r.notes || "", r.createdAt || "", id
      ]);
      stmt.free();
      saveDatabase();
      
      const checkResult = executeQuery('SELECT * FROM requests WHERE id = ?', [id]);
      if (!checkResult) {
        return res.status(404).json({ error: 'Request not found' });
      }
      res.json({ id, success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/requests/:id', (req, res) => {
    try {
      const id = req.params.id;
      const checkResult = executeQuery('SELECT * FROM requests WHERE id = ?', [id]);
      if (!checkResult) {
        return res.status(404).json({ error: 'Request not found' });
      }
      
      const stmt = db.prepare('DELETE FROM requests WHERE id = ?');
      stmt.run([id]);
      stmt.free();
      saveDatabase();
      res.json({ id, success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Start server
  const server = app.listen(PORT, () => {
    console.log(`[Server] Genesis ERP running on http://localhost:${PORT}`);
    console.log(`[Server] SQLite Database: ${dbPath}`);
  });

  // Handle server errors (like port already in use)
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`\n[Server] ERROR: Port ${PORT} is already in use.`);
      console.error(`[Server] Please do one of the following:`);
      console.error(`  1. Stop the other process using port ${PORT}`);
      console.error(`  2. Change the PORT in server.js to a different port`);
      console.error(`  3. On Windows, run: netstat -ano | findstr :${PORT}`);
      console.error(`     Then kill the process: taskkill /PID <PID> /F`);
      process.exit(1);
    } else {
      console.error('[Server] Server error:', error);
      process.exit(1);
    }
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[Server] Shutting down gracefully...');
    saveDatabase();
    if (db) {
      db.close();
    }
    server.close(() => {
      console.log('[Server] Database connection closed');
      console.log('[Server] Server stopped');
      process.exit(0);
    });
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
  });

}).catch((error) => {
  console.error('[Server] Failed to initialize database:', error);
  process.exit(1);
});
