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
        permissions TEXT,
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
      if (!columns.includes('department_id')) {
        db.run('ALTER TABLE users ADD COLUMN department_id TEXT');
        console.log('[Server] Added department_id column to users table');
      }
      if (!columns.includes('designation_id')) {
        db.run('ALTER TABLE users ADD COLUMN designation_id TEXT');
        console.log('[Server] Added designation_id column to users table');
      }
      if (!columns.includes('permissions')) {
        db.run('ALTER TABLE users ADD COLUMN permissions TEXT');
        console.log('[Server] Added permissions column to users table');
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

    // User Roles table
    db.run(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        permissions TEXT,
        createdAt TEXT DEFAULT (datetime('now'))
      )
    `);

    // User Role Assignments table
    db.run(`
      CREATE TABLE IF NOT EXISTS user_role_assignments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        assignedAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES user_roles(id) ON DELETE CASCADE,
        UNIQUE(user_id, role_id)
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

    // Seed default departments if table is empty
    const existingDepartments = executeQueryAll('SELECT * FROM departments LIMIT 1');
    if (existingDepartments.length === 0) {
      console.log('[Server] No departments found, seeding default departments...');
      const defaultDepartments = [
        { id: 'DEPT-001', name: 'Information Technology' },
        { id: 'DEPT-002', name: 'Human Resources' },
        { id: 'DEPT-003', name: 'Finance' },
        { id: 'DEPT-004', name: 'Operations' },
        { id: 'DEPT-005', name: 'Sales & Marketing' }
      ];
      
      const deptStmt = db.prepare('INSERT INTO departments (id, name, createdAt) VALUES (?, ?, datetime("now"))');
      for (const dept of defaultDepartments) {
        try {
          deptStmt.run([dept.id, dept.name]);
          console.log('[Server] Created department:', dept.name);
        } catch (err) {
          console.warn('[Server] Failed to create department', dept.name, ':', err.message);
        }
      }
      deptStmt.free();
      console.log('[Server] Default departments seeded');
    }

    // Seed default designations if table is empty
    const existingDesignations = executeQueryAll('SELECT * FROM designations LIMIT 1');
    if (existingDesignations.length === 0) {
      console.log('[Server] No designations found, seeding default designations...');
      
      // Get all departments to assign designations
      const allDepartments = executeQueryAll('SELECT * FROM departments ORDER BY name');
      
      if (allDepartments.length > 0) {
        const defaultDesignations = [
          { department_id: allDepartments[0].id, title: 'Software Engineer' },
          { department_id: allDepartments[0].id, title: 'Senior Software Engineer' },
          { department_id: allDepartments[0].id, title: 'Team Lead' },
          { department_id: allDepartments[0].id, title: 'Project Manager' },
          { department_id: allDepartments[1]?.id || allDepartments[0].id, title: 'HR Manager' },
          { department_id: allDepartments[1]?.id || allDepartments[0].id, title: 'HR Executive' },
          { department_id: allDepartments[2]?.id || allDepartments[0].id, title: 'Finance Manager' },
          { department_id: allDepartments[2]?.id || allDepartments[0].id, title: 'Accountant' },
          { department_id: allDepartments[3]?.id || allDepartments[0].id, title: 'Operations Manager' },
          { department_id: allDepartments[3]?.id || allDepartments[0].id, title: 'Operations Executive' },
          { department_id: allDepartments[4]?.id || allDepartments[0].id, title: 'Sales Manager' },
          { department_id: allDepartments[4]?.id || allDepartments[0].id, title: 'Marketing Executive' }
        ];
        
        const desgStmt = db.prepare('INSERT INTO designations (id, department_id, title, createdAt) VALUES (?, ?, ?, datetime("now"))');
        let desgCounter = 1;
        for (const desg of defaultDesignations) {
          try {
            const desgId = `DESG-${String(desgCounter).padStart(3, '0')}`;
            desgStmt.run([desgId, desg.department_id, desg.title]);
            console.log('[Server] Created designation:', desg.title, 'for department', desg.department_id);
            desgCounter++;
          } catch (err) {
            console.warn('[Server] Failed to create designation', desg.title, ':', err.message);
          }
        }
        desgStmt.free();
        console.log('[Server] Default designations seeded');
      } else {
        console.warn('[Server] Cannot seed designations: No departments found');
      }
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
      const { name, email, username, password, department_id, designation_id, mobile, address } = req.body;

      // Validation
      if (!name || !email || !username || !password || !department_id || !designation_id || !mobile || !address) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Check if email already exists
      const existingEmail = executeQuery('SELECT * FROM users WHERE email = ?', [email]);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Check if mobile/phone already exists
      const existingMobile = executeQuery('SELECT * FROM users WHERE phone = ?', [mobile]);
      if (existingMobile) {
        return res.status(400).json({ error: 'Mobile number already registered' });
      }

      // Check if username already exists
      const existingUsername = executeQuery('SELECT * FROM users WHERE username = ?', [username]);
      if (existingUsername) {
        return res.status(400).json({ error: 'Username already taken' });
      }

      // Validate department exists
      const department = executeQuery('SELECT * FROM departments WHERE id = ?', [department_id]);
      if (!department) {
        return res.status(400).json({ error: 'Invalid department selected' });
      }

      // Validate designation exists and belongs to department
      const designation = executeQuery('SELECT * FROM designations WHERE id = ? AND department_id = ?', [designation_id, department_id]);
      if (!designation) {
        return res.status(400).json({ error: 'Invalid designation selected for this department' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = `USER-${Date.now()}`;
      const createdAt = new Date().toISOString();

      // Insert user with pending status
      const stmt = db.prepare('INSERT INTO users (id, name, email, username, password, role, status, department_id, designation_id, phone, address, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      stmt.run([id, name, email, username, hashedPassword, 'user', 'pending', department_id, designation_id, mobile, address, createdAt, createdAt]);
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
      const results = executeQueryAll(`SELECT u.id, u.name, u.email, u.username, u.role, u.status, u.phone, u.address, 
                                              u.department_id, u.designation_id, u.createdAt,
                                              d.name as department_name, des.title as designation_title
                                       FROM users u
                                       LEFT JOIN departments d ON u.department_id = d.id
                                       LEFT JOIN designations des ON u.designation_id = des.id
                                       WHERE u.status = ? 
                                       ORDER BY u.createdAt DESC`, ['pending']);
      res.json(results || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get all users with optional filters
  app.get('/api/admin/users', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const { department_id, designation_id, status } = req.query;
      let sql = `SELECT u.id, u.name, u.email, u.username, u.role, u.status, u.phone, u.address, 
                        u.department_id, u.designation_id, u.createdAt, u.updatedAt,
                        d.name as department_name, des.title as designation_title
                 FROM users u
                 LEFT JOIN departments d ON u.department_id = d.id
                 LEFT JOIN designations des ON u.designation_id = des.id`;
      let params = [];
      let conditions = [];

      if (department_id) {
        conditions.push('u.department_id = ?');
        params.push(department_id);
      }
      if (designation_id) {
        conditions.push('u.designation_id = ?');
        params.push(designation_id);
      }
      if (status) {
        conditions.push('u.status = ?');
        params.push(status);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY u.createdAt DESC';
      const results = executeQueryAll(sql, params);
      res.json(results || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get single user by ID
  app.get('/api/admin/users/:id', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const { id } = req.params;
      const user = executeQuery(`SELECT u.*, d.name as department_name, des.title as designation_title
                                  FROM users u
                                  LEFT JOIN departments d ON u.department_id = d.id
                                  LEFT JOIN designations des ON u.designation_id = des.id
                                  WHERE u.id = ?`, [id]);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Remove password from response
      delete user.password;
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update user
  app.put('/api/admin/users/:id', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, username, department_id, designation_id, mobile, address, status, role } = req.body;

      // Check if user exists
      const existingUser = executeQuery('SELECT * FROM users WHERE id = ?', [id]);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Validate email uniqueness (if changed)
      if (email && email !== existingUser.email) {
        const emailExists = executeQuery('SELECT * FROM users WHERE email = ? AND id != ?', [email, id]);
        if (emailExists) {
          return res.status(400).json({ error: 'Email already registered' });
        }
      }

      // Validate mobile uniqueness (if changed)
      if (mobile && mobile !== existingUser.phone) {
        const mobileExists = executeQuery('SELECT * FROM users WHERE phone = ? AND id != ?', [mobile, id]);
        if (mobileExists) {
          return res.status(400).json({ error: 'Mobile number already registered' });
        }
      }

      // Validate username uniqueness (if changed)
      if (username && username !== existingUser.username) {
        const usernameExists = executeQuery('SELECT * FROM users WHERE username = ? AND id != ?', [username, id]);
        if (usernameExists) {
          return res.status(400).json({ error: 'Username already taken' });
        }
      }

      // Validate department if provided
      if (department_id) {
        const department = executeQuery('SELECT * FROM departments WHERE id = ?', [department_id]);
        if (!department) {
          return res.status(400).json({ error: 'Invalid department' });
        }
      }

      // Validate designation if provided
      if (designation_id) {
        const designation = executeQuery('SELECT * FROM designations WHERE id = ?', [designation_id]);
        if (!designation) {
          return res.status(400).json({ error: 'Invalid designation' });
        }
        // If department_id is also provided, validate designation belongs to department
        if (department_id && designation.department_id !== department_id) {
          return res.status(400).json({ error: 'Designation does not belong to selected department' });
        }
      }

      // Build update query
      const updatedAt = new Date().toISOString();
      const updates = [];
      const values = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }
      if (email !== undefined) {
        updates.push('email = ?');
        values.push(email);
      }
      if (username !== undefined) {
        updates.push('username = ?');
        values.push(username);
      }
      if (department_id !== undefined) {
        updates.push('department_id = ?');
        values.push(department_id);
      }
      if (designation_id !== undefined) {
        updates.push('designation_id = ?');
        values.push(designation_id);
      }
      if (mobile !== undefined) {
        updates.push('phone = ?');
        values.push(mobile);
      }
      if (address !== undefined) {
        updates.push('address = ?');
        values.push(address);
      }
      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }
      if (role !== undefined) {
        updates.push('role = ?');
        values.push(role);
      }

      updates.push('updatedAt = ?');
      values.push(updatedAt);
      values.push(id);

      const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
      const stmt = db.prepare(sql);
      stmt.run(values);
      stmt.free();
      saveDatabase();

      // Get updated user
      const updatedUser = executeQuery(`SELECT u.*, d.name as department_name, des.title as designation_title
                                         FROM users u
                                         LEFT JOIN departments d ON u.department_id = d.id
                                         LEFT JOIN designations des ON u.designation_id = des.id
                                         WHERE u.id = ?`, [id]);
      delete updatedUser.password;
      
      res.json({ success: true, user: updatedUser });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete user
  app.delete('/api/admin/users/:id', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const { id } = req.params;

      const existing = executeQuery('SELECT * FROM users WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent deleting admin users
      if (existing.role === 'admin') {
        return res.status(400).json({ error: 'Cannot delete admin users' });
      }

      const stmt = db.prepare('DELETE FROM users WHERE id = ?');
      stmt.run([id]);
      stmt.free();
      saveDatabase();

      res.json({ success: true, id });
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

  // Public endpoints for signup form
  app.get('/api/departments', (req, res) => {
    try {
      console.log('[Server] GET /api/departments - Fetching all departments');
      const results = executeQueryAll('SELECT * FROM departments ORDER BY name');
      console.log('[Server] Found', results.length, 'departments');
      
      if (results.length === 0) {
        console.warn('[Server] No departments found in database');
      }
      
      res.json(results || []);
    } catch (err) {
      console.error('[Server] Error fetching departments:', err);
      res.status(500).json({ 
        error: 'Failed to fetch departments',
        message: err.message 
      });
    }
  });

  app.get('/api/designations', (req, res) => {
    try {
      const departmentId = req.query.department_id;
      console.log('[Server] GET /api/designations - department_id:', departmentId || 'all');
      
      let sql = 'SELECT d.*, dept.name as department_name FROM designations d LEFT JOIN departments dept ON d.department_id = dept.id';
      let params = [];
      
      if (departmentId) {
        sql += ' WHERE d.department_id = ?';
        params.push(departmentId);
        console.log('[Server] Filtering designations by department_id:', departmentId);
      }
      
      sql += ' ORDER BY dept.name, d.title';
      const results = executeQueryAll(sql, params);
      console.log('[Server] Found', results.length, 'designations');
      
      if (results.length === 0) {
        if (departmentId) {
          console.warn('[Server] No designations found for department_id:', departmentId);
        } else {
          console.warn('[Server] No designations found in database');
        }
      }
      
      res.json(results || []);
    } catch (err) {
      console.error('[Server] Error fetching designations:', err);
      res.status(500).json({ 
        error: 'Failed to fetch designations',
        message: err.message 
      });
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

  // User Roles CRUD
  app.get('/api/admin/user-roles', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const results = executeQueryAll('SELECT * FROM user_roles ORDER BY name');
      res.json(results || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/user-roles', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const { name, description, permissions } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Role name is required' });
      }

      // Check if role already exists
      const existing = executeQuery('SELECT * FROM user_roles WHERE name = ?', [name.trim()]);
      if (existing) {
        return res.status(400).json({ error: 'Role name already exists' });
      }

      const id = `ROLE-${Date.now()}`;
      const createdAt = new Date().toISOString();
      const permissionsJson = JSON.stringify(permissions || []);
      const stmt = db.prepare('INSERT INTO user_roles (id, name, description, permissions, createdAt) VALUES (?, ?, ?, ?, ?)');
      stmt.run([id, name.trim(), description || '', permissionsJson, createdAt]);
      stmt.free();
      saveDatabase();

      const created = executeQuery('SELECT * FROM user_roles WHERE id = ?', [id]);
      res.json({ success: true, role: created });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/user-roles/:id', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, permissions } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Role name is required' });
      }

      // Check if another role with same name exists
      const existing = executeQuery('SELECT * FROM user_roles WHERE name = ? AND id != ?', [name.trim(), id]);
      if (existing) {
        return res.status(400).json({ error: 'Role name already exists' });
      }

      const permissionsJson = JSON.stringify(permissions || []);
      const stmt = db.prepare('UPDATE user_roles SET name = ?, description = ?, permissions = ? WHERE id = ?');
      stmt.run([name.trim(), description || '', permissionsJson, id]);
      stmt.free();
      saveDatabase();

      const updated = executeQuery('SELECT * FROM user_roles WHERE id = ?', [id]);
      if (!updated) {
        return res.status(404).json({ error: 'Role not found' });
      }

      res.json({ success: true, role: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/user-roles/:id', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const { id } = req.params;

      const existing = executeQuery('SELECT * FROM user_roles WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ error: 'Role not found' });
      }

      const stmt = db.prepare('DELETE FROM user_roles WHERE id = ?');
      stmt.run([id]);
      stmt.free();
      saveDatabase();

      res.json({ success: true, id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // User Role Assignments
  app.get('/api/admin/user-role-assignments', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const userId = req.query.user_id;
      let sql = `SELECT ura.*, ur.name as role_name, ur.permissions, u.name as user_name, u.email 
                 FROM user_role_assignments ura 
                 LEFT JOIN user_roles ur ON ura.role_id = ur.id 
                 LEFT JOIN users u ON ura.user_id = u.id`;
      let params = [];
      
      if (userId) {
        sql += ' WHERE ura.user_id = ?';
        params.push(userId);
      }
      
      sql += ' ORDER BY ura.assignedAt DESC';
      const results = executeQueryAll(sql, params);
      
      // Parse permissions JSON
      const parsed = (results || []).map(item => ({
        ...item,
        permissions: item.permissions ? JSON.parse(item.permissions) : []
      }));
      
      res.json(parsed);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/user-role-assignments', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const { user_id, role_id } = req.body;
      if (!user_id || !role_id) {
        return res.status(400).json({ error: 'User ID and Role ID are required' });
      }

      // Check if user exists
      const user = executeQuery('SELECT * FROM users WHERE id = ?', [user_id]);
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }

      // Check if role exists
      const role = executeQuery('SELECT * FROM user_roles WHERE id = ?', [role_id]);
      if (!role) {
        return res.status(400).json({ error: 'Role not found' });
      }

      // Check if assignment already exists
      const existing = executeQuery('SELECT * FROM user_role_assignments WHERE user_id = ? AND role_id = ?', [user_id, role_id]);
      if (existing) {
        return res.status(400).json({ error: 'Role already assigned to this user' });
      }

      const id = `URA-${Date.now()}`;
      const assignedAt = new Date().toISOString();
      const stmt = db.prepare('INSERT INTO user_role_assignments (id, user_id, role_id, assignedAt) VALUES (?, ?, ?, ?)');
      stmt.run([id, user_id, role_id, assignedAt]);
      stmt.free();
      saveDatabase();

      // Update user permissions in users table (for quick access)
      const rolePermissions = JSON.parse(role.permissions || '[]');
      const userPermissions = JSON.stringify(rolePermissions);
      const updateStmt = db.prepare('UPDATE users SET permissions = ? WHERE id = ?');
      updateStmt.run([userPermissions, user_id]);
      updateStmt.free();
      saveDatabase();

      const created = executeQuery(`SELECT ura.*, ur.name as role_name, u.name as user_name 
                                    FROM user_role_assignments ura 
                                    LEFT JOIN user_roles ur ON ura.role_id = ur.id 
                                    LEFT JOIN users u ON ura.user_id = u.id 
                                    WHERE ura.id = ?`, [id]);
      res.json({ success: true, assignment: created });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/user-role-assignments/:id', authenticateToken, requireRole('admin'), (req, res) => {
    try {
      const { id } = req.params;

      const existing = executeQuery('SELECT * FROM user_role_assignments WHERE id = ?', [id]);
      if (!existing) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      const stmt = db.prepare('DELETE FROM user_role_assignments WHERE id = ?');
      stmt.run([id]);
      stmt.free();
      saveDatabase();

      // Clear user permissions if no roles assigned
      const remainingAssignments = executeQueryAll('SELECT * FROM user_role_assignments WHERE user_id = ?', [existing.user_id]);
      if (remainingAssignments.length === 0) {
        const updateStmt = db.prepare('UPDATE users SET permissions = NULL WHERE id = ?');
        updateStmt.run([existing.user_id]);
        updateStmt.free();
        saveDatabase();
      }

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
