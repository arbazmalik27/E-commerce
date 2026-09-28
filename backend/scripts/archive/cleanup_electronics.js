const mongoose = require('mongoose')
require('dotenv').config()

async function cleanupElectronics() {
  await mongoose.connect(process.env.MONGODB_URI)
  const db = mongoose.connection.db

  const electronicsProducts = await db.collection('products').find({ category: 'electronics' }).toArray()
  console.log(`Found ${electronicsProducts.length} electronics products.`)

  const deleted = []
  const skipped = []

  for (const prod of electronicsProducts) {
    // Check if referenced in cart
    const inCart = await db.collection('carts').countDocuments({
      $or: [
        { 'items.productId': prod._id },
        { 'items.productId': prod._id.toString() },
        { 'items.product': prod._id },
        { 'items.product': prod._id.toString() },
      ],
    })

    // Check if referenced in orders
    const inOrder = await db.collection('orders').countDocuments({
      $or: [
        { 'items.productId': prod._id },
        { 'items.productId': prod._id.toString() },
        { 'items.product': prod._id },
        { 'items.product': prod._id.toString() },
      ],
    })

    if (inCart > 0 || inOrder > 0) {
      console.log(`CONFLICT: Product "${prod.name}" (${prod._id}) is referenced in ${inCart} cart(s) and ${inOrder} order(s). SKIPPING destructive deletion.`)
      // Deactivate so it never appears in storefront
      await db.collection('products').updateOne(
        { _id: prod._id },
        { $set: { isActive: false } }
      )
      skipped.push({ id: prod._id.toString(), name: prod.name, reason: `Referenced in ${inCart} cart(s)` })
    } else {
      console.log(`DELETING unreferenced demo product: "${prod.name}" (${prod._id})`)
      await db.collection('products').deleteOne({ _id: prod._id })
      deleted.push({ id: prod._id.toString(), name: prod.name })
    }
  }

  console.log('\n=== CLEANUP SUMMARY ===')
  console.log(`Total deleted: ${deleted.length}`)
  console.log(`Total skipped: ${skipped.length}`)
  console.log('Deleted products:', deleted)
  console.log('Skipped products:', skipped)

  await mongoose.disconnect()
}

cleanupElectronics().catch((err) => {
  console.error(err)
  process.exit(1)
})
