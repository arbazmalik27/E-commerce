import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Bell, ShoppingBag, Truck, Sparkles, CheckCheck } from 'lucide-react'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  selectNotifications,
  selectNotificationsLoading,
  selectUnreadCount,
} from '../../features/notifications/notificationSlice'
import { formatRelativeTime } from '../../utils/formatRelativeTime'

const TYPE_ICONS = {
  order_confirmed: {
    icon: ShoppingBag,
    style: 'bg-[#34452F]/10 dark:bg-[#5B7A52]/20 text-[#34452F] dark:text-[#8EA885]',
  },
  order_status_updated: {
    icon: Truck,
    style: 'bg-[#34452F]/10 dark:bg-[#5B7A52]/20 text-[#34452F] dark:text-[#8EA885]',
  },
  back_in_stock: {
    icon: Sparkles,
    style: 'bg-[#A65332]/10 dark:bg-[#D4714D]/20 text-[#A65332] dark:text-[#E89B7E]',
  },
}

function NotificationBell({ className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const buttonRef = useRef(null)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const notifications = useSelector(selectNotifications)
  const unreadCount = useSelector(selectUnreadCount)
  const loading = useSelector(selectNotificationsLoading)

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const toggleDropdown = () => {
    if (!isOpen) {
      dispatch(fetchNotifications({ limit: 20 }))
    }
    setIsOpen((prev) => !prev)
  }

  const handleMarkAllRead = async (e) => {
    e.stopPropagation()
    await dispatch(markAllNotificationsRead())
  }

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      dispatch(markNotificationRead(notification._id))
    }
    setIsOpen(false)
    if (notification.link) {
      navigate(notification.link)
    }
  }

  const badgeText = unreadCount > 99 ? '99+' : unreadCount

  return (
    <div className="relative inline-block">
      {/* ── Bell Trigger Button ────────────────────────────────────────── */}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`h-10 w-10 flex items-center justify-center rounded-full text-[#5F6057] hover:text-[#1F211C] hover:bg-[#FAF7F0] dark:text-[#B9B6AD] dark:hover:text-[#F6F3EC] dark:hover:bg-[#262A21] transition-colors relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34452F] dark:focus-visible:ring-[#8EA885] ${className}`}
      >
        <Bell className="h-4.5 w-4.5" strokeWidth={1.75} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            data-testid="unread-badge"
            className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#A65332] text-[10px] font-bold text-[#FFFDF8] leading-none shadow-xs font-mono select-none"
          >
            {badgeText}
          </span>
        )}
      </button>

      {/* ── Notification Popover Dropdown ──────────────────────────────── */}
      {isOpen && (
        <div
          ref={dropdownRef}
          role="dialog"
          aria-label="Notifications Inbox"
          tabIndex={-1}
          className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[26rem] flex flex-col rounded-2xl border border-[#DED7CA] dark:border-[#30362A] bg-[#FFFDF8] dark:bg-[#1E211A] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="p-4 border-b border-[#DED7CA]/70 dark:border-[#30362A] flex items-center justify-between gap-2 shrink-0 bg-[#FFFDF8] dark:bg-[#1E211A]">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-base font-bold text-[#1F211C] dark:text-[#F6F3EC] tracking-tight">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#FAF7F0] dark:bg-[#262A21] border border-[#DED7CA] dark:border-[#30362A] text-[11px] font-mono font-bold text-[#5F6057] dark:text-[#B9B6AD]">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-[#34452F] hover:text-[#263722] dark:text-[#8EA885] dark:hover:text-[#FFFDF8] inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Body List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#DED7CA]/40 dark:divide-[#30362A]/60">
            {loading && notifications.length === 0 ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex gap-3 animate-pulse">
                    <div className="h-9 w-9 rounded-xl bg-[#FAF7F0] dark:bg-[#262A21] shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-[#FAF7F0] dark:bg-[#262A21] rounded w-3/4" />
                      <div className="h-3 bg-[#FAF7F0] dark:bg-[#262A21] rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              /* Empty State */
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="h-12 w-12 rounded-2xl bg-[#FAF7F0] dark:bg-[#262A21] border border-[#DED7CA]/70 dark:border-[#30362A] flex items-center justify-center text-[#85857A] mb-3">
                  <Bell className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-[#1F211C] dark:text-[#F6F3EC]">
                  No new notifications
                </p>
                <p className="text-xs text-[#85857A] mt-1 font-mono">
                  You’re all caught up.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const conf = TYPE_ICONS[item.type] || TYPE_ICONS.order_confirmed
                const IconComponent = conf.icon
                const isUnread = !item.isRead

                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => handleNotificationClick(item)}
                    className={`w-full text-left p-3.5 sm:p-4 flex items-start gap-3 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#34452F] ${
                      isUnread
                        ? 'bg-[#FAF7F0]/80 dark:bg-[#262A21]/70 hover:bg-[#FAF7F0] dark:hover:bg-[#262A21]'
                        : 'bg-transparent hover:bg-[#FAF7F0]/40 dark:hover:bg-[#262A21]/40'
                    }`}
                  >
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${conf.style}`}
                      aria-hidden="true"
                    >
                      <IconComponent className="h-4.5 w-4.5" strokeWidth={1.75} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs sm:text-sm truncate ${
                            isUnread
                              ? 'font-bold text-[#1F211C] dark:text-[#F6F3EC]'
                              : 'font-medium text-[#5F6057] dark:text-[#B9B6AD]'
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono text-[#85857A] shrink-0">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-[#5F6057] dark:text-[#B9B6AD] line-clamp-2 mt-0.5 leading-relaxed">
                        {item.message}
                      </p>
                    </div>

                    {isUnread && (
                      <span
                        className="h-2 w-2 rounded-full bg-[#A65332] shrink-0 mt-1.5"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
