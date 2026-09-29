import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Star, CheckCircle, XCircle, Trash2, Check, MessageSquare, AlertCircle } from 'lucide-react'
import api from '../../services/api'
import AdminNav from '../../components/AdminNav'
import Eyebrow from '../../components/Eyebrow'
import SEO from '../../components/SEO'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating ? 'text-[#D97706] fill-[#D97706]' : 'text-[#DED7CA]'
          }`}
          aria-hidden="true"
        />
      ))}
      <span className="ml-1 text-xs font-semibold text-[#1F211C]">{rating}</span>
    </div>
  )
}

function AdminReviewsPage() {
  const [reviews, setReviews] = useState([])
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [toast, setToast] = useState(null) // { type: 'success' | 'error', message: string }

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const queryParams = new URLSearchParams()
      queryParams.set('page', page)
      queryParams.set('limit', 10)
      if (statusFilter !== 'all') {
        queryParams.set('status', statusFilter)
      }

      const res = await api.get(`/reviews/admin?${queryParams.toString()}`)
      if (res.data?.success) {
        setReviews(res.data.reviews || [])
        setStatusCounts(
          res.data.statusCounts || {
            pending: 0,
            approved: 0,
            rejected: 0,
            total: 0,
          }
        )
        setTotalPages(res.data.pagination?.totalPages || 1)
      }
    } catch {
      setError('Unable to load reviews. Please check your network and admin permissions.')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    let isMounted = true

    const queryParams = new URLSearchParams()
    queryParams.set('page', page)
    queryParams.set('limit', 10)
    if (statusFilter !== 'all') {
      queryParams.set('status', statusFilter)
    }

    api.get(`/reviews/admin?${queryParams.toString()}`)
      .then((res) => {
        if (isMounted && res.data?.success) {
          setReviews(res.data.reviews || [])
          setStatusCounts(
            res.data.statusCounts || {
              pending: 0,
              approved: 0,
              rejected: 0,
              total: 0,
            }
          )
          setTotalPages(res.data.pagination?.totalPages || 1)
        }
      })
      .catch(() => {
        if (isMounted) setError('Unable to load reviews. Please check your network and admin permissions.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [page, statusFilter])

  const handleUpdateStatus = async (reviewId, newStatus) => {
    setActionLoadingId(reviewId)
    try {
      const res = await api.patch(`/reviews/admin/${reviewId}/status`, { status: newStatus })
      if (res.data?.success) {
        showToast('success', `Review ${newStatus} successfully`)
        fetchReviews()
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || `Unable to ${newStatus} review`)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeleteReview = async (reviewId) => {
    const confirmed = window.confirm('Are you sure you want to permanently delete this review?')
    if (!confirmed) return

    setActionLoadingId(reviewId)
    try {
      const res = await api.delete(`/reviews/admin/${reviewId}`)
      if (res.data?.success) {
        showToast('success', 'Review deleted successfully')
        fetchReviews()
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Unable to delete review')
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <>
      <SEO
        title="Review Moderation | TrendVolt Admin"
        description="Moderate customer product reviews, verify purchase records, and maintain authentic customer ratings."
      />

      <div className="min-h-screen bg-[#F5F0E8] py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <Eyebrow variant="olive">ADMINISTRATION</Eyebrow>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#1F211C] mt-1">
                Product Reviews Moderation
              </h1>
              <p className="text-xs sm:text-sm text-[#5F6057] mt-1">
                Inspect verified purchase reviews, enforce editorial guidelines, and manage customer ratings.
              </p>
            </div>

            <AdminNav />
          </div>

          {/* Toast Notification */}
          {toast && (
            <div
              className={`mb-6 p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-fade-in ${
                toast.type === 'success'
                  ? 'bg-[#3F6B45]/15 border-[#3F6B45]/30 text-[#3F6B45]'
                  : 'bg-[#A65332]/10 border-[#A65332]/30 text-[#A65332]'
              }`}
            >
              <div className="flex items-center gap-2">
                {toast.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-[#85857A] hover:text-[#1F211C] text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Filter Status Bar */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {[
              { id: 'pending', label: 'Pending Moderation', count: statusCounts.pending },
              { id: 'approved', label: 'Approved', count: statusCounts.approved },
              { id: 'rejected', label: 'Rejected', count: statusCounts.rejected },
              { id: 'all', label: 'All Reviews', count: statusCounts.total },
            ].map((tab) => {
              const isActive = statusFilter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.id)
                    setPage(1)
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#34452F] text-[#FFFDF8] shadow-xs'
                      : 'border border-[#DED7CA] bg-[#FFFDF8] hover:bg-[#FAF7F0] text-[#5F6057]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#FAF7F0] text-[#85857A]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Reviews Content */}
          {loading ? (
            <div className="py-16 text-center rounded-2xl border border-[#DED7CA] bg-[#FFFDF8]">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#34452F]/20 border-t-[#34452F]" />
              <p className="mt-3 text-xs font-mono uppercase tracking-wider text-[#85857A]">
                Loading reviews...
              </p>
            </div>
          ) : error ? (
            <div className="p-8 text-center rounded-2xl border border-[#A65332]/30 bg-[#A65332]/10 text-[#A65332]">
              <p className="text-sm">{error}</p>
              <button
                type="button"
                onClick={fetchReviews}
                className="mt-3 text-xs font-bold uppercase tracking-wider text-[#34452F] underline"
              >
                Retry
              </button>
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-[#DED7CA] bg-[#FFFDF8]/60 p-8">
              <MessageSquare className="h-10 w-10 mx-auto text-[#DED7CA] mb-3" />
              <h3 className="font-serif text-lg font-bold text-[#1F211C]">No reviews found</h3>
              <p className="text-xs text-[#5F6057] mt-1">
                There are no {statusFilter === 'all' ? '' : statusFilter} reviews in the system.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <div
                  key={rev._id}
                  className="rounded-2xl border border-[#DED7CA] bg-[#FFFDF8] p-5 sm:p-6 shadow-xs transition-colors hover:border-[#85857A]"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-4 border-b border-[#DED7CA]/70">
                    {/* Left: Product & Customer & Order info */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/products/${rev.product?._id || rev.product}`}
                          className="font-serif text-base font-bold text-[#1F211C] hover:text-[#34452F] transition-colors"
                        >
                          {rev.product?.name || 'View Product'}
                        </Link>
                        {rev.product?.brand && (
                          <span className="rounded-full bg-[#FAF7F0] border border-[#DED7CA] px-2 py-0.5 text-[10px] font-mono text-[#85857A]">
                            {rev.product.brand}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5F6057]">
                        <span>Customer: <strong className="text-[#1F211C]">{rev.user?.name || 'Customer'}</strong> ({rev.user?.email || 'N/A'})</span>
                        <span className="text-[#DED7CA]">·</span>
                        <span>Order: <span className="font-mono text-[#34452F] font-semibold">{rev.order?.orderNumber || rev.order?._id || 'Verified'}</span></span>
                        <span className="text-[#DED7CA]">·</span>
                        <span className="font-mono text-[#85857A]">{formatDate(rev.createdAt)}</span>
                      </div>
                    </div>

                    {/* Right: Status badge & Moderation Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
                          rev.status === 'approved'
                            ? 'bg-[#3F6B45]/15 border-[#3F6B45]/30 text-[#3F6B45]'
                            : rev.status === 'rejected'
                            ? 'bg-[#A65332]/10 border-[#A65332]/30 text-[#A65332]'
                            : 'bg-[#FAF7F0] border-[#DED7CA] text-[#A86B2D]'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            rev.status === 'approved'
                              ? 'bg-[#3F6B45]'
                              : rev.status === 'rejected'
                              ? 'bg-[#A65332]'
                              : 'bg-[#A86B2D]'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="capitalize">{rev.status}</span>
                      </span>

                      {/* Action buttons */}
                      {rev.status !== 'approved' && (
                        <button
                          type="button"
                          disabled={actionLoadingId === rev._id}
                          onClick={() => handleUpdateStatus(rev._id, 'approved')}
                          className="inline-flex items-center gap-1 rounded-xl bg-[#3F6B45] hover:bg-[#2F5234] text-white px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Approve</span>
                        </button>
                      )}

                      {rev.status !== 'rejected' && (
                        <button
                          type="button"
                          disabled={actionLoadingId === rev._id}
                          onClick={() => handleUpdateStatus(rev._id, 'rejected')}
                          className="inline-flex items-center gap-1 rounded-xl bg-[#FAF7F0] hover:bg-[#A65332]/10 border border-[#A65332]/30 text-[#A65332] px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={actionLoadingId === rev._id}
                        onClick={() => handleDeleteReview(rev._id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#DED7CA] hover:bg-red-50 text-[#85857A] hover:text-[#A65332] p-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        aria-label="Delete review"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Review Content */}
                  <div className="pt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <StarRating rating={rev.rating} />
                      {rev.verifiedPurchase && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#34452F]/10 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-[#34452F]">
                          <CheckCircle className="h-3 w-3" />
                          <span>Verified Purchase</span>
                        </span>
                      )}
                    </div>

                    {rev.title && (
                      <h4 className="font-serif text-sm font-bold text-[#1F211C]">
                        {rev.title}
                      </h4>
                    )}

                    <p className="text-xs sm:text-sm text-[#5F6057] leading-relaxed break-words whitespace-pre-line">
                      {rev.comment}
                    </p>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pt-6 flex items-center justify-between gap-4 border-t border-[#DED7CA]">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-xl border border-[#DED7CA] bg-[#FFFDF8] hover:bg-[#FAF7F0] disabled:opacity-40 text-xs font-semibold uppercase tracking-wider text-[#1F211C] px-4 py-2 cursor-pointer"
                  >
                    Previous
                  </button>

                  <span className="text-xs font-mono text-[#5F6057]">
                    Page {page} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-xl border border-[#DED7CA] bg-[#FFFDF8] hover:bg-[#FAF7F0] disabled:opacity-40 text-xs font-semibold uppercase tracking-wider text-[#1F211C] px-4 py-2 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default AdminReviewsPage
