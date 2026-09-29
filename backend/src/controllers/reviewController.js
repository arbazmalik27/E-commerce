const mongoose = require('mongoose')
const Review = require('../models/Review')
const Product = require('../models/Product')
const Order = require('../models/Order')
const {
  isValidObjectId,
  validateCreateReviewInput,
  validateUpdateReviewInput,
  validateReviewStatusInput,
} = require('../validators/reviewValidator')

/**
 * Recalculate averageRating and numReviews on the Product document
 * based strictly on APPROVED reviews in the database.
 */
const calculateProductRating = async (productId) => {
  try {
    const objId = typeof productId === 'string' ? new mongoose.Types.ObjectId(productId) : productId

    const stats = await Review.aggregate([
      { $match: { product: objId, status: 'approved' } },
      {
        $group: {
          _id: '$product',
          avgRating: { $avg: '$rating' },
          numReviews: { $sum: 1 },
        },
      },
    ])

    if (stats.length > 0) {
      const avg = Number(stats[0].avgRating.toFixed(1))
      const count = stats[0].numReviews
      await Product.findByIdAndUpdate(objId, {
        averageRating: avg,
        numReviews: count,
      })
      return { averageRating: avg, numReviews: count }
    } else {
      await Product.findByIdAndUpdate(objId, {
        averageRating: 0,
        numReviews: 0,
      })
      return { averageRating: 0, numReviews: 0 }
    }
  } catch (err) {
    console.error('Error recalculating product rating:', err)
    return { averageRating: 0, numReviews: 0 }
  }
}

/**
 * Compute the 1-star through 5-star distribution of approved reviews
 */
const getRatingDistribution = async (productId) => {
  try {
    const objId = typeof productId === 'string' ? new mongoose.Types.ObjectId(productId) : productId

    const dist = await Review.aggregate([
      { $match: { product: objId, status: 'approved' } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
    ])

    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    dist.forEach((d) => {
      if (d._id >= 1 && d._id <= 5) {
        breakdown[d._id] = d.count
      }
    })
    return breakdown
  } catch {
    return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  }
}

/**
 * Public: Get approved reviews for a product with pagination and distribution summary
 */
const getProductReviews = async (req, res) => {
  const { productId } = req.params

  if (!isValidObjectId(productId)) {
    return res.status(400).json({ success: false, message: 'Invalid product ID' })
  }

  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 5))
    const skip = (page - 1) * limit

    const filter = { product: productId, status: 'approved' }

    const [totalReviews, reviews, distribution, productDoc] = await Promise.all([
      Review.countDocuments(filter),
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name'),
      getRatingDistribution(productId),
      Product.findById(productId).select('averageRating numReviews'),
    ])

    const totalPages = Math.ceil(totalReviews / limit) || 1

    return res.status(200).json({
      success: true,
      reviews,
      pagination: {
        page,
        limit,
        totalReviews,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      summary: {
        averageRating: productDoc?.averageRating || 0,
        totalReviews: productDoc?.numReviews || totalReviews,
        ratingDistribution: distribution,
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error fetching reviews' })
  }
}

/**
 * Authenticated: Check customer eligibility to review a product
 * Requires:
 * 1. An order with paymentStatus === 'paid' containing this product
 * 2. Order belongs to authenticated user
 * 3. User has not already reviewed this product
 */
const checkReviewEligibility = async (req, res) => {
  const { productId } = req.params

  if (!isValidObjectId(productId)) {
    return res.status(400).json({ success: false, message: 'Invalid product ID' })
  }

  try {
    const userId = req.user.id || req.user._id

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({ user: userId, product: productId })

    // Find any qualifying paid order containing this product
    const qualifyingOrder = await Order.findOne({
      user: userId,
      'items.product': productId,
      paymentStatus: 'paid',
      orderStatus: { $ne: 'cancelled' },
    }).sort({ createdAt: -1 })

    const hasPurchased = Boolean(qualifyingOrder)
    const eligible = hasPurchased && !existingReview

    return res.status(200).json({
      success: true,
      eligible,
      hasPurchased,
      hasReviewed: Boolean(existingReview),
      orderId: qualifyingOrder?._id || null,
      orderNumber: qualifyingOrder?.orderNumber || null,
      existingReview: existingReview || null,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error checking review eligibility' })
  }
}

/**
 * Authenticated Customer: Submit a new review
 * Requires real verified purchase in a paid order.
 */
const createReview = async (req, res) => {
  const { isValid, errors, sanitized } = validateCreateReviewInput(req.body)

  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  try {
    const userId = req.user.id || req.user._id
    const { productId, orderId, rating, title, comment } = sanitized

    // Verify product exists and is active
    const product = await Product.findById(productId)
    if (!product || !product.isActive) {
      return res.status(404).json({ success: false, message: 'Product not found or inactive' })
    }

    // Verify verified purchase: Order must belong to user, contain product, and be paid
    const order = await Order.findOne({
      _id: orderId,
      user: userId,
      'items.product': productId,
      paymentStatus: 'paid',
      orderStatus: { $ne: 'cancelled' },
    })

    if (!order) {
      return res.status(403).json({
        success: false,
        message: 'You can only review products from your own completed, verified purchases',
      })
    }

    // Enforce 1 review per user per product
    const existingReview = await Review.findOne({ user: userId, product: productId })
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a review for this product',
      })
    }

    // Create review with pending status for moderation
    const review = await Review.create({
      user: userId,
      product: productId,
      order: orderId,
      rating,
      title,
      comment,
      status: 'pending',
      verifiedPurchase: true,
    })

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully. It will be published after moderation approval.',
      review,
    })
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a review for this product',
      })
    }
    return res.status(500).json({ success: false, message: 'Server error submitting review' })
  }
}

