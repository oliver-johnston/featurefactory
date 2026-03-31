import { useEffect, useState } from 'react'
import { getRandomScene, getRandomStatusText } from './factoryScenes.js'
import type { FactoryScene } from './factoryScenes.js'

function WorkerScene() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 28"
      width="64"
      height="56"
      shapeRendering="crispEdges"
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
      <g style={{ animation: 'factory-walk 0.6s ease-in-out infinite' }}>
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

function ForkliftScene() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 36 28"
      width="72"
      height="56"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <g transform="translate(24,0) scale(-1,1)">
        {/* mast */}
        <rect x="2" y="4" width="2" height="18" fill="#585b70" />
        <rect x="4" y="4" width="2" height="18" fill="#6c7086" />
        {/* forks + box (animated up/down) */}
        <g style={{ animation: 'factory-forklift-forks 2s ease-in-out infinite' }}>
          <rect x="0" y="16" width="6" height="2" fill="#f9e2af" />
          <rect x="0" y="18" width="2" height="4" fill="#f9e2af" />
          <rect x="4" y="18" width="2" height="4" fill="#f9e2af" />
          {/* box on forks */}
          <rect x="0" y="10" width="6" height="6" fill="#a5b4fc" />
          <rect x="0" y="10" width="6" height="2" fill="#818cf8" />
        </g>
        {/* cab body */}
        <g style={{ animation: 'factory-forklift-bounce 1s ease-in-out infinite' }}>
          <rect x="8" y="8" width="14" height="12" fill="#6366f1" />
          <rect x="8" y="8" width="14" height="2" fill="#818cf8" />
          {/* window */}
          <rect x="10" y="10" width="5" height="4" fill="#1e1b4b" />
          <rect x="10" y="10" width="3" height="2" fill="#a5b4fc" opacity="0.4" />
          {/* driver head */}
          <rect x="16" y="5" width="4" height="4" fill="#cdd6f4" />
          <rect x="16" y="4" width="4" height="2" fill="#f9e2af" />
          {/* driver eye */}
          <rect x="17" y="7" width="1" height="1" fill="#11111b" />
          {/* exhaust */}
          <rect x="20" y="4" width="2" height="4" fill="#585b70" />
          <rect x="21" y="2" width="2" height="2" fill="#6c7086" opacity="0.5" style={{ animation: 'factory-walk 1s ease-in-out infinite' }} />
        </g>
        {/* wheels */}
        <rect x="9" y="20" width="4" height="4" rx="2" fill="#313244" />
        <rect x="17" y="20" width="4" height="4" rx="2" fill="#313244" />
        <rect x="10" y="21" width="2" height="2" fill="#585b70" />
        <rect x="18" y="21" width="2" height="2" fill="#585b70" />
      </g>
      {/* ground (not flipped) */}
      <rect x="0" y="24" width="36" height="2" fill="#313244" opacity="0.4" />
    </svg>
  )
}

function ConveyorScene() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 28"
      width="80"
      height="56"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {/* conveyor frame */}
      <rect x="2" y="16" width="36" height="2" fill="#585b70" />
      <rect x="2" y="22" width="36" height="2" fill="#585b70" />
      {/* legs */}
      <rect x="4" y="22" width="2" height="4" fill="#6c7086" />
      <rect x="18" y="22" width="2" height="4" fill="#6c7086" />
      <rect x="34" y="22" width="2" height="4" fill="#6c7086" />
      {/* belt (top) */}
      <rect x="2" y="14" width="36" height="2" fill="#6c7086" />
      {/* rollers */}
      <g>
        <rect x="6" y="18" width="4" height="2" fill="#818cf8" style={{ animation: 'factory-conveyor-roller 0.5s linear infinite', transformOrigin: '8px 19px' }} />
        <rect x="18" y="18" width="4" height="2" fill="#818cf8" style={{ animation: 'factory-conveyor-roller 0.5s linear infinite', transformOrigin: '20px 19px' }} />
        <rect x="30" y="18" width="4" height="2" fill="#818cf8" style={{ animation: 'factory-conveyor-roller 0.5s linear infinite', transformOrigin: '32px 19px' }} />
      </g>
      {/* boxes sliding on belt */}
      <g style={{ animation: 'factory-conveyor-belt 4s linear infinite' }}>
        {/* set 1 */}
        <rect x="4" y="8" width="6" height="6" fill="#a5b4fc" />
        <rect x="4" y="8" width="6" height="2" fill="#818cf8" />
        <rect x="16" y="10" width="5" height="4" fill="#a5b4fc" />
        <rect x="16" y="10" width="5" height="1" fill="#818cf8" />
        <rect x="28" y="7" width="7" height="7" fill="#a5b4fc" />
        <rect x="28" y="7" width="7" height="2" fill="#818cf8" />
        {/* set 2 — duplicate offset by -40 (viewBox width) for seamless loop */}
        <rect x="-36" y="8" width="6" height="6" fill="#a5b4fc" />
        <rect x="-36" y="8" width="6" height="2" fill="#818cf8" />
        <rect x="-24" y="10" width="5" height="4" fill="#a5b4fc" />
        <rect x="-24" y="10" width="5" height="1" fill="#818cf8" />
        <rect x="-12" y="7" width="7" height="7" fill="#a5b4fc" />
        <rect x="-12" y="7" width="7" height="2" fill="#818cf8" />
      </g>
      {/* ground */}
      <rect x="0" y="26" width="40" height="2" fill="#313244" opacity="0.4" />
    </svg>
  )
}

