# HomeEase - On-Demand Home Services Booking Platform

HomeEase is a full-stack, college mini-project web application designed for on-demand home service bookings (electricians, plumbers, home cleaners, appliance repair specialists). 

It features a unified, fully responsive frontend (built from Google Stitch design exports) seamlessly connected to a RESTful Node.js, Express, and MongoDB backend with secure JWT authentication and role-based workflows.

---

## 🌟 Key Features

### 👤 Customer Experience
- **Explore & Filter Services:** Browse vetted trade categories (Electrical, Plumbing, Cleaning, Appliance Repair) with transparent upfront pricing.
- **Streamlined Service Booking:** Pre-fill chosen services, pick preferred calendar dates, select morning/afternoon/evening time slots, and describe issues.
- **Live Booking History:** Real-time customer dashboard showing request status (`pending`, `accepted`, `in_progress`, `completed`, `cancelled`).
- **Eligible Cancellation:** One-click cancellation for eligible pending requests.

### 🛠️ Service Provider Experience
- **Opportunity Feed (Available Leads):** Live radar feed showing nearby homeowner service requests matching the provider's registered trade and city.
- **Atomic Booking Acceptance:** Race-condition prevention powered by MongoDB atomic operations ensuring two providers can never claim the same booking.
- **Job Status Progression:** Providers mark jobs as `in_progress` upon arrival and `completed` upon job completion.
- **Real-Time KPI Metrics:** Live dashboard tracking available leads, active in-progress jobs, completed jobs, and monthly payouts.
- **Availability Toggle:** Online/offline toggle synced to the database to pause or resume incoming leads.

### 🔒 Security & Authorization
- **Role-Based Access Control (RBAC):** Strictly separates Customer and Provider privileges. Unauthorized actions return `HTTP 403 Forbidden`.
- **Admin Self-Registration Blocked:** Public registration endpoints explicitly reject attempts to create administrator accounts.
- **Password Protection:** Passwords are hashed with 10 salt rounds of `bcryptjs` and excluded from API responses.
- **JWT Authentication:** Signed access tokens are verified via Bearer authorization middleware.
- **1-Click Academic Demo Profiles:** Demo buttons perform real backend authentication with signed JWTs for streamlined academic evaluation.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | HTML5, CSS3, Tailwind CSS (CDN), Vanilla JavaScript (ES6+), Google Material Symbols, Plus Jakarta Sans |
| **Backend** | Node.js, Express.js, Mongoose, MongoDB |
| **Authentication & Security** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `cors`, `dotenv` |
| **Testing** | Native Node.js HTTP integration test suites (80+ automated assertions) |
| **Design System** | Google Stitch UI Exports (Warm Professionalism Theme) |

---

## 📁 Repository Structure

```
HomeEase/
├── index.html                           # Unified responsive 6-screen application shell
├── styles.css                           # Custom styling, animations, and typography
├── app.js                               # Frontend controller & API client (with safe URL fallback)
├── .gitignore                           # Excludes secrets, node_modules, logs, and OS caches
├── README.md                            # Main project documentation
├── test_frontend_backend_integration.js # Automated end-to-end integration test suite
│
├── backend/                             # Express.js REST API service
│   ├── config/
│   │   └── db.js                        # MongoDB Mongoose connection handler
│   ├── middleware/
│   │   └── auth.js                      # JWT authentication & role-based route protection
│   ├── models/
│   │   ├── User.js                      # Customer & Provider schemas with password hashing
│   │   ├── Provider.js                  # Provider profile (services, location, availability)
│   │   └── Booking.js                   # Booking schema with status workflow & history
│   ├── routes/
│   │   ├── auth.js                      # Register, login, and profile verification routes
│   │   ├── providers.js                 # Provider search & profile management routes
│   │   └── bookings.js                  # Booking creation, atomic accept, status, & cancel
│   ├── .env                             # Local environment variables (DO NOT COMMIT)
│   ├── .env.example                     # Environment variables template with safe placeholders
│   ├── package.json                     # Backend dependencies and test scripts
│   ├── package-lock.json                # Locked dependency tree for deterministic builds
│   ├── server.js                        # Express server entry point & CORS configuration
│   ├── test_suite.js                    # Automated backend API test suite (45 checks)
│   └── README.md                        # Backend specific API reference
│
└── stitch_homeease_services_booking_platform/ # Original Google Stitch screen exports (Reference)
    ├── homeease_homepage/               # Screen 1: Homepage export
    ├── homeease_services/               # Screen 2: Services catalog export
    ├── homeease_login_register/         # Screen 3: Auth & registration export
    ├── homeease_book_a_service/         # Screen 4: Booking flow export
    ├── homeease_customer_dashboard/     # Screen 5: Customer dashboard export
    ├── homeease_provider_dashboard/     # Screen 6: Provider portal export
    └── warm_professionalism/            # Design tokens & DESIGN.md specification
```

