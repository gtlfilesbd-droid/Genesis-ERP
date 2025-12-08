# Genesis ERP - Fully Functional Web System

A complete, modern ERP system built with vanilla HTML, CSS, and JavaScript. No frameworks, no build tools, no external dependencies.

## 🚀 Quick Start

1. **Start the local server:**
   ```bash
   cd project
   python -m http.server 8000
   ```

2. **Open in browser:**
   ```
   http://localhost:8000
   ```

## ✨ Features Implemented

### 1. **State Management**
- All data (offers, BOQs, requests) stored in `localStorage`
- CRUD operations fully functional
- Data persists across page reloads
- State management functions in `js/data.js`

### 2. **Form Functionality**
- ✅ **Offer Creation Form** - Auto-calculates price, commission, and totals
- ✅ **BOQ Creation Form** - Dynamic line items with add/remove
- ✅ **Request Creation Form** - Credit/Debit/Requisition workflow
- ✅ Form validation with required fields
- ✅ Success/error notifications via toast system

### 3. **Interactive UI**
- ✅ All buttons wired and functional
- ✅ Navigation between pages working
- ✅ Modal dialogs for approvals/rejections
- ✅ Dynamic table rendering with clickable rows
- ✅ Filter functionality (ready for enhancement)
- ✅ Role-based UI visibility

### 4. **Notifications System**
- Toast notifications for:
  - Success messages (green)
  - Error messages (red)
  - Warning messages (orange)
  - Info messages (blue)
- Auto-dismiss after 3 seconds
- Manual close button

### 5. **Charts & Reports**
- Line charts for profit trends
- Bar charts for monthly sales
- Pie charts for department share
- All charts render dynamically using Canvas API

### 6. **Approval Workflows**
- BOQ approval/rejection with comments
- Request approval/rejection
- Approval timeline visualization
- Activity logs

### 7. **Responsive Design**
- Mobile-friendly sidebar (toggle with ☰ button)
- Responsive grid layouts
- Touch-friendly buttons and inputs

## 📁 Project Structure

```
project/
├── index.html          # Main entry point
├── css/
│   ├── style.css      # Utility classes & base styles
│   ├── layout.css     # Layout components
│   └── components.css # Component styles
├── js/
│   ├── app.js         # Application bootstrap
│   ├── router.js      # Hash-based routing
│   ├── ui.js          # UI hydration & interactivity
│   ├── data.js        # State management & CRUD
│   ├── charts.js      # Chart rendering
│   ├── auth.js        # Role-based access
│   └── notifications.js # Toast system
├── pages/              # All page templates
│   ├── dashboard.html
│   ├── offers-list.html
│   ├── offer-create.html
│   ├── offer-preview.html
│   ├── boq-list.html
│   ├── boq-create.html
│   ├── boq-details.html
│   ├── requests-list.html
│   ├── request-create.html
│   ├── request-details.html
│   ├── products.html
│   └── reports.html
└── components/         # Reusable components
    ├── sidebar.html
    ├── navbar.html
    ├── modal.html
    ├── table.html
    └── approval-timeline.html
```

## 🎯 How to Use

### Creating an Offer
1. Navigate to "Offer List" → Click "New Offer"
2. Fill in customer, department, select product
3. Quantity auto-calculates price and commission
4. Click "Submit for Approval"
5. Success notification appears, redirects to list

### Creating a BOQ
1. Navigate to "BOQs" → Click "Create BOQ"
2. Fill project details
3. Add line items dynamically
4. Line totals auto-calculate
5. Submit for approval

### Creating a Request
1. Navigate to "Requests" → Click "New Request"
2. Select type (Credit/Debit/Requisition)
3. Enter amount, department, date
4. Add notes and submit

### Approving/Rejecting
- Click "Approve" button → Status updates immediately
- Click "Reject" → Modal opens for comment
- Enter rejection reason and submit

## 🔧 Technical Details

### State Management
- Uses `localStorage` for persistence
- Functions: `getOffers()`, `addOffer()`, `updateOffer()`, etc.
- Data structure in `js/data.js`

### Routing
- Hash-based routing (`#dashboard`, `#offers-list`, etc.)
- Automatic page loading from `pages/` directory
- Route change events trigger UI hydration

### Form Handling
- Forms use `data-form` attribute
- Validation on submit
- Auto-redirect after success
- Error handling with user feedback

### Button Actions
- Buttons use `data-action` attributes
- Actions: `new-offer`, `new-boq`, `approve`, `reject`, `export-pdf`, etc.
- All wired in `hydrateButtonActions()`

## 🎨 Customization

### Adding New Pages
1. Create HTML file in `pages/`
2. Add route to `js/router.js`
3. Add navigation link in `components/sidebar.html`

### Adding New Actions
1. Add button with `data-action="your-action"`
2. Add handler in `hydrateButtonActions()` in `ui.js`

### Styling
- Modify CSS variables in `css/style.css`
- Utility classes follow Tailwind-like naming
- Component styles in `css/components.css`

## 🐛 Troubleshooting

**Navigation not working?**
- Ensure you're using a local server (not `file://`)
- Check browser console for errors
- Verify all files are in correct directories

**Forms not submitting?**
- Check browser console for validation errors
- Ensure all required fields are filled
- Verify `data-form` attribute is set

**Charts not showing?**
- Check that canvas elements have correct IDs
- Verify `charts.js` is loaded
- Check browser console for errors

## 📝 Notes

- All data is stored in browser `localStorage`
- No backend required - fully client-side
- Role switching updates UI visibility immediately
- Toast notifications appear top-right
- All forms have validation and error handling

## 🚀 Next Steps (Optional Enhancements)

- Add table sorting and advanced filtering
- Implement pagination for large datasets
- Add export to CSV/PDF functionality
- Enhance charts with more data
- Add search functionality
- Implement user authentication (currently mock)
- Add data import/export features

---

**Built with ❤️ using vanilla JavaScript**