function GearsScene() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 28"
      width="80"
      height="56"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {/* worker */}
      {/* hard hat */}
      <rect x="2" y="2" width="6" height="2" fill="#f9e2af" />
      <rect x="1" y="3" width="8" height="2" fill="#f9e2af" />
      {/* head */}
      <rect x="2" y="5" width="6" height="4" fill="#cdd6f4" />
      {/* eye */}
      <rect x="6" y="7" width="1" height="1" fill="#11111b" />
      {/* body */}
      <rect x="2" y="9" width="6" height="7" fill="#6366f1" />
      {/* arm pulling lever */}
      <g style={{ animation: 'factory-arm-pull 1.5s ease-in-out infinite' }}>
        <rect x="8" y="10" width="5" height="2" fill="#cdd6f4" />
      </g>
      {/* legs */}
      <rect x="2" y="16" width="2" height="4" fill="#4f46e5" />
      <rect x="6" y="16" width="2" height="4" fill="#4f46e5" />
      {/* boots */}
      <rect x="1" y="20" width="4" height="2" fill="#313244" />
      <rect x="5" y="20" width="4" height="2" fill="#313244" />
      {/* lever */}
      <g style={{ animation: 'factory-lever-pull 1.5s ease-in-out infinite', transformOrigin: '14px 20px' }}>
        <rect x="13" y="8" width="2" height="14" fill="#585b70" />
        <rect x="12" y="7" width="4" height="2" fill="#f38ba8" />
      </g>
      <rect x="12" y="20" width="6" height="2" fill="#6c7086" />
      {/* large gear */}
      <g style={{ animation: 'factory-gear-spin 2s linear infinite', transformOrigin: '27px 11px' }}>
        <rect x="23" y="7" width="8" height="8" fill="#818cf8" />
        <rect x="25" y="5" width="4" height="12" fill="#818cf8" />
        <rect x="21" y="9" width="12" height="4" fill="#818cf8" />
        <rect x="25" y="9" width="4" height="4" fill="#6366f1" />
      </g>
      {/* small gear */}
      <g style={{ animation: 'factory-gear-spin-reverse 1.2s linear infinite', transformOrigin: '35px 19px' }}>
        <rect x="33" y="17" width="4" height="4" fill="#a5b4fc" />
        <rect x="34" y="16" width="2" height="6" fill="#a5b4fc" />
        <rect x="32" y="18" width="6" height="2" fill="#a5b4fc" />
        <rect x="34" y="18" width="2" height="2" fill="#818cf8" />
      </g>
      {/* ground */}
      <rect x="0" y="22" width="40" height="2" fill="#313244" opacity="0.4" />
    </svg>
  )
}

function WelderScene() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 36 28"
      width="72"
      height="56"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {/* welding mask */}
      <rect x="3" y="2" width="8" height="2" fill="#585b70" />
      <rect x="2" y="4" width="10" height="6" fill="#585b70" />
      {/* visor */}
      <rect x="4" y="5" width="6" height="3" fill="#1e1b4b" />
      <rect x="4" y="5" width="3" height="1" fill="#6366f1" opacity="0.3" />
      {/* body */}
      <rect x="3" y="10" width="8" height="7" fill="#6366f1" />
      {/* arm + torch (animated) */}
      <g style={{ animation: 'factory-weld-arm 1s ease-in-out infinite' }}>
        <rect x="11" y="11" width="4" height="2" fill="#cdd6f4" />
        {/* torch */}
        <rect x="15" y="10" width="4" height="4" fill="#585b70" />
        <rect x="19" y="11" width="5" height="2" fill="#6c7086" />
      </g>
      {/* other arm */}
      <rect x="0" y="12" width="3" height="2" fill="#cdd6f4" />
      {/* sparks (animated) */}
      <g style={{ animation: 'factory-weld-sparks 0.3s linear infinite' }}>
        <rect x="22" y="9" width="1" height="1" fill="#f9e2af" />
        <rect x="24" y="11" width="1" height="1" fill="#f9e2af" />
        <rect x="23" y="13" width="1" height="1" fill="#f9e2af" />
        <rect x="21" y="14" width="1" height="1" fill="#f38ba8" />
        <rect x="25" y="10" width="1" height="1" fill="#f38ba8" />
      </g>
      {/* spark glow */}
      <rect x="20" y="10" width="4" height="4" fill="#f9e2af" opacity="0.15" style={{ animation: 'factory-weld-glow 0.3s linear infinite' }} />
      {/* workpiece (metal plate on stand) */}
      <rect x="24" y="8" width="6" height="10" fill="#6c7086" />
      <rect x="24" y="8" width="6" height="2" fill="#585b70" />
      <rect x="26" y="18" width="2" height="4" fill="#585b70" />
      {/* legs */}
      <rect x="3" y="17" width="2" height="4" fill="#4f46e5" />
      <rect x="7" y="17" width="2" height="4" fill="#4f46e5" />
      {/* boots */}
      <rect x="2" y="21" width="4" height="2" fill="#313244" />
      <rect x="6" y="21" width="4" height="2" fill="#313244" />
      {/* ground */}
      <rect x="0" y="23" width="36" height="2" fill="#313244" opacity="0.4" />
    </svg>
  )
}

