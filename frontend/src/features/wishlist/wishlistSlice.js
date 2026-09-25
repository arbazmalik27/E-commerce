import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../services/api'
import { logout } from '../auth/authSlice'

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const fetchWishlist = createAsyncThunk(
  'wishlist/fetchWishlist',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/users/wishlist')
      return response.data
    } catch (err) {
      const message =
        err.response?.data?.message || 'Unable to load wishlist. Please try again.'
      return rejectWithValue(message)
    }
  }
)

export const addToWishlist = createAsyncThunk(
  'wishlist/addToWishlist',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/users/wishlist/${productId}`)
      return response.data
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to add item to wishlist.'
      return rejectWithValue(message)
    }
  }
)

export const removeFromWishlist = createAsyncThunk(
  'wishlist/removeFromWishlist',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/users/wishlist/${productId}`)
      return response.data
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to remove item from wishlist.'
      return rejectWithValue(message)
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState = {
  /** Array of full populated product objects from backend. */
  items: [],
  /** Flat array of product ID strings for O(1) membership checks. */
  itemIds: [],
  loading: false,
  /** True once the wishlist has been fetched at least once this session. */
  initialized: false,
  error: null,
}

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    clearWishlistError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // ── fetchWishlist ──────────────────────────────────────────────────────
      .addCase(fetchWishlist.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading = false
        state.initialized = true
        const products = action.payload?.wishlist || []
        state.items = products
        state.itemIds = products.map((p) => p._id)
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading = false
        state.initialized = true
        state.error = action.payload
      })

      // ── addToWishlist ──────────────────────────────────────────────────────
      .addCase(addToWishlist.pending, (state) => {
        state.error = null
      })
      .addCase(addToWishlist.fulfilled, (state, action) => {
        // Backend returns the updated wishlist array on success;
        // guard against the 'Already in wishlist' early-return that omits it
        if (Array.isArray(action.payload?.wishlist)) {
          const products = action.payload.wishlist
          state.items = products
          state.itemIds = products.map((p) => p._id)
        }
      })
      .addCase(addToWishlist.rejected, (state, action) => {
        state.error = action.payload
      })

      // ── removeFromWishlist ─────────────────────────────────────────────────
      .addCase(removeFromWishlist.pending, (state) => {
        state.error = null
      })
      .addCase(removeFromWishlist.fulfilled, (state, action) => {
        if (Array.isArray(action.payload?.wishlist)) {
          const products = action.payload.wishlist
          state.items = products
          state.itemIds = products.map((p) => p._id)
        }
      })
      .addCase(removeFromWishlist.rejected, (state, action) => {
        state.error = action.payload
      })

      // ── Reset on logout ────────────────────────────────────────────────────
      .addCase(logout.fulfilled, () => initialState)
      .addCase(logout.rejected, () => initialState)
  },
})

export const { clearWishlistError } = wishlistSlice.actions

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectWishlistItems = (state) => state.wishlist.items
export const selectWishlistItemIds = (state) => state.wishlist.itemIds
export const selectWishlistTotalItems = (state) => state.wishlist.items.length
export const selectWishlistLoading = (state) => state.wishlist.loading
export const selectWishlistInitialized = (state) => state.wishlist.initialized
export const selectWishlistError = (state) => state.wishlist.error

/** Returns true if the given productId is currently in the wishlist. */
export const selectIsInWishlist = (productId) => (state) =>
  state.wishlist.itemIds.includes(productId)

export default wishlistSlice.reducer