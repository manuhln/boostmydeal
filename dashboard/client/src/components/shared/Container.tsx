import { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Container({
  children,
  className = '',
  size = 'lg'
}: ContainerProps) {
  const sizes = {
    sm: 'max-w-3xl max-h-xl',
    md: 'max-w-5xl max-h-2xl',
    lg: 'max-w-7xl max-h-3xl',
    xl: 'max-w-[1440px] max-h-5-xl',
    full: 'max-w-full '
  };

  return (
    <div className={`w-full bg-card m-auto   px-4 sm:px-6 lg:px-8 ${sizes[size]} ${className}`}>
      {children}
    </div>
  );
}