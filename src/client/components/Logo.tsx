export function Logo({ width = 32, height = 28, className }: { width?: number; height?: number; className?: string } = {}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 28"
      width={width}
      height={height}
      shapeRendering="crispEdges"
      className={`block shrink-0 logo-animated${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      {/* hard hat */}
      <rect x="4" y="2" width="8" height="3" fill="#f9e2af" />
      <rect x="3" y="4" width="10" height="2" fill="#f9e2af" />
      {/* head */}
      <rect x="5" y="6" width="6" height="5" fill="#cdd6f4" />
      {/* eyes */}
      <rect x="6" y="8" width="1" height="1" fill="#11111b" />
      <rect x="9" y="8" width="1" height="1" fill="#11111b" />
      {/* body + legs bob together */}
      <g style={{ animation: 'factory-logo-bob 2.5s ease-in-out infinite' }}>
        <rect x="5" y="11" width="6" height="7" fill="#6366f1" />
        {/* arms holding box */}
        <rect x="2" y="12" width="3" height="2" fill="#cdd6f4" />
        <rect x="11" y="12" width="3" height="2" fill="#cdd6f4" />
        {/* box */}
        <rect x="14" y="9" width="8" height="8" fill="#a5b4fc" />
        <rect x="14" y="9" width="8" height="2" fill="#818cf8" />
        <rect x="17" y="11" width="2" height="4" fill="#818cf8" opacity="0.5" />
        {/* legs */}
        <rect x="5" y="18" width="2" height="4" fill="#4f46e5" />
        <rect x="9" y="18" width="2" height="4" fill="#4f46e5" />
        {/* boots */}
        <rect x="4" y="22" width="4" height="2" fill="#313244" />
        <rect x="8" y="22" width="4" height="2" fill="#313244" />
      </g>
      {/* ground */}
      <rect x="0" y="24" width="32" height="2" fill="#313244" opacity="0.4" />
    </svg>
  )
}
