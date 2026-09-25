# TrendVolt E-Commerce

TrendVolt is a luxury & everyday fashion e-commerce application built with a React + Vite frontend and Node.js + Express + MongoDB backend.

## Local Development Setup

To run the application locally, both the backend API and frontend dev server must be running:

### 1. Start Backend Server (Port 5000)
```bash
npm run dev:backend
# or: cd backend && npm run dev
```

### 2. Start Frontend Dev Server (Port 5173)
```bash
npm run dev:frontend
# or: cd frontend && npm run dev
```

## Running Automated Tests

Run the full backend test suite (Taxonomy, Pagination, and Featured Products Contract):
```bash
npm run test:backend
# or: cd backend && npm run test:all
```
