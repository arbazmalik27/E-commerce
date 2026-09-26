# TrendVolt E-Commerce

TrendVolt is a modern full-stack fashion e-commerce platform built with React, Node.js, Express, MongoDB, and modern web technologies.

The project focuses on delivering a premium, responsive shopping experience with secure authentication, product management, cart functionality, Razorpay payments, Cloudinary image management, and automated order notifications through n8n.

## 🚀 Features

* Modern fashion-focused e-commerce UI
* Responsive design for desktop and mobile
* User registration and login
* JWT-based authentication with HTTP-only cookies
* Protected API routes
* Product browsing and product details
* Category-based fashion products
* Cart management
* Backend-controlled product pricing and stock validation
* Razorpay payment integration
* Cloudinary image management
* Automated order notifications using n8n
* Customer order confirmation emails
* Admin order notifications
* Environment-based configuration

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* Tailwind CSS
* Redux Toolkit
* React Router

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication
* HTTP-only Cookie Authentication

### Integrations

* Razorpay — Payment processing
* Cloudinary — Image storage and management
* n8n — Order notification automation

## 📁 Project Structure

```text
TrendVolt/
├── backend/
│   ├── src/
│   ├── scripts/
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── package-lock.json
│
├── README.md
├── .gitignore
└── ...
```

## 💻 Local Development Setup

Both the backend API and frontend development server must be running for full-stack functionality.

### ⚡ Quick Start (Unified - Recommended)
Run both backend (`port 5000`) and frontend (`port 5173`) concurrently with a single command from the project root:

```bash
npm run dev
```

---

### Alternative: Run Separately in Two Terminals

#### Terminal 1 — Start Backend Server (Port 5000)
```bash
npm run dev:backend
# or
cd backend && npm run dev
```

#### Terminal 2 — Start Frontend Dev Server (Port 5173)
```bash
npm run dev:frontend
# or
cd frontend && npm run dev
```

## 🧪 Running Automated Tests

Run the backend test suite:

```bash
npm run test:backend
```

Or:

```bash
cd backend
npm run test:all
```

## 🔐 Environment Variables

Create the required environment files according to the project's environment configuration.

Typical backend configuration includes:

```env
MONGODB_URI=
JWT_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
N8N_WEBHOOK_URL=
CLIENT_URL=http://localhost:5173
```

Do not commit secrets or `.env` files to GitHub.

## 📌 Project Status

TrendVolt is being developed as a full-stack fashion e-commerce project with a focus on clean architecture, secure backend validation, responsive UI, and production-oriented development practices.
