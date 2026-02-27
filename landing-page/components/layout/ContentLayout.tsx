import { ReactNode } from 'react';
import { Chip } from '../ui/Chip';
import Image from 'next/image';

interface ContentLayoutProps {
  // Layout type
  layout?: 'two-column' | 'centered';

  // Position de l'image (pour two-column seulement)
  imagePosition?: 'left' | 'right';

  // Image (optionnelle)
  image?: ReactNode;

  // Contenu texte
  chip?: {
    icon?: ReactNode;
    text: string;
    variant?: 'default' | 'outline' | 'solid';
  };
  title: string;
  description?: string;

  // Contenu additionnel
  children?: ReactNode;

  // Style
  spacing?: 'sm' | 'md' | 'lg';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  darkMode?: boolean;

  // Classes
  className?: string;
}

export function ContentLayout({
  layout = 'two-column',
  imagePosition = 'left',
  image,
  chip,
  title,
  description,
  children,
  spacing = 'md',
  maxWidth = 'lg',
  darkMode = false,
  className = '',
}: ContentLayoutProps) {
  // Espacement entre image et contenu (two-column)
  const spacingClasses = {
    sm: 'gap-12 lg:gap-16',
    md: 'gap-16 lg:gap-24',
    lg: 'gap-20 lg:gap-32',
  };

  // Largeur max pour le contenu centré
  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-5xl',
    xl: 'max-w-6xl',
    full: 'max-w-full',
  };

  // Classes de couleur selon le mode
  const textColorClasses = darkMode ? 'text-white' : 'text-gray-900';
  const descriptionColorClasses = darkMode ? 'text-gray-300' : 'text-gray-600';

  // Layout Centered
  if (layout === 'centered') {
    return (
      <div className={`${maxWidthClasses[maxWidth]} mx-auto text-center  ${className}`}>
        {/* Chip centré */}
        {chip && (
          <div className="flex justify-center mb-6">
            <Chip icon={chip.icon} variant={chip.variant}>
              {chip.text}
            </Chip>
          </div>
        )}

        {/* Titre centré */}
        <h2 className={`text-3xl lg:text-4xl font-semibold ${textColorClasses} mb-4 leading-tight`}>
          {title}
        </h2>

        {/* Description centrée */}
        {description && (
          <p className={`text-base lg:text-lg ${descriptionColorClasses} leading-relaxed mb-8`}>
            {description}
          </p>
        )}

        {/* Contenu additionnel centré */}
        {children && <div className="mt-8">{children}</div>}
      </div>
    );
  }

  // Layout Two-Column (défaut)
  const imageOrderClass = imagePosition === 'right' ? 'lg:order-2' : 'lg:order-1';
  const contentOrderClass = imagePosition === 'right' ? 'lg:order-1' : 'lg:order-2';

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 items-center ${spacingClasses[spacing]} ${className}`}>
      {/* Section Image */}
      {image && (
        <div className={`flex items-center justify-center ${imageOrderClass}`}>
          {typeof image === 'string' ? (
            <Image src={image} alt="img" width={500} height={500} />
          ) : (
            image
          )}
        </div>
      )}

      {/* Section Contenu */}
      <div className={`${contentOrderClass}`}>
        {/* Chip */}
        {chip && (
          <div className="mb-4">
            <Chip icon={chip.icon} variant={chip.variant}>
              {chip.text}
            </Chip>
          </div>
        )}

        {/* Titre */}
        <h2 className={`text-2xl lg:text-4xl font-semibold ${textColorClasses} mb-3 leading-snug`}>
          {title}
        </h2>

        {/* Description */}
        {description && (
          <p className={`text-sm lg:text-base ${descriptionColorClasses} leading-relaxed`}>
            {description}
          </p>
        )}

        {/* Contenu additionnel */}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}