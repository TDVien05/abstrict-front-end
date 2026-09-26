import { useEffect, useRef, useState, type PropsWithChildren } from 'react'

interface RevealProps extends PropsWithChildren {
  className?: string
  delay?: number
}

export function Reveal({ children, className = '', delay = 0 }: RevealProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = elementRef.current

    if (!element || !('IntersectionObserver' in window)) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setIsVisible(true)
        observer.unobserve(entry.target)
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      className={`${className} transition-[opacity,transform] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transform-none motion-reduce:opacity-100 motion-reduce:transition-none ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      }`}
      ref={elementRef}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