/**
 * Authenticated Customer: Edit own review
 * Resets status to pending for re-moderation.
 */
const updateReview = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid review ID' })
  }

  const { isValid, errors, sanitized } = validateUpdateReviewInput(req.body)
  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  try {
    const review = await Review.findById(id)
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' })
    }

    // Check ownership
    const currentUserId = (req.user.id || req.user._id).toString()
    if (review.user.toString() !== currentUserId) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this review' })
    }

    if (sanitized.rating !== undefined) review.rating = sanitized.rating
    if (sanitized.title !== undefined) review.title = sanitized.title
    if (sanitized.comment !== undefined) review.comment = sanitized.comment

    // Edits must be re-moderated
    review.status = 'pending'
    await review.save()

    // Recalculate product rating (in case previously approved rating changed)
    await calculateProductRating(review.product)

    return res.status(200).json({
      success: true,
      message: 'Review updated successfully. It will be republished after moderation.',
      review,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error updating review' })
  }
}

/**
 * Authenticated Customer: Delete own review
 */
const deleteReview = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid review ID' })
  }

  try {
    const review = await Review.findById(id)
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' })
    }

    // Check ownership
    const currentUserId = (req.user.id || req.user._id).toString()
    if (review.user.toString() !== currentUserId) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this review' })
    }

    const productId = review.product
    await Review.findByIdAndDelete(id)

    // Recalculate product rating
    await calculateProductRating(productId)

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error deleting review' })
  }
}

/**
 * Admin: Get all reviews with status filtering and counts
 */
const getAdminReviews = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10))
    const skip = (page - 1) * limit

    const filter = {}
    if (req.query.status && ['pending', 'approved', 'rejected'].includes(req.query.status.toLowerCase())) {
      filter.status = req.query.status.toLowerCase()
    }

    const [totalReviews, reviews, pendingCount, approvedCount, rejectedCount, totalCount] =
      await Promise.all([
        Review.countDocuments(filter),
        Review.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('user', 'name email')
          .populate('product', 'name images price category department')
          .populate('order', 'orderNumber paymentStatus orderStatus'),
        Review.countDocuments({ status: 'pending' }),
        Review.countDocuments({ status: 'approved' }),
        Review.countDocuments({ status: 'rejected' }),
        Review.countDocuments({}),
      ])

    const totalPages = Math.ceil(totalReviews / limit) || 1

    return res.status(200).json({
      success: true,
      reviews,
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        total: totalCount,
      },
      pagination: {
        page,
        limit,
        totalReviews,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error fetching admin reviews' })
  }
}

/**
 * Admin: Update review moderation status ('approved', 'rejected', 'pending')
 */
const updateAdminReviewStatus = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid review ID' })
  }

  const { isValid, errors, sanitized } = validateReviewStatusInput(req.body)
  if (!isValid) {
    return res.status(400).json({ success: false, errors })
  }

  try {
    const review = await Review.findById(id)
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' })
    }

    review.status = sanitized.status
    await review.save()

    // Recalculate product rating
    await calculateProductRating(review.product)

    return res.status(200).json({
      success: true,
      message: `Review status updated to ${sanitized.status}`,
      review,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error updating review status' })
  }
}

/**
 * Admin: Delete review
 */
const deleteAdminReview = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid review ID' })
  }

  try {
    const review = await Review.findById(id)
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' })
    }

    const productId = review.product
    await Review.findByIdAndDelete(id)

    // Recalculate product rating
    await calculateProductRating(productId)

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully by admin',
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error deleting review' })
  }
}

module.exports = {
  calculateProductRating,
  getRatingDistribution,
  getProductReviews,
  checkReviewEligibility,
  createReview,
  updateReview,
  deleteReview,
  getAdminReviews,
  updateAdminReviewStatus,
  deleteAdminReview,
}
