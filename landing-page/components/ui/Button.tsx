import { ButtonHTMLAttributes, ReactNode } from 'react'

// Types pour les variants et tailles
type ButtonVariant = 'solid' | 'outline' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'
type IconPosition = 'left' | 'right'

// Interface des props du Button
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconPosition?: IconPosition
  isLoading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  className?: string
}

const LoadingSpinner = () => (
  <svg
    className="animate-spin h-4 w-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
)

export function Button({
  children,
  variant = 'solid',
  size = 'md',
  icon,
  iconPosition = 'right',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  ...props
}: ButtonProps) {

  // Classes de base communes à tous les boutons
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  // Classes selon le variant
  const variantClasses = {
    solid: ' text-white bg-main  hover:bg-orange-500 focus:ring-orange-500 active:bg-orange-800 ',
    outline: 'border-2 border-main text-main bg-white hover:bg-white focus:ring-main active:bg-main',
    ghost: 'text-gray-700 bg-transparent hover:bg-gray-100 focus:ring-gray-500'
  }

  // Classes selon la taille
  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5 gap-1.5',
    md: 'text-base px-5 py-2.5 gap-2',
    lg: 'text-lg px-6 py-3 gap-2.5'
  }

  // Classe pour fullWidth
  const widthClass = fullWidth ? 'w-full' : ''

  // Combiner toutes les classes
  const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`

  // Icône de loading (spinner)

  // Déterminer quelle icône afficher
  const displayIcon = isLoading ? <LoadingSpinner /> : icon

  return (
    <button
      className={buttonClasses}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* Icône à gauche */}
      {displayIcon && iconPosition === 'left' && displayIcon}

      {/* Texte du bouton */}
      {children}

      {/* Icône à droite */}
      {displayIcon && iconPosition === 'right' && displayIcon}
    </button>
  )
}