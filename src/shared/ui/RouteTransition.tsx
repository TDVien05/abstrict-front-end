import type { ReactNode } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'

export function RouteTransition({ children }: { children?: ReactNode }) {
  const location = useLocation()
  const outlet = useOutlet()

  return (
    <div className="route-transition" key={location.pathname}>
      {children ?? outlet}
    </div>
  )
}
