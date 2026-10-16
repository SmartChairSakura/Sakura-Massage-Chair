# Spec: Backoffice UX Copywriting & API Response Standardization

## 1. Objective
Standardize all Backoffice Admin Dashboard UI copy and backend API response messages from mixed Indonglish / fluff into professional, scan-friendly, action-oriented SaaS English, fully synchronized across frontend and backend.

## 2. Core Rules
1. **NO FLUFF:** Direct to the point. No clichés, no redundant narrative sentences.
2. **SCAN-FRIENDLY:** Short labels, clear contrast, readable in < 2 seconds.
3. **SAAS ENGLISH:** Modern B2B fintech/IoT dashboard standard (Stripe, Vercel, Parkee CMS).
4. **ACTION-ORIENTED:** Focus on user actions and tangible outcomes.
5. **SYNCED WITH BACKEND:** Endpoint messages, errors, and validation strings match the UI language.

## 3. UI Matrix (Current vs. Standardized)
- `LocationSelector`: "Semua Lokasi" -> "All Locations"
- `AdminHeader`: "Keluar / Logout" -> "Sign Out", "REFRESH" -> "Refresh"
- `AdminSidebar`: "REPORTS & ANALYTICS" -> "ANALYTICS"
- `Sales Summary Dashboard`:
  - Subtitle: "Real-time QRIS revenue, payment processing fees, and partner payouts."
  - Range buttons: "Today", "7 Days", "This Month", "All Time"
  - Toggles: "Transaction Date", "Settlement Date", "Custom Range"
  - Metric Cards: "Net Payout (95%)", "Gross Sales", "MDR Fee (0.7%)", "Net Sales", "Platform Fee (5%)"
  - Fleet & Capacity: "Active Fleet" ("Chairs ready for service"), "Paid Sessions" ("Completed massage sessions")
  - Charts: "Daily Revenue Trend", "Daily Session Volume"
- `Location Setting`: "Locations & Revenue Sharing", "+ Add Location", "Branch Name", "Site Code", "Fleet Size", "Actions"
- `Chair List`: "Chairs & Hardware Fleet", "+ Add Chair", "Chair Code", "Hardware Model", "Unit Name", "Branch Location", "Terminal PIN", "Actions"
- `Tickets`: "Transaction History", "Export to CSV", "Slip Number", "Date & Time", "Customer", "Amount & Duration"
- `Users`: "+ Add User", "User", "Email", "Role", "Assigned Branch", "Status", "Last Login", "Actions"
- `Login`: "Sign in to Sakura Backoffice", "Manage massage chair fleet and track real-time QRIS earnings.", "Sign In", "Forgot password?"

## 4. Backend Responses Matrix
- `middleware.ts`: "Unauthorized. Please sign in to continue."
- `/api/admin/auth/login`: "Email or username and password are required.", "Invalid email or password.", "Account suspended. Please contact your system administrator."
- `/api/admin/chairs`: "Chair code and PIN are required.", "Chair not found or currently inactive.", "Chair successfully saved.", "Chair deleted successfully."
- `/api/admin/locations`: "Total revenue share must equal exactly 100%.", "Location 'X' saved successfully."
- `/api/admin/users`: "Email or username is already registered.", "User created successfully."
