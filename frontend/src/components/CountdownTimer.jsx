import { useState, useEffect } from 'react'

/**
 * Reusable countdown timer for Flash Sales / Limited Offers.
 * Cleans up interval automatically on unmount to prevent memory leaks.
 * Supports onExpire callback to trigger revalidation.
 */
function CountdownTimer({ targetDate, label = 'Ends in', onExpire = null, compact = false }) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate))

  function calculateTimeLeft(target) {
    if (!target) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 }
    const difference = new Date(target).getTime() - new Date().getTime()
    if (difference <= 0) {
      return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 }
    }
    const days = Math.floor(difference / (1000 * 60 * 60 * 24))
    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
    const minutes = Math.floor((difference / 1000 / 60) % 60)
    const seconds = Math.floor((difference / 1000) % 60)
    return { total: difference, days, hours, minutes, seconds }
  }

  useEffect(() => {
    if (!targetDate) return

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft(targetDate)
      setTimeLeft(remaining)

      if (remaining.total <= 0) {
        clearInterval(timer)
        if (typeof onExpire === 'function') {
          onExpire()
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate, onExpire])

  if (timeLeft.total <= 0) {
    return null
  }

  const formatNum = (num) => String(num).padStart(2, '0')
  const totalHours = timeLeft.days > 0 ? timeLeft.days * 24 + timeLeft.hours : timeLeft.hours

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 font-mono font-bold text-xs tracking-wider">
        {label && <span className="font-sans text-[11px] font-medium opacity-90">{label}</span>}
        <span className="bg-[#A65332] text-white px-1.5 py-0.5 rounded text-[11px]">
          {formatNum(totalHours)}:{formatNum(timeLeft.minutes)}:{formatNum(timeLeft.seconds)}
        </span>
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      {label && <span className="font-sans font-semibold text-[#85857A] tracking-wider uppercase text-[10px]">{label}:</span>}
      <div className="flex items-center gap-1">
        <span className="flex flex-col items-center justify-center min-w-[28px] h-7 px-1 rounded bg-[#1F211C] text-[#FFFDF8] font-bold text-xs shadow-xs">
          {formatNum(totalHours)}
        </span>
        <span className="text-[#1F211C] font-bold">:</span>
        <span className="flex flex-col items-center justify-center min-w-[28px] h-7 px-1 rounded bg-[#1F211C] text-[#FFFDF8] font-bold text-xs shadow-xs">
          {formatNum(timeLeft.minutes)}
        </span>
        <span className="text-[#1F211C] font-bold">:</span>
        <span className="flex flex-col items-center justify-center min-w-[28px] h-7 px-1 rounded bg-[#A65332] text-white font-bold text-xs shadow-xs">
          {formatNum(timeLeft.seconds)}
        </span>
      </div>
    </div>
  )
}

export default CountdownTimer
