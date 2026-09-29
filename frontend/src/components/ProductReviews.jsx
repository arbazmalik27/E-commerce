import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Star, CheckCircle, MessageSquare, AlertCircle, Edit2, Trash2 } from 'lucide-react'
import { selectIsAuthenticated } from '../features/auth/authSlice'
import api from '../services/api'
import Eyebrow from './Eyebrow'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function StarRating({ rating, max = 5, size = 'sm', interactive = false, onRatingChange = null }) {
  const [hoverRating, setHoverRating] = useState(0)
  const current = interactive && hoverRating > 0 ? hoverRating : rating

  const sizeClass = size === 'lg' ? 'h-6 w-6' : size === 'md' ? 'h-5 w-5' : 'h-4 w-4'

  return (
    <div className="flex items-center gap-0.5" role={interactive ? 'radiogroup' : 'img'} aria-label={`Rating: ${rating} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1
        const isFilled = starValue <= current

        if (interactive) {
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={rating === starValue}
              aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
              className="p-1 text-[#DED7CA] hover:text-[#D97706] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] rounded cursor-pointer"
              onMouseEnter={() => setHoverRating(starValue)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => onRatingChange && onRatingChange(starValue)}
            >
              <Star
                className={`${sizeClass} ${
                  isFilled ? 'text-[#D97706] fill-[#D97706]' : 'text-[#DED7CA]'
                } transition-colors`}
              />
            </button>
          )
        }

        return (
          <Star
            key={i}
            className={`${sizeClass} ${
              isFilled ? 'text-[#D97706] fill-[#D97706]' : 'text-[#DED7CA]'
            }`}
            aria-hidden="true"
          />
        )
      })}
    </div>
  )
}

function ProductReviews({ productId, productName }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)

  // Review list & aggregates
  const [reviews, setReviews] = useState([])
  const [summary, setSummary] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    totalPages: 1,
    totalReviews: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Eligibility state
  const [eligibility, setEligibility] = useState(() => ({
    checked: !isAuthenticated,
    eligible: false,
    hasPurchased: false,
    hasReviewed: false,
    orderId: null,
    existingReview: null,
  }))

  // Review Form state
  const [showForm, setShowForm] = useState(false)
  const [formRating, setFormRating] = useState(5)
  const [formTitle, setFormTitle] = useState('')
  const [formComment, setFormComment] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [formSuccess, setFormSuccess] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Fetch approved reviews
  const fetchReviews = useCallback(
    async (pageNumber = 1) => {
      if (!productId) return
      setLoading(true)
      setError(null)
      try {
        const res = await api.get(`/reviews/product/${productId}?page=${pageNumber}&limit=5`)
        if (res.data?.success) {
          setReviews(res.data.reviews || [])
          setSummary(
            res.data.summary || {
              averageRating: 0,
              totalReviews: 0,
              ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            }
          )
          setPagination(
            res.data.pagination || {
              page: pageNumber,
              limit: 5,
              totalPages: 1,
              totalReviews: 0,
            }
          )
        }
      } catch {
        setError('Unable to load customer reviews at this time.')
      } finally {
        setLoading(false)
      }
    },
    [productId]
  )

  // Check customer review eligibility
  const checkEligibility = useCallback(async () => {
    if (!isAuthenticated || !productId) {
      setEligibility({
        checked: true,
        eligible: false,
        hasPurchased: false,
        hasReviewed: false,
        orderId: null,
        existingReview: null,
      })
      return
    }

    try {
      const res = await api.get(`/reviews/eligibility/${productId}`)
      if (res.data?.success) {
        setEligibility({
          checked: true,
          eligible: res.data.eligible,
          hasPurchased: res.data.hasPurchased,
          hasReviewed: res.data.hasReviewed,
          orderId: res.data.orderId,
          existingReview: res.data.existingReview,
        })
      }
    } catch {
      setEligibility((prev) => ({ ...prev, checked: true }))
    }
  }, [isAuthenticated, productId])

  useEffect(() => {
    let isMounted = true

    api.get(`/reviews/product/${productId}?page=1&limit=5`)
      .then((res) => {
        if (isMounted && res.data?.success) {
          setReviews(res.data.reviews || [])
          setSummary(
            res.data.summary || {
              averageRating: 0,
              totalReviews: 0,
              ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            }
          )
          setPagination(
            res.data.pagination || {
              page: 1,
              limit: 5,
              totalPages: 1,
              totalReviews: 0,
            }
          )
        }
      })
      .catch(() => {
        if (isMounted) setError('Unable to load customer reviews at this time.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    if (isAuthenticated && productId) {
      api.get(`/reviews/eligibility/${productId}`)
        .then((res) => {
          if (isMounted && res.data?.success) {
            setEligibility({
              checked: true,
              eligible: res.data.eligible,
              hasPurchased: res.data.hasPurchased,
              hasReviewed: res.data.hasReviewed,
              orderId: res.data.orderId,
              existingReview: res.data.existingReview,
            })
          }
        })
        .catch(() => {
          if (isMounted) setEligibility((prev) => ({ ...prev, checked: true }))
        })
    }

    return () => {
      isMounted = false
    }
  }, [productId, isAuthenticated])

  // Open edit review
  const handleOpenEdit = () => {
    if (!eligibility.existingReview) return
    setFormRating(eligibility.existingReview.rating || 5)
    setFormTitle(eligibility.existingReview.title || '')
    setFormComment(eligibility.existingReview.comment || '')
    setIsEditing(true)
    setShowForm(true)
    setFormError(null)
    setFormSuccess(null)
  }

  // Handle Review Submission
  const handleSubmitReview = async (e) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (!formRating || formRating < 1 || formRating > 5) {
      setFormError('Please select a rating between 1 and 5 stars.')
      return
    }

    if (!formComment || formComment.trim().length < 5) {
      setFormError('Please enter a review comment of at least 5 characters.')
      return
    }

    if (formComment.trim().length > 1000) {
      setFormError('Review comment must not exceed 1000 characters.')
      return
    }

    setFormSubmitting(true)

    try {
      if (isEditing && eligibility.existingReview?._id) {
        // Edit existing review
        const res = await api.put(`/reviews/${eligibility.existingReview._id}`, {
          rating: formRating,
          title: formTitle.trim(),
          comment: formComment.trim(),
        })

        if (res.data?.success) {
          setFormSuccess('Review updated successfully! It has been submitted for moderation.')
          setTimeout(() => {
            setShowForm(false)
            setIsEditing(false)
            checkEligibility()
            fetchReviews(1)
          }, 2000)
        }
      } else {
        // Create new review
        const res = await api.post('/reviews', {
          productId,
          orderId: eligibility.orderId,
          rating: formRating,
          title: formTitle.trim(),
          comment: formComment.trim(),
        })

        if (res.data?.success) {
          setFormSuccess('Thank you! Your review has been submitted and will appear once approved by our moderation team.')
          setTimeout(() => {
            setShowForm(false)
            setFormComment('')
            setFormTitle('')
            checkEligibility()
            fetchReviews(1)
          }, 2500)
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Unable to submit review. Please try again.')
    } finally {
      setFormSubmitting(false)
    }
  }

  // Handle Delete Review
  const handleDeleteReview = async () => {
    if (!eligibility.existingReview?._id) return
    const confirmed = window.confirm('Are you sure you want to delete your review?')
    if (!confirmed) return

    setDeleting(true)
    try {
      const res = await api.delete(`/reviews/${eligibility.existingReview._id}`)
      if (res.data?.success) {
        checkEligibility()
        fetchReviews(1)
        setShowForm(false)
      }
    } catch {
      alert('Unable to delete review. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const hasReviews = summary.totalReviews > 0
  const distribution = summary.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="pt-10 border-t border-[#DED7CA]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow variant="olive">CUSTOMER VOICES</Eyebrow>
          <h2 id="reviews-heading" className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[#1F211C] mt-1">
            Ratings & Reviews
          </h2>
          <p className="text-xs sm:text-sm text-[#5F6057] mt-1">
            Authentic feedback from verified purchasers of {productName || 'this item'}.
          </p>
        </div>

        {/* Action Button: Write Review or View status */}
        {isAuthenticated && eligibility.checked && (
          <div>
            {eligibility.eligible && !showForm && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setFormTitle('')
                  setFormComment('')
                  setFormRating(5)
                  setShowForm(true)
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Write a Review</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Review Submission / Edit Form Modal/Panel */}
      {showForm && (
        <div className="mb-8 rounded-2xl border border-[#34452F]/30 bg-[#FAF7F0] p-5 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#DED7CA] mb-5">
            <div>
              <h3 className="font-serif text-base sm:text-lg font-bold text-[#1F211C]">
                {isEditing ? 'Edit Your Review' : 'Write a Verified Review'}
              </h3>
              <p className="text-xs text-[#5F6057]">
                Your feedback helps our community make informed fashion choices.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setIsEditing(false)
              }}
              className="text-[#85857A] hover:text-[#1F211C] p-1.5 transition-colors cursor-pointer text-xs"
              aria-label="Close review form"
            >
              ✕
            </button>
          </div>

          {formSuccess ? (
            <div className="p-4 rounded-xl bg-[#3F6B45]/15 border border-[#3F6B45]/30 text-[#3F6B45] text-sm flex items-center gap-3">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <p>{formSuccess}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitReview} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-[#A65332]/10 border border-[#A65332]/30 text-[#A65332] text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Star selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1F211C] mb-1.5">
                  Rating <span className="text-[#A65332]">*</span>
                </label>
                <StarRating rating={formRating} interactive onRatingChange={setFormRating} size="lg" />
              </div>

              {/* Review Title */}
              <div>
                <label htmlFor="review-title" className="block text-xs font-bold uppercase tracking-wider text-[#1F211C] mb-1.5">
                  Review Headline <span className="text-[#85857A] font-normal normal-case">(optional)</span>
                </label>
                <input
                  id="review-title"
                  type="text"
                  maxLength={100}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Exceptional tailoring and luxurious drape"
                  className="w-full rounded-xl border border-[#DED7CA] bg-[#FFFDF8] px-4 py-2.5 text-sm text-[#1F211C] placeholder-[#85857A] focus:border-[#34452F] focus:outline-none focus:ring-1 focus:ring-[#34452F]"
                />
              </div>

              {/* Review Comment */}
              <div>
                <label htmlFor="review-comment" className="block text-xs font-bold uppercase tracking-wider text-[#1F211C] mb-1.5">
                  Comments & Fit Experience <span className="text-[#A65332]">*</span>
                </label>
                <textarea
                  id="review-comment"
                  rows={4}
                  maxLength={1000}
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  placeholder="Describe the fabric feel, sizing accuracy, styling versatility, and construction details..."
                  className="w-full rounded-xl border border-[#DED7CA] bg-[#FFFDF8] p-4 text-sm text-[#1F211C] placeholder-[#85857A] focus:border-[#34452F] focus:outline-none focus:ring-1 focus:ring-[#34452F]"
                />
                <div className="flex justify-between text-[11px] text-[#85857A] mt-1">
                  <span>Minimum 5 characters</span>
                  <span>{formComment.length}/1000 characters</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex items-center justify-center min-h-[42px] rounded-xl bg-[#34452F] hover:bg-[#263722] text-[#FFFDF8] px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F]"
                >
                  {formSubmitting ? 'Submitting...' : isEditing ? 'Update Review' : 'Submit Review'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setIsEditing(false)
                  }}
                  className="inline-flex items-center justify-center min-h-[42px] rounded-xl border border-[#DED7CA] bg-[#FFFDF8] hover:bg-[#FAF7F0] text-[#5F6057] px-5 py-2.5 text-xs font-medium uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Customer Review Status Banner (if already reviewed) */}
      {isAuthenticated && eligibility.hasReviewed && eligibility.existingReview && !showForm && (
        <div className="mb-6 rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                eligibility.existingReview.status === 'approved'
                  ? 'bg-[#3F6B45]'
                  : eligibility.existingReview.status === 'rejected'
                  ? 'bg-[#A65332]'
                  : 'bg-[#A86B2D]'
              }`}
            />
            <div>
              <p className="text-xs sm:text-sm font-semibold text-[#1F211C]">
                Your Review ({eligibility.existingReview.status.toUpperCase()})
              </p>
              <p className="text-xs text-[#5F6057]">
                {eligibility.existingReview.status === 'pending'
                  ? 'Your review has been received and is awaiting moderation approval.'
                  : eligibility.existingReview.status === 'approved'
                  ? 'Your review is published and visible to other customers.'
                  : 'Your review was rejected by moderation.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DED7CA] bg-[#FAF7F0] hover:bg-[#DED7CA]/40 px-3 py-1.5 text-xs font-semibold text-[#1F211C] transition-colors cursor-pointer"
            >
              <Edit2 className="h-3 w-3" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDeleteReview}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#A65332]/30 bg-[#A65332]/10 hover:bg-[#A65332]/20 px-3 py-1.5 text-xs font-semibold text-[#A65332] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              <span>{deleting ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Ratings Aggregate & Distribution Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-5 sm:p-8 mb-8">
        {/* Left Column: Overall Rating Score */}
        <div className="md:col-span-5 flex flex-col justify-center border-b md:border-b-0 md:border-r border-[#DED7CA] pb-6 md:pb-0 md:pr-8">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-4xl sm:text-5xl font-bold text-[#1F211C]">
              {hasReviews ? summary.averageRating.toFixed(1) : '—'}
            </span>
            <span className="text-sm text-[#85857A] font-mono">/ 5.0</span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <StarRating rating={Math.round(summary.averageRating)} size="md" />
            <span className="text-xs text-[#5F6057] font-medium">
              {hasReviews ? `${summary.totalReviews} verified review${summary.totalReviews > 1 ? 's' : ''}` : 'No reviews yet'}
            </span>
          </div>

          <p className="mt-3 text-xs text-[#85857A] leading-relaxed">
            Ratings are calculated strictly from verified purchases. All customer reviews undergo authenticity moderation.
          </p>

          {!isAuthenticated ? (
            <p className="mt-4 text-xs text-[#5F6057]">
              Have you purchased this piece?{' '}
              <Link to="/login" className="font-semibold text-[#34452F] underline hover:text-[#263722]">
                Log in
              </Link>{' '}
              to leave your review.
            </p>
          ) : (
            eligibility.checked &&
            !eligibility.hasPurchased && (
              <p className="mt-4 text-xs text-[#85857A] italic">
                Purchase this product to leave a verified customer review.
              </p>
            )
          )}
        </div>

        {/* Right Column: Star Rating Distribution Progress Bars */}
        <div className="md:col-span-7 flex flex-col justify-center space-y-2.5">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = distribution[stars] || 0
            const percentage = hasReviews ? Math.round((count / summary.totalReviews) * 100) : 0

            return (
              <div key={stars} className="flex items-center gap-3 text-xs">
                <span className="w-8 shrink-0 font-medium text-[#1F211C] flex items-center gap-1">
                  <span>{stars}</span>
                  <span className="text-[#D97706]">★</span>
                </span>

                <div className="flex-1 h-2 rounded-full bg-[#EEE7DC] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#34452F] transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  />
                </div>

                <span className="w-12 text-right text-[11px] font-mono text-[#85857A]">
                  {count} <span className="text-[#DED7CA]">({percentage}%)</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Reviews List & Pagination */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#34452F]/20 border-t-[#34452F]" />
          <p className="mt-3 text-xs font-mono uppercase tracking-wider text-[#85857A]">Loading reviews...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl border border-[#A65332]/30 bg-[#A65332]/10 text-center text-[#A65332] text-sm">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => fetchReviews(pagination.page)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#34452F] underline"
          >
            Try Again
          </button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-12 text-center rounded-2xl border border-dashed border-[#DED7CA] bg-[#FFFDF8]/50 p-8">
          <MessageSquare className="h-8 w-8 mx-auto text-[#DED7CA] mb-3" />
          <h3 className="font-serif text-base font-bold text-[#1F211C]">No reviews yet</h3>
          <p className="text-xs text-[#5F6057] mt-1 max-w-md mx-auto">
            Be the first verified customer to share your thoughts on the craftsmanship, fit, and aesthetic of this piece.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <article
              key={rev._id}
              className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-5 sm:p-6 shadow-xs transition-colors hover:border-[#85857A]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StarRating rating={rev.rating} size="sm" />
                    {rev.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#34452F]/10 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-[#34452F]">
                        <CheckCircle className="h-3 w-3" />
                        <span>Verified Purchase</span>
                      </span>
                    )}
                  </div>
                  {rev.title && (
                    <h4 className="font-serif text-sm sm:text-base font-bold text-[#1F211C] pt-1">
                      {rev.title}
                    </h4>
                  )}
                </div>

                <div className="text-right text-[11px] text-[#85857A]">
                  <p className="font-medium text-[#1F211C]">{rev.user?.name || 'Customer'}</p>
                  <p className="font-mono">{formatDate(rev.createdAt)}</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#5F6057] leading-relaxed break-words whitespace-pre-line">
                {rev.comment}
              </p>
            </article>
          ))}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="pt-6 flex items-center justify-between gap-4 border-t border-[#DED7CA]">
              <button
                type="button"
                disabled={!pagination.hasPreviousPage}
                onClick={() => fetchReviews(pagination.page - 1)}
                className="inline-flex items-center justify-center rounded-xl border border-[#DED7CA] bg-[#FFFDF8] hover:bg-[#FAF7F0] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold uppercase tracking-wider text-[#1F211C] px-4 py-2 transition-colors cursor-pointer"
              >
                Previous
              </button>

              <span className="text-xs font-mono text-[#5F6057]">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                type="button"
                disabled={!pagination.hasNextPage}
                onClick={() => fetchReviews(pagination.page + 1)}
                className="inline-flex items-center justify-center rounded-xl border border-[#DED7CA] bg-[#FFFDF8] hover:bg-[#FAF7F0] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold uppercase tracking-wider text-[#1F211C] px-4 py-2 transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default ProductReviews
