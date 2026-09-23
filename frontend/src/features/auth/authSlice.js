import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/me')
      return response.data
    } catch (err) {
      // 401 is normal when visitor has no cookie, don't show as error
      const message = err.response?.data?.message || 'Not authenticated'
      return rejectWithValue(message)
    }
  }
)

const extractAuthError = (err, fallbackMessage) => {
  if (err.response?.status === 429) {
    return (
      err.response?.data?.message ||
      'Too many requests. Please wait a few minutes and try again.'
    )
  }
  return (
    err.response?.data?.message ||
    (err.response?.data?.errors
      ? Object.values(err.response.data.errors).join(', ')
      : fallbackMessage)
  )
}

export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', credentials)
      return response.data
    } catch (err) {
      return rejectWithValue(extractAuthError(err, 'Invalid email or password'))
    }
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', userData)
      return response.data
    } catch (err) {
      return rejectWithValue(extractAuthError(err, 'Registration failed'))
    }
  }
)

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/logout')
      return response.data
    } catch (err) {
      // Even if backend fails, clear client auth state
      return rejectWithValue(err.response?.data?.message || 'Logout failed')
    }
  }
)

export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await api.put('/users/profile', profileData)
      return response.data
    } catch (err) {
      return rejectWithValue(extractAuthError(err, 'Failed to update profile'))
    }
  }
)

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  initialized: false,
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchCurrentUser
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false
        state.initialized = true
        state.isAuthenticated = true
        state.user = action.payload.user
        state.error = null
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.loading = false
        state.initialized = true
        state.isAuthenticated = false
        state.user = null
      })

      // login
      .addCase(login.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.error = null
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.isAuthenticated = false
        state.user = null
        state.error = action.payload
      })

      // register
      .addCase(register.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.error = null
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false
        state.isAuthenticated = false
        state.user = null
        state.error = action.payload
      })

      // logout
      .addCase(logout.fulfilled, (state) => {
        state.loading = false
        state.isAuthenticated = false
        state.user = null
        state.error = null
      })
      .addCase(logout.rejected, (state) => {
        state.loading = false
        state.isAuthenticated = false
        state.user = null
        state.error = null
      })

      // updateUserProfile
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        if (action.payload?.user) {
          state.user = {
            ...state.user,
            ...action.payload.user,
          }
        }
      })
  },
})

export const { clearAuthError } = authSlice.actions

export const selectAuth = (state) => state.auth
export const selectUser = (state) => state.auth.user
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated
export const selectAuthLoading = (state) => state.auth.loading
export const selectAuthInitialized = (state) => state.auth.initialized
export const selectAuthError = (state) => state.auth.error

export default authSlice.reducer
