import { ReactNode } from 'react';
import { Container } from './Container';

interface SectionProps {
  children: ReactNode;
  id: string
  className?: string;
  containerSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  background?: 'white' | 'gray' | 'dark' | 'transparent';
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
}

export function Section({
  id,
  children,
  className = '',
  containerSize = 'xl',
  background = 'white',
  spacing = 'lg',
  fullWidth = false
}: SectionProps) {
  const backgrounds = {
    white: 'bg-white',
    gray: 'bg-gray-50',
    dark: 'bg-secondaryBlack  text-white',
    transparent: 'bg-transparent'
  };

  const spacings = {
    none: '',
    sm: 'py-8 sm:py-12',
    md: 'py-12 sm:py-16',
    lg: 'py-16 sm:py-24',
    xl: 'py-24 sm:py-32'
  };

  return (
    <section id={id} className={`${backgrounds[background]} ${spacings[spacing]} ${className}`}>
      {fullWidth ? (
        children
      ) : (
        <Container size={containerSize}>
          {children}
        </Container>
      )}
    </section>
  );
}