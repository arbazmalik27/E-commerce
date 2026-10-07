/**
 * TrendVolt Phase 3C — Avatar Service
 * Client API integration for customer 3D avatar profile CRUD.
 * Uses the canonical Axios client (services/api.js).
 */

import api from './api'

/**
 * Fetch authenticated customer's avatar profile.
 * @returns {Promise<{ success: boolean, avatar: Object }>}
 */
export const getAvatar = async () => {
  const response = await api.get('/avatar')
  return response.data
}

/**
 * Create a new avatar profile for authenticated customer.
 * @param {Object} avatarData
 * @returns {Promise<{ success: boolean, avatar: Object }>}
 */
export const createAvatar = async (avatarData) => {
  const response = await api.post('/avatar', avatarData)
  return response.data
}

/**
 * Update existing avatar profile for authenticated customer.
 * @param {Object} avatarData
 * @returns {Promise<{ success: boolean, avatar: Object }>}
 */
export const updateAvatar = async (avatarData) => {
  const response = await api.put('/avatar', avatarData)
  return response.data
}

/**
 * Delete avatar profile for authenticated customer.
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const deleteAvatar = async () => {
  const response = await api.delete('/avatar')
  return response.data
}

const avatarService = {
  getAvatar,
  createAvatar,
  updateAvatar,
  deleteAvatar,
}

export default avatarService
