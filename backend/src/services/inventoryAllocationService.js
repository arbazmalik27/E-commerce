const Product = require('../models/Product')

/**
 * Deterministically constructs operation IDs for order-item inventory mutations.
 */
function generateOpIds(orderId, itemId, productId) {
  const oId = orderId?.toString() || ''
  const iId = itemId?.toString() || ''
  const pId = productId?.toString() || ''
  return {
    decOpId: `dec_${oId}_${iId}_${pId}`,
    resOpId: `res_${oId}_${iId}_${pId}`,
  }
}

/**
 * Atomically compensates (restores) stock for order items that were decremented.
 * - Guaranteed idempotent: checking resOpId prevents double restoration on retries.
 * - Checks that matching decOpId was actually applied and resOpId is absent before restoring.
 */
async function compensateOrderInventory(order, itemsToRestore) {
  if (!Array.isArray(itemsToRestore) || itemsToRestore.length === 0) {
    return { success: true, restoredCount: 0 }
  }

  for (const item of itemsToRestore) {
    const { decOpId, resOpId } = generateOpIds(order._id, item._id, item.product)

    const product = await Product.findById(item.product)
    if (!product) continue

    const hasDec = product.appliedOps?.some((op) => op.opId === decOpId)
    const hasRes = product.appliedOps?.some((op) => op.opId === resOpId)

    // If matching compensation was already applied, or item was never decremented, skip
    if (!hasDec || hasRes) {
      if (hasRes) {
        item.allocationStatus = 'restored'
      }
      continue
    }

    // Atomic conditional restoration with deduplication guard
    await Product.findOneAndUpdate(
      {
        _id: item.product,
        'appliedOps.opId': { $ne: resOpId },
      },
      {
        $inc: { stock: item.quantity },
        $push: {
          appliedOps: {
            opId: resOpId,
            qty: item.quantity,
            type: 'restore',
            appliedAt: new Date(),
          },
        },
      },
      { returnDocument: 'after' }
    )

    item.allocationStatus = 'restored'
  }

  return { success: true, restoredCount: itemsToRestore.length }
}

/**
 * Atomically allocates inventory for an order with deterministic operation tracking.
 * - Enforces sufficient stock condition atomically on standalone MongoDB.
 * - Deduplicates retries using Product.appliedOps.
 * - If matching compensation (resOpId) already exists, never treats item as actively allocated.
 * - Compensates partial deductions if a later product in a multi-item order fails.
 */
async function allocateOrderInventory(order) {
  const allocatedItems = []
  let failedItem = null

  for (const item of order.items) {
    const { decOpId, resOpId } = generateOpIds(order._id, item._id, item.product)

    // Inspect existing appliedOps status for this item
    const product = await Product.findById(item.product)
    if (!product) {
      item.allocationStatus = 'unallocated'
      failedItem = item
      break
    }

    const hasDec = product.appliedOps?.some((op) => op.opId === decOpId)
    const hasRes = product.appliedOps?.some((op) => op.opId === resOpId)

    // 1. If matching compensation was already applied, this item is NOT actively allocated
    if (hasRes) {
      item.allocationStatus = 'restored'
      failedItem = item
      break
    }

    // 2. If decrement was applied and no compensation exists, it is actively allocated
    if (hasDec) {
      item.allocationStatus = 'allocated'
      allocatedItems.push(item)
      continue
    }

    // 3. Neither decrement nor compensation applied: attempt atomic conditional decrement
    const updated = await Product.findOneAndUpdate(
      {
        _id: item.product,
        stock: { $gte: item.quantity },
        'appliedOps.opId': { $nin: [decOpId, resOpId] },
      },
      {
        $inc: { stock: -item.quantity },
        $push: {
          appliedOps: {
            opId: decOpId,
            qty: item.quantity,
            type: 'decrement',
            appliedAt: new Date(),
          },
        },
      },
      { returnDocument: 'after' }
    )

    if (updated) {
      item.allocationStatus = 'allocated'
      allocatedItems.push(item)
    } else {
      // 4. Ambiguous failure check: Did a concurrent retry apply it in the interim?
      const raceProduct = await Product.findById(item.product)
      const raceHasDec = raceProduct?.appliedOps?.some((op) => op.opId === decOpId)
      const raceHasRes = raceProduct?.appliedOps?.some((op) => op.opId === resOpId)

      if (raceHasDec && !raceHasRes) {
        item.allocationStatus = 'allocated'
        allocatedItems.push(item)
      } else {
        item.allocationStatus = raceHasRes ? 'restored' : 'unallocated'
        failedItem = item
        break
      }
    }
  }

  // Handle multi-item failure with automatic compensation rollback across all decremented items
  if (failedItem) {
    await compensateOrderInventory(order, order.items)
    order.inventoryStatus = 'failed_out_of_stock'
    await order.save()

    return {
      success: false,
      failedItem: failedItem.name,
      error: 'INSUFFICIENT_STOCK',
    }
  }

  // All items successfully allocated
  order.inventoryStatus = 'allocated'
  await order.save()

  return {
    success: true,
    allocatedCount: allocatedItems.length,
  }
}

module.exports = {
  generateOpIds,
  allocateOrderInventory,
  compensateOrderInventory,
}
