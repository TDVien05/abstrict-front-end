import { useRef, type PointerEvent, type PropsWithChildren } from 'react'

interface SpotlightProps extends PropsWithChildren {
  className?: string
}

export function Spotlight({ children, className = '' }: SpotlightProps) {
  const elementRef = useRef<HTMLDivElement>(null)

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const element = elementRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    element.style.setProperty('--spot-x', `${event.clientX - rect.left}px`)
    element.style.setProperty('--spot-y', `${event.clientY - rect.top}px`)
  }

  return (
    <div className={`spotlight ${className}`} onPointerMove={handlePointerMove} ref={elementRef}>
      {children}
    </div>
  )
}
