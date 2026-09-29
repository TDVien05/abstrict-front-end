import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'blue' | 'dark' | 'transparent'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  isLoading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-charcoal text-white hover:bg-black disabled:bg-slate-400',
  secondary: 'border border-brand-200 bg-white text-brand-700 hover:bg-brand-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  blue: 'bg-brand-blue-pastel text-brand-charcoal hover:bg-brand-blue-pastel-hover',
  dark: 'bg-brand-charcoal text-white hover:bg-black',
  transparent: 'bg-transparent text-brand-charcoal hover:bg-brand-blue-pastel',
}

export function Button({
  children,
  className = '',
  disabled,
  isLoading = false,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue-pastel-hover disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {isLoading ? 'Đang xử lý…' : children}
    </button>
  )
}
