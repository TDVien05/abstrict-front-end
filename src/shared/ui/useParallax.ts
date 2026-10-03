import { useEffect, useRef } from 'react'

export function useParallax<T extends HTMLElement>(strength = 40) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduceQuery.matches) return

    let frame = 0

    const update = () => {
      frame = 0
      const rect = element.getBoundingClientRect()
      const viewport = window.innerHeight || 1
      const distance = rect.top + rect.height / 2 - viewport / 2
      element.style.setProperty('--parallax-y', `${((-distance / viewport) * strength).toFixed(2)}px`)
    }

    const schedule = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)

    const handlePreferenceChange = () => {
      if (reduceQuery.matches) {
        element.style.removeProperty('--parallax-y')
      } else {
        update()
      }
    }
    reduceQuery.addEventListener('change', handlePreferenceChange)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      reduceQuery.removeEventListener('change', handlePreferenceChange)
    }
  }, [strength])

  return ref
}
