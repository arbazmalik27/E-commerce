const mongoose = require('mongoose')
const Notification = require('../models/Notification')

const isValidObjectId = (id) =>
  typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id) && mongoose.isValidObjectId(id)

/**
 * Retrieve notifications for the authenticated user.
 * GET /api/notifications?limit=20
 */
const getNotifications = async (req, res) => {
  try {
    const rawLimit = parseInt(req.query.limit, 10)
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 20

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('_id type title message isRead readAt link metadata createdAt')
        .lean(),
      Notification.countDocuments({ user: req.user.id, isRead: false }),
    ])

    return res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * Retrieve the unread notification count for the authenticated user.
 * GET /api/notifications/unread-count
 */
const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      isRead: false,
    })

    return res.status(200).json({
      success: true,
      unreadCount,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * Mark a single notification as read.
 * PATCH /api/notifications/:id/read
 */
const markOneRead = async (req, res) => {
  const { id } = req.params

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid notification ID' })
  }

  try {
    // Ownership check (IDOR protection)
    const notification = await Notification.findOne({
      _id: id,
      user: req.user.id,
    })

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' })
    }

    if (!notification.isRead) {
      notification.isRead = true
      notification.readAt = new Date()
      await notification.save()
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * Mark all unread notifications as read for the authenticated user.
 * PATCH /api/notifications/mark-all-read
 */
const markAllRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        user: req.user.id,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    )

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      updatedCount: result.modifiedCount,
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markOneRead,
  markAllRead,
}
