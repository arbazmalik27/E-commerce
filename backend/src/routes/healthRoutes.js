const express = require('express')

const router = express.Router()

router.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok', message: 'E-commerce API is running' })
})

module.exports = router
