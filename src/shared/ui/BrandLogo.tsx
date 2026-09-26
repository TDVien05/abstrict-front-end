import logoUrl from '../assets/abstrict-logo.png'

interface BrandLogoProps {
  size?: 'sm' | 'md'
  showName?: boolean
}

const dimensions = {
  sm: { frame: 'h-8 w-8 rounded-lg', image: 'left-[-18px] top-[-6px] w-16' },
  md: { frame: 'h-10 w-10 rounded-xl', image: 'left-[-23px] top-[-8px] w-20' },
}

export function BrandLogo({ showName = true, size = 'md' }: BrandLogoProps) {
  const styles = dimensions[size]

  return (
    <span className="inline-flex items-center gap-3.5">
      <span className={`relative block shrink-0 overflow-hidden ${styles.frame}`}>
        <img alt="" aria-hidden="true" className={`absolute max-w-none ${styles.image}`} src={logoUrl} />
      </span>
      {showName ? (
        <span className={`${size === 'md' ? 'text-xl' : 'text-lg'} font-bold tracking-tight text-brand-charcoal`}>
          ABSTRICT
        </span>
      ) : null}
    </span>
  )
}
