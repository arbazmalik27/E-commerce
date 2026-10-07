/**
 * WebGL Support Detection Utility
 * Checks whether WebGL / WebGL2 context is available in the current browser environment.
 */
export function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') ||
          canvas.getContext('webgl') ||
          canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}
