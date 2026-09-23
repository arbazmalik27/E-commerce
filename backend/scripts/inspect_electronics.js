const mongoose = require('mongoose')
require('dotenv').config()

async function inspectDb() {
  await mongoose.connect(process.env.MONGODB_URI)
  const db = mongoose.connection.db

  const products = await db.collection('products').find({}).toArray()
  const electronicsProducts = products.filter((p) => p.category === 'electronics')
  const fashionProducts = products.filter((p) => p.category === 'fashion')
  const otherProducts = products.filter((p) => p.category !== 'fashion' && p.category !== 'electronics')

  console.log('=== PRODUCT COUNTS ===')
  console.log('Total Products:', products.length)
  console.log('Fashion Products:', fashionProducts.length)
  console.log('Electronics Products:', electronicsProducts.length)
  console.log('Other/Uncategorized Products:', otherProducts.length)

  console.log('\n=== ELECTRONICS PRODUCTS ===')
  electronicsProducts.forEach((p) => {
    console.log({
      id: p._id.toString(),
      name: p.name,
      category: p.category,
      department: p.department,
      subcategory: p.subcategory,
    })
  })

  const electronicsIds = electronicsProducts.map((p) => p._id)
  const electronicsIdStrings = electronicsProducts.map((p) => p._id.toString())

  // Check Carts
  const cartsWithElectronics = await db
    .collection('carts')
    .find({
      $or: [
        { 'items.productId': { $in: electronicsIds } },
        { 'items.productId': { $in: electronicsIdStrings } },
        { 'items.product': { $in: electronicsIds } },
      ],
    })
    .toArray()
  console.log('\nCarts referencing electronics products:', cartsWithElectronics.length)
  cartsWithElectronics.forEach((c) => {
    console.log('Cart ID:', c._id.toString(), 'User:', c.user?.toString() || c.userId?.toString(), 'Items:', JSON.stringify(c.items))
  })

  // Check Orders
  const ordersWithElectronics = await db
    .collection('orders')
    .find({
      $or: [
        { 'items.productId': { $in: electronicsIds } },
        { 'items.productId': { $in: electronicsIdStrings } },
        { 'items.product': { $in: electronicsIds } },
      ],
    })
    .toArray()
  console.log('Orders referencing electronics products:', ordersWithElectronics.length)
  ordersWithElectronics.forEach((o) => {
    console.log(
      'Order referencing electronics:',
      o._id.toString(),
      'items:',
      o.items.map((i) => ({ productId: i.productId, name: i.name }))
    )
  })

  // Check Payments
  const paymentsWithElectronics = await db
    .collection('payments')
    .find({
      orderId: { $in: ordersWithElectronics.map((o) => o._id) },
    })
    .toArray()
  console.log('Payments referencing those orders:', paymentsWithElectronics.length)

  await mongoose.disconnect()
}

inspectDb().catch((err) => {
  console.error(err)
  process.exit(1)
})
