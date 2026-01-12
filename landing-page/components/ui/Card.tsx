import { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface CardProps {
  // Type de card
  variant?: 'feature' | 'icon' | 'content' | 'custom';

  // Contenu visuel
  image?: string | ReactNode;
  icon?: ReactNode;

  // Contenu texte
  title?: string;
  description?: string;

  // Contenu personnalisé
  children?: ReactNode;

  // Style
  size?: 'sm' | 'md' | 'lg';

  // Interaction
  href?: string;
  onClick?: () => void;

  // Classes additionnelles
  className?: string;
}

export function Card({
  variant = 'custom',
  image,
  icon,
  title,
  description,
  children,
  size = 'md',
  href,
  onClick,
  className = '',
}: CardProps) {
  // Tailles pour icon variant
  const iconSizeClasses = {
    sm: 'w-14 h-14 p-3',
    md: 'w-20 h-20 p-4',
    lg: 'w-28 h-28 p-6',
  };

  // Padding selon le variant
  const paddingClasses = {
    feature: {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
    icon: iconSizeClasses,
    content: {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
    custom: {
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
  };

  // Classes de base
  const baseClasses = `
    bg-white
    border border-[#E64522]
    rounded-2xl
    transition-all
    duration-200
    ${onClick || href ? 'hover:shadow-lg hover:border-main cursor-pointer' : ''}
    ${className}
  `;

  // Variant Icon Card (petites cards avec juste une icône)
  if (variant === 'icon') {
    return (
      <div className={`${baseClasses} ${iconSizeClasses[size]} flex items-center justify-center`}>
        {icon}
      </div>
    );
  }

  // Variant Custom (avec children)
  if (variant === 'custom') {
    return (
      <div className={`${baseClasses} ${paddingClasses.custom[size]}`}>
        {children}
      </div>
    );
  }

  // Contenu pour variants feature et content
  const cardContent = (
    <>
      {/* Variant Feature - Image/Illustration en haut */}
      {variant === 'feature' && (
        <div className="flex items-center justify-center mb-6">
          {typeof image === 'string' ? (
            <Image
              src={image}
              alt={title || ''}
              width={400}
              height={300}
              className="w-full h-auto object-contain"
            />
          ) : (
            image
          )}
        </div>
      )}

      {/* Variant Content avec icône ronde */}
      {variant === 'content' && icon && (
        <div className=" ">
          <div className="w-12 h-12 mx-6 mt-6 rounded-full bg-main flex items-center justify-center text-white">
            {typeof icon === 'string' ? (
              <Image
                src={icon}
                alt={title || ''}
                width={400}
                height={300}
                className="w-full h-auto object-contain"
              />
            ) : (
              icon
            )}
          </div>
        </div>
      )}
      <div className={` ${paddingClasses[variant][size]}`}>
        {/* Titre */}
        {title && (
          <h3 className={`font-bold text-gray-900 mb-2 ${variant === 'feature' ? 'text-lg lg:text-xl' : 'text-base lg:text-lg'
            }`}>
            {title}
          </h3>
        )}

        {/* Description */}
        {description && (
          <p className={`text-gray-600 leading-relaxed ${variant === 'feature' ? 'text-sm' : 'text-xs lg:text-sm'
            }`}>
            {description}
          </p>
        )}
      </div>
      {/* Children optionnel */}
      {children}
    </>
  );

  const cardClasses = `${baseClasses}`;


  if (href) {
    return (
      <Link href={href} className={cardClasses}>
        {cardContent}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={`${cardClasses} text-left w-full`}>
        {cardContent}
      </button>
    );
  }

  // Sinon, simple div
  return (
    <div className={cardClasses}>
      {cardContent}
    </div>
  );
}