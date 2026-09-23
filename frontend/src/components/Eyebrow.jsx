function Eyebrow({ children, className = '' }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3.5 py-1 text-xs font-bold tracking-[0.2em] text-purple-300 uppercase backdrop-blur-md ${className}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-purple-400"
        aria-hidden="true"
      />
      <span>{children}</span>
    </div>
  )
}

export default Eyebrow
