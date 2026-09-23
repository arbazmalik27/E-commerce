let razorpayPromise = null

/**
 * Dynamically loads the Razorpay Checkout script (https://checkout.razorpay.com/v1/checkout.js).
 * Avoids loading the script repeatedly by caching the promise.
 *
 * @returns {Promise<boolean>} True if script loaded and window.Razorpay is available, false otherwise.
 */
export const loadRazorpayScript = () => {
  if (typeof window !== 'undefined' && window.Razorpay) {
    return Promise.resolve(true)
  }

  if (razorpayPromise) {
    return razorpayPromise
  }

  razorpayPromise = new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(false)
      return
    }

    // Check if script element is already in document
    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    )
    if (existingScript) {
      if (window.Razorpay) {
        resolve(true)
        return
      }
      existingScript.addEventListener('load', () => resolve(Boolean(window.Razorpay)))
      existingScript.addEventListener('error', () => {
        razorpayPromise = null
        resolve(false)
      })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => {
      resolve(Boolean(window.Razorpay))
    }
    script.onerror = () => {
      razorpayPromise = null
      resolve(false)
    }

    document.body.appendChild(script)
  })

  return razorpayPromise
}
