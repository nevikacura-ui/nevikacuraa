# Nevika Cura - Changelog

## March 28, 2026

### Health Calendar API Fix
- Fixed `/api/health-calendar/events` — was using `request.app.state.db` (doesn't exist), changed to `from database import get_db`
- API now returns proper JSON with events array

### Mango.js Refactoring (3,202 → 512 lines)
- Extracted 7 components to `/pages/mango/` using React Context pattern
- MangoContext.jsx (state sharing), MangoBrowseView, MangoTestSelection, MangoOTPStep, MangoBookingStep, MangoCheckoutDedicated, MangoCheckoutInlineStep, MangoModals
- 84% code reduction while maintaining full functionality

### Cashfree Checkout Optimizations
- Payment retry modal — Users can retry failed payments or switch payment method
- Delivery time estimates — Dynamic estimates based on order type and time of day
- Best coupon auto-suggest — New `/api/coupons/available` endpoint returns ranked coupons
- Coupon auto-apply UI in checkout review step

### Inventory Consolidation
- New `/api/inventory/batch-expiry` — Track medicine batches and expiry dates
- New `/api/inventory/bulk-price-update` — Bulk update MRP/sale prices
- New `/api/inventory/stock-summary` — Admin dashboard with in-stock/low-stock/out-of-stock counts
- InventoryDashboard component added to AdminPanel.js with Inventory tab

### SmartReorderWidget Integration
- Wired SmartReorderWidget into Pharmacy.js (was imported but not rendered)
- Shows past orders for quick reorder

### Photo Prescription Scanner Upgrade
- Enhanced Scan Rx Wheel animation during OCR processing
- Multi-ring spinning animation with scanning dots and step progress indicators

### WhatsApp Templates
- Added Mango Health Labs templates: booking confirmed, sample collected, report ready

### Bug Fixes
- Fixed missing React import in App.js (caused React is not defined error)
- Fixed PackageBuilder onAddToCart callback (was using setSelectedTests as setState)
