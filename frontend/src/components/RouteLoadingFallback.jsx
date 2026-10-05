function RouteLoadingFallback() {
  return (
    <div
      className="flex min-h-[50vh] w-full items-center justify-center py-16"
      role="status"
      aria-label="Loading page content"
    >
      <div className="h-9 w-9 animate-spin rounded-full border-3 border-[#34452F] border-t-transparent" />
      <span className="sr-only">Loading page content...</span>
    </div>
  )
}

export default RouteLoadingFallback
