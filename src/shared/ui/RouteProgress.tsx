import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

const RUN_DURATION_MS = 780

export function RouteProgress() {
  const location = useLocation()
  const previousKey = useRef(location.key)
  const [runKey, setRunKey] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (previousKey.current === location.key) return
    previousKey.current = location.key

    setIsRunning(true)
    setRunKey((key) => key + 1)
    const timer = window.setTimeout(() => setIsRunning(false), RUN_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [location.key])

  if (!isRunning) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]">
      <div className="route-progress-bar h-full" key={runKey} />
    </div>
  )
}
