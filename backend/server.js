require('dotenv').config()

const app = require('./src/app')
const connectDB = require('./src/config/db')

const { validateEnv } = require('./src/config/envValidator')

const PORT = process.env.PORT || 5000

const start = async () => {
  validateEnv()
  await connectDB()
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

start()
