# HomeEase Backend API

A clean, beginner-friendly RESTful backend API for the **HomeEase Home Services Booking Platform**, built with Node.js, Express.js, MongoDB, and Mongoose.

---

## 🛠️ Technology Stack
- **Node.js** (Runtime environment)
- **Express.js** (Web application framework)
- **MongoDB** & **Mongoose** (Database & ODM)
- **bcryptjs** (Secure password hashing)
- **jsonwebtoken (JWT)** (Role-based authentication)
- **dotenv** (Environment variable configuration)
- **cors** (Cross-Origin Resource Sharing)

---

## 📁 Directory Structure
```
backend/
├── config/
│   └── db.js              # MongoDB Mongoose connection handler
├── middleware/
│   └── auth.js            # JWT verification & role authorization middleware
├── models/
│   ├── User.js            # Customer and Provider user schema (hashed passwords, role validation)
│   ├── Provider.js        # Provider details (services, location, rate, availability)
│   └── Booking.js         # Booking records (status workflow, atomic provider assignment)
├── routes/
│   ├── auth.js            # Register, Login, Get Current User
│   ├── providers.js       # Provider search (category & location) & profile management
│   └── bookings.js        # Booking lifecycle (create, list, atomic accept, status, cancel)
├── .env                   # Local environment variables
├── .env.example           # Example environment variables template
├── package.json           # Dependencies and scripts
├── server.js              # Express app entry point & route registration
└── test_suite.js          # Automated end-to-end API test suite (45 checks)
```

---

## 🚀 Quick Start Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` (already created for local development):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/homeease
JWT_SECRET=homeease_super_secret_dev_jwt_key_2026
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://127.0.0.1:3000,http://localhost:3000,http://127.0.0.1:5500,http://localhost:5500
```

### 3. Ensure MongoDB is Running
- Local MongoDB runs as a Windows service on port `27017`.
- Alternatively, you can use a free cloud database cluster from [MongoDB Atlas](https://www.mongodb.com/atlas).

### 4. Start the Backend Server
```bash
# Production / standard mode
npm start

# Or development mode with auto-reload
npm run dev
```
The server will start on `http://127.0.0.1:5000`.

### 5. Run the Automated Test Suite
```bash
npm test
```

---

## 📡 API Endpoints Overview

### 1. Health & Server Info
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Check API and MongoDB connection status | Public |
| `GET` | `/` | API welcome message and route sitemap | Public |

### 2. Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new customer or provider (Admin role disallowed) | Public |
| `POST` | `/api/auth/login` | Login and receive JWT access token | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Bearer Token |

### 3. Providers (`/api/providers`)
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/providers` | Search providers with filters (`category`, `city`, `pincode`) | Public |
| `GET` | `/api/providers/:id` | Get public profile for a single provider | Public |
| `GET` | `/api/providers/profile/me` | View logged-in provider's own profile | Provider Only |
| `PUT` | `/api/providers/profile` | Update services, city, pincode, rate, bio, availability | Provider Only |

### 4. Bookings (`/api/bookings`)
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/bookings` | Create new service request with generated booking ref | Customer Only |
| `GET` | `/api/bookings/my` | List current user's bookings (Customer or Provider) | Bearer Token |
| `GET` | `/api/bookings/available` | List available unassigned pending requests matching provider | Provider Only |
| `PUT` | `/api/bookings/:id/accept` | Atomically accept pending booking (prevents double acceptance) | Provider Only |
| `PUT` | `/api/bookings/:id/status` | Update booking status (`in_progress` -> `completed`) | Assigned Provider |
| `PUT` | `/api/bookings/:id/cancel` | Cancel eligible pending booking | Customer Owner |
| `GET` | `/api/bookings/:id` | View detailed booking information | Customer / Assigned Provider |

---

## 🔒 Security Features
1. **Password Safety:** Passwords are automatically hashed with 10 salt rounds of `bcryptjs` and stripped from JSON responses (`select: false` & model serializer).
2. **Role Isolation:** Middleware enforces role checks (`authorize('customer')`, `authorize('provider')`).
3. **No Admin Self-Registration:** Requests attempting to register with `role: 'admin'` are rejected with HTTP 400.
4. **Atomic Acceptance:** MongoDB's atomic `findOneAndUpdate` ensures two providers can never accept the same booking simultaneously (returns HTTP 409 Conflict).
