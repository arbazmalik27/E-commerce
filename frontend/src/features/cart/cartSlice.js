import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../services/api'
import { logout } from '../auth/authSlice'

export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/cart')
      return response.data
    } catch (err) {
      const message =
        err.response?.data?.message || 'Unable to load cart. Please try again.'
      return rejectWithValue(message)
    }
  }
)

export const addToCart = createAsyncThunk(
  'cart/addToCart',
  async ({ productId, quantity }, { rejectWithValue }) => {
    try {
      const response = await api.post('/cart/items', { productId, quantity })
      return response.data
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (err.response?.data?.errors
          ? Object.values(err.response.data.errors).join(', ')
          : 'Failed to add item to cart.')
      return rejectWithValue(message)
    }
  }
)

export const updateCartItemQuantity = createAsyncThunk(
  'cart/updateCartItemQuantity',
  async ({ productId, quantity }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/cart/items/${productId}`, { quantity })
      return response.data
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (err.response?.data?.errors
          ? Object.values(err.response.data.errors).join(', ')
          : 'Failed to update quantity.')
      return rejectWithValue(message)
    }
  }
)

export const removeCartItem = createAsyncThunk(
  'cart/removeCartItem',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/cart/items/${productId}`)
      return response.data
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to remove item from cart.'
      return rejectWithValue(message)
    }
  }
)

export const clearCart = createAsyncThunk(
  'cart/clearCart',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.delete('/cart')
      return response.data
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to clear cart.'
      return rejectWithValue(message)
    }
  }
)

const initialState = {
  items: [],
  totalItems: 0,
  totalAmount: 0,
  loading: false,
  error: null,
  initialized: false,
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearCartError: (state) => {
      state.error = null
    },
    resetCart: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // fetchCart
      .addCase(fetchCart.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false
        state.initialized = true
        state.error = null
        if (action.payload?.cart) {
          state.items = action.payload.cart.items || []
          state.totalItems = action.payload.cart.totalItems || 0
          state.totalAmount = action.payload.cart.totalAmount || 0
        }
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false
        state.initialized = true
        state.error = action.payload
      })

      // addToCart
      .addCase(addToCart.pending, (state) => {
        state.error = null
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.error = null
        if (action.payload?.cart) {
          state.items = action.payload.cart.items || []
          state.totalItems = action.payload.cart.totalItems || 0
          state.totalAmount = action.payload.cart.totalAmount || 0
        }
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.error = action.payload
      })

      // updateCartItemQuantity
      .addCase(updateCartItemQuantity.pending, (state) => {
        state.error = null
      })
      .addCase(updateCartItemQuantity.fulfilled, (state, action) => {
        state.error = null
        if (action.payload?.cart) {
          state.items = action.payload.cart.items || []
          state.totalItems = action.payload.cart.totalItems || 0
          state.totalAmount = action.payload.cart.totalAmount || 0
        }
      })
      .addCase(updateCartItemQuantity.rejected, (state, action) => {
        state.error = action.payload
      })

      // removeCartItem
      .addCase(removeCartItem.pending, (state) => {
        state.error = null
      })
      .addCase(removeCartItem.fulfilled, (state, action) => {
        state.error = null
        if (action.payload?.cart) {
          state.items = action.payload.cart.items || []
          state.totalItems = action.payload.cart.totalItems || 0
          state.totalAmount = action.payload.cart.totalAmount || 0
        }
      })
      .addCase(removeCartItem.rejected, (state, action) => {
        state.error = action.payload
      })

      // clearCart
      .addCase(clearCart.pending, (state) => {
        state.error = null
      })
      .addCase(clearCart.fulfilled, (state, action) => {
        state.error = null
        if (action.payload?.cart) {
          state.items = action.payload.cart.items || []
          state.totalItems = action.payload.cart.totalItems || 0
          state.totalAmount = action.payload.cart.totalAmount || 0
        } else {
          state.items = []
          state.totalItems = 0
          state.totalAmount = 0
        }
      })
      .addCase(clearCart.rejected, (state, action) => {
        state.error = action.payload
      })

      // Reset cart on logout (fulfilled or rejected)
      .addCase(logout.fulfilled, () => initialState)
      .addCase(logout.rejected, () => initialState)
  },
})

export const { clearCartError, resetCart } = cartSlice.actions

export const selectCart = (state) => state.cart
export const selectCartItems = (state) => state.cart.items
export const selectCartTotalItems = (state) => state.cart.totalItems
export const selectCartTotalAmount = (state) => state.cart.totalAmount
export const selectCartLoading = (state) => state.cart.loading
export const selectCartError = (state) => state.cart.error
export const selectCartInitialized = (state) => state.cart.initialized

export default cartSlice.reducer
