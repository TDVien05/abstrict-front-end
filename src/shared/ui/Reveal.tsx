import { useEffect, useRef, useState, type CSSProperties, type PropsWithChildren } from 'react'

type RevealVariant = 'up' | 'soft' | 'left' | 'right' | 'scale' | 'blur'

interface RevealProps extends PropsWithChildren {
  className?: string
  delay?: number
  variant?: RevealVariant
  stagger?: boolean
}

export function Reveal({ children, className = '', delay = 0, variant = 'up', stagger = false }: RevealProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = elementRef.current

    if (!element || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setIsVisible(true)
        observer.unobserve(entry.target)
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.1 },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      className={className}
      data-reveal={stagger ? undefined : variant}
      data-reveal-stagger={stagger ? 'true' : undefined}
      data-visible={isVisible ? 'true' : 'false'}
      ref={elementRef}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  )
}