---

## ⚙️ Environment Variables

The backend relies on environment variables defined in `backend/.env`. A safe template is provided in `backend/.env.example`:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Port for the Express HTTP server | `5000` |
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` |
| `MONGODB_URI` | MongoDB connection string (Local or MongoDB Atlas) | `mongodb://127.0.0.1:27017/homeease` |
| `JWT_SECRET` | Strong cryptographic secret for signing JWT tokens | `your_jwt_secret_key_here` |
| `JWT_EXPIRES_IN` | Token expiration duration | `7d` |
| `CLIENT_ORIGIN` | Allowed CORS origins (comma-separated) | `http://localhost:3000,http://127.0.0.1:3000` |

> **Security Note:** Never commit `backend/.env` containing real credentials or secrets to Git.

---

## 🚀 Local Setup Instructions

### 1. Prerequisites
- **Node.js** (v18 or newer recommended, verified on v24)
- **MongoDB** (Local Community Edition or free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster)
- **Python 3** (Optional, for serving the static frontend locally)

### 2. Clone the Repository
```bash
git clone https://github.com/<your-username>/HomeEase.git
cd HomeEase
```

### 3. Setup and Start the Backend
```bash
cd backend
npm install

# Copy environment template if .env does not exist yet
cp .env.example .env

# Start the server (runs on http://127.0.0.1:5000)
npm start
# Or with auto-reload during development:
npm run dev
```

Verify backend health at: [http://127.0.0.1:5000/api/health](http://127.0.0.1:5000/api/health)

### 4. Serve the Frontend
In a separate terminal from the project root:
```bash
# Using Python
python -m http.server 3000

# Or using Node http-server / npx
npx serve -l 3000 .
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing Instructions

HomeEase includes comprehensive automated test suites:

### 1. Backend API Test Suite (45 Tests)
Tests database connections, admin registration rejection, password hashing, JWT issuance, provider search, atomic booking acceptance, and status workflows:
```bash
cd backend
npm test
```

### 2. Frontend-Backend Integration Test Suite (36 Tests)
Simulates end-to-end user journeys including customer booking creation, real-time provider acceptance, race-condition defense, and role permission enforcement:
```bash
# Ensure backend is running on port 5000, then from the project root:
node test_frontend_backend_integration.js
```

---

## 🌐 Production Deployment Guidance

### Deploying Backend (e.g. Render, Railway, Fly.io)
1. Set the root directory to `backend`.
2. Set Build Command to `npm install` and Start Command to `node server.js`.
3. Configure environment variables in the host dashboard:
   - `MONGODB_URI`: Connection string to your cloud MongoDB Atlas database.
   - `JWT_SECRET`: A secure, randomly generated string.
   - `CLIENT_ORIGIN`: Your production frontend URL (e.g. `https://your-homeease.vercel.app`).
   - `NODE_ENV`: `production`.

### Deploying Frontend (e.g. Vercel, Netlify, GitHub Pages)
Because HomeEase is built with pure HTML/CSS/JavaScript, the frontend can be deployed statically:
1. Deploy the root directory containing `index.html`, `styles.css`, and `app.js`.
2. Configure the production backend URL using any of these approaches:
   - **Option A (Global Variable):** Add an inline script or `config.js` before `app.js` in `index.html`:
     ```html
     <script>window.HOMEEASE_API_URL = "https://your-backend-api.onrender.com/api";</script>
     ```
   - **Option B (Browser Storage Override):** Set `localStorage.setItem('homeease_custom_api_url', 'https://your-backend-api.onrender.com/api')` in browser console.
   - **Option C (Unified Host):** If Express serves the frontend files as static assets, `app.js` automatically uses relative `/api` paths.

---

## 📜 License
This project was developed for academic and college demonstration purposes. All original Google Stitch design tokens and exports are preserved.
