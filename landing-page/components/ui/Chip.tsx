import { ReactNode } from 'react';

interface ChipProps {
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  children: string;
  variant?: 'default' | 'outline' | 'solid';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Chip({
  icon,
  iconPosition = 'left',
  children,
  variant = 'default',
  size = 'md',
  className = '',
}: ChipProps) {
  // Tailles
  const sizeClasses = {
    sm: 'px-3 py-1 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  // Variants
  const variantClasses = {
    default: 'bg-secondaryMain text-main',
    outline: 'bg-transparent border-2 border-main text-main',
    solid: 'bg-main text-white',
  };

  return (
    <div
      className={`
        inline-flex items-center
        rounded-full
        font-medium
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {icon && iconPosition === 'left' && (
        <span className="flex-shrink-0">{icon}</span>
      )}

      <span>{children}</span>

      {icon && iconPosition === 'right' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </div>
  );
}