# Genesis ERP - Server-Side SQLite Setup

## Why Previous Version Didn't Persist

The previous version used **client-side SQLite** (sql.js) stored in **IndexedDB** (browser storage). This had several issues:

1. **Browser Storage Limitations**: IndexedDB can be cleared by the browser, user settings, or privacy modes
2. **No Physical File**: Data was stored in browser's internal database, not a visible file
3. **Browser-Dependent**: Data was tied to specific browser and could be lost
4. **No Server Backup**: No way to backup or migrate data easily

## New Server-Side Solution

Now the application uses:
- **Server-side SQLite** database file (`data.db`) on your local machine
- **Node.js/Express** backend API
- **RESTful API** endpoints for all CRUD operations
- **Persistent file storage** - data.db file is saved on disk

## Installation

1. **Install Node.js** (if not already installed)
   - Download from: https://nodejs.org/
   - Version 16+ recommended

2. **Install Dependencies**
   ```bash
   cd project
   npm install
   ```

3. **Start the Server**
   ```bash
   npm start
   ```
   
   The server will start on `http://localhost:3000`

4. **Open the Application**
   - Open `index.html` in your browser
   - Or navigate to `http://localhost:3000` if serving via server

## Database File Location

The SQLite database file `data.db` will be created in the `project` directory:
```
project/
  ├── data.db          ← Your SQLite database file
  ├── server.js
  ├── package.json
  └── ...
```

## Verify Database

You can verify the database using any SQLite viewer:
- **DB Browser for SQLite**: https://sqlitebrowser.org/
- **SQLite Studio**: https://sqlitestudio.pl/
- Command line: `sqlite3 data.db`

## API Endpoints

All data operations go through these API endpoints:

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Offers
- `GET /api/offers` - Get all offers
- `POST /api/offers` - Create offer
- `PUT /api/offers/:id` - Update offer

### BOQs
- `GET /api/boqs` - Get all BOQs
- `POST /api/boqs` - Create BOQ
- `PUT /api/boqs/:id` - Update BOQ

### Requests
- `GET /api/requests` - Get all requests
- `POST /api/requests` - Create request
- `PUT /api/requests/:id` - Update request

## Data Persistence

✅ **Data persists because:**
1. Database is stored in a physical file (`data.db`) on your machine
2. Server writes directly to SQLite file on every operation
3. File persists across browser sessions, restarts, and updates
4. You can backup the `data.db` file like any other file

## Troubleshooting

**Server won't start:**
- Make sure Node.js is installed: `node --version`
- Install dependencies: `npm install`
- Check if port 3000 is already in use

**Data not showing:**
- Make sure server is running: `npm start`
- Check browser console for API errors
- Verify `data.db` file exists in project directory

**Database file not found:**
- The file is created automatically when server starts
- Check the `project` directory for `data.db`
- Make sure you have write permissions in the project directory

