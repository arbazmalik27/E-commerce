const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')

const healthRoutes = require('./routes/healthRoutes')
const authRoutes = require('./routes/authRoutes')
const productRoutes = require('./routes/productRoutes')
const cartRoutes = require('./routes/cartRoutes')
const orderRoutes = require('./routes/orderRoutes')
const paymentRoutes = require('./routes/paymentRoutes')
const userRoutes = require('./routes/userRoutes')
const newsletterRoutes = require('./routes/newsletterRoutes')

const app = express()

// Security
app.use(helmet())

// CORS — allow requests from configured frontend origin and local development origins
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:3000',
].filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        callback(null, true)
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`))
      }
    },
    credentials: true,
  })
)

// Body parsing (support up to 50mb for image uploads)
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Cookie parsing (required for JWT HTTP-only cookie auth)
app.use(cookieParser())

// Routes
app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/users', userRoutes)
app.use('/api/newsletter', newsletterRoutes)

// Centralized error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ success: false, message: 'Invalid JSON payload' })
  }
  return res.status(err.status || 500).json({
    success: false,
    message: err.message && process.env.NODE_ENV !== 'production' ? err.message : 'Server error',
  })
})

module.exports = app
