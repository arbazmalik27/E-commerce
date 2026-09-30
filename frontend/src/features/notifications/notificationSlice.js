import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../services/api'
import { logout } from '../auth/authSlice'

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/notifications', { params })
      return response.data
    } catch (err) {
      const message =
        err.response?.data?.message || 'Unable to load notifications. Please try again.'
      return rejectWithValue(message)
    }
  }
)

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/notifications/unread-count')
      return response.data
    } catch (err) {
      const message =
        err.response?.data?.message || 'Unable to fetch unread notification count.'
      return rejectWithValue(message)
    }
  }
)

export const markNotificationRead = createAsyncThunk(
  'notifications/markNotificationRead',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/notifications/${id}/read`)
      return response.data
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to mark notification as read.'
      return rejectWithValue(message)
    }
  }
)

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllNotificationsRead',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.patch('/notifications/mark-all-read')
      return response.data
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to mark all notifications as read.'
      return rejectWithValue(message)
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState = {
  items: [],
  unreadCount: 0,
  loading: false,
  error: null,
  initialized: false,
}

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearNotificationError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // ── fetchNotifications ─────────────────────────────────────────────────
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false
        state.initialized = true
        state.items = action.payload?.notifications || []
        state.unreadCount = typeof action.payload?.unreadCount === 'number'
          ? action.payload.unreadCount
          : state.items.filter((item) => !item.isRead).length
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false
        state.initialized = true
        state.error = action.payload
      })

      // ── fetchUnreadCount ───────────────────────────────────────────────────
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        if (typeof action.payload?.unreadCount === 'number') {
          state.unreadCount = action.payload.unreadCount
        }
      })

      // ── markNotificationRead ───────────────────────────────────────────────
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const updated = action.payload?.notification
        if (updated && updated._id) {
          const index = state.items.findIndex((item) => item._id === updated._id)
          if (index !== -1) {
            const wasUnread = !state.items[index].isRead
            state.items[index] = { ...state.items[index], isRead: true, readAt: updated.readAt }
            if (wasUnread && state.unreadCount > 0) {
              state.unreadCount = Math.max(0, state.unreadCount - 1)
            }
          }
        }
      })

      // ── markAllNotificationsRead ───────────────────────────────────────────
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items = state.items.map((item) => ({
          ...item,
          isRead: true,
          readAt: new Date().toISOString(),
        }))
        state.unreadCount = 0
      })

      // ── Reset on logout ────────────────────────────────────────────────────
      .addCase(logout.fulfilled, () => initialState)
      .addCase(logout.rejected, () => initialState)
  },
})

export const { clearNotificationError } = notificationSlice.actions

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectNotifications = (state) => state.notifications.items
export const selectUnreadCount = (state) => state.notifications.unreadCount
export const selectNotificationsLoading = (state) => state.notifications.loading
export const selectNotificationsError = (state) => state.notifications.error
export const selectNotificationsInitialized = (state) => state.notifications.initialized

export default notificationSlice.reducer