function AnvilScene() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 36 28"
      width="72"
      height="56"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {/* head */}
      <rect x="3" y="2" width="6" height="5" fill="#cdd6f4" />
      {/* headband */}
      <rect x="3" y="3" width="6" height="1" fill="#f38ba8" />
      {/* eye */}
      <rect x="7" y="4" width="1" height="1" fill="#11111b" />
      {/* body (apron) */}
      <rect x="2" y="7" width="8" height="8" fill="#585b70" />
      <rect x="3" y="7" width="6" height="8" fill="#6c7086" />
      {/* arm holding hammer (animated strike) */}
      <g style={{ animation: 'factory-hammer-strike 0.6s ease-in-out infinite' }}>
        {/* upper arm */}
        <rect x="10" y="8" width="3" height="2" fill="#cdd6f4" />
        {/* hammer handle */}
        <rect x="12" y="4" width="2" height="6" fill="#a5b4fc" />
        {/* hammer head */}
        <rect x="10" y="2" width="6" height="3" fill="#818cf8" />
        <rect x="11" y="2" width="4" height="1" fill="#6366f1" />
      </g>
      {/* other arm */}
      <rect x="0" y="9" width="3" height="2" fill="#cdd6f4" />
      {/* impact sparks (synced with hammer) */}
      <g style={{ animation: 'factory-anvil-sparks 0.6s ease-in-out infinite' }}>
        <rect x="19" y="10" width="1" height="1" fill="#f9e2af" />
        <rect x="21" y="9" width="1" height="1" fill="#f9e2af" />
        <rect x="20" y="12" width="1" height="1" fill="#f9e2af" />
        <rect x="22" y="11" width="1" height="1" fill="#f38ba8" />
      </g>
      {/* workpiece on anvil */}
      <rect x="16" y="12" width="6" height="2" fill="#f9e2af" style={{ animation: 'factory-anvil-glow 0.6s ease-in-out infinite' }} />
      {/* anvil */}
      <rect x="14" y="14" width="12" height="3" fill="#585b70" />
      <rect x="15" y="14" width="10" height="1" fill="#6c7086" />
      <rect x="13" y="14" width="2" height="2" fill="#585b70" />
      <rect x="26" y="15" width="2" height="1" fill="#585b70" />
      {/* anvil base */}
      <rect x="16" y="17" width="8" height="4" fill="#313244" />
      <rect x="17" y="17" width="6" height="1" fill="#585b70" />
      {/* legs */}
      <rect x="3" y="15" width="2" height="4" fill="#4f46e5" />
      <rect x="7" y="15" width="2" height="4" fill="#4f46e5" />
      {/* boots */}
      <rect x="2" y="19" width="4" height="2" fill="#313244" />
      <rect x="6" y="19" width="4" height="2" fill="#313244" />
      {/* ground */}
      <rect x="0" y="21" width="36" height="2" fill="#313244" opacity="0.4" />
    </svg>
  )
}

const SCENE_COMPONENTS: Record<string, () => JSX.Element> = {
  worker: WorkerScene,
  forklift: ForkliftScene,
  conveyor: ConveyorScene,
  gears: GearsScene,
  welder: WelderScene,
  anvil: AnvilScene,
}

interface Props {
  className?: string
  slow?: boolean
}

export function FactoryAnimation({ className, slow }: Props) {
  const [scene] = useState<FactoryScene>(() => getRandomScene())
  const [statusText, setStatusText] = useState(() => getRandomStatusText())
  const SceneComponent = SCENE_COMPONENTS[scene.id]

  useEffect(() => {
    if (slow) return
    const interval = setInterval(() => {
      setStatusText(prev => {
        let next = getRandomStatusText()
        while (next === prev) next = getRandomStatusText()
        return next
      })
    }, 10000)
    return () => clearInterval(interval)
  }, [slow])

  const classes = [
    'inline-flex items-center gap-2 factory-animation',
    slow && 'factory-animation-slow',
    className,
  ].filter(Boolean).join(' ')

  return (
    <span
      className={classes}
      role="img"
      aria-label={scene.label}
    >
      <SceneComponent />
      <span
        className="text-sm text-muted italic"
        style={{ animation: 'factory-text-glow 2.5s ease-in-out infinite' }}
      >
        {slow ? 'Awaiting next instruction...' : statusText}
      </span>
    </span>
  )
}
