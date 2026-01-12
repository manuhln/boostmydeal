import React, { useState } from 'react';
import Image from 'next/image';


interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'main' | 'secondary' | 'success' | 'info' | 'warning';
  withBorder?: boolean;
  className?: string;
}

export function Avatar({
  src,
  alt,
  name,
  size = 'md',
  variant = 'main',
  withBorder = false,
  className = '',
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Générer les initiales depuis le nom
  const getInitials = (fullName: string): string => {
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // Tailles en pixels
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };



  // Couleurs de fond pour les initiales
  const variantClasses = {
    main: 'bg-main text-white',
    secondary: 'bg-gray-600 text-white',
    success: 'bg-green-600 text-white',
    info: 'bg-blue-600 text-white',
    warning: 'bg-yellow-600 text-white',
  };

  // Classes communes
  const baseClasses = `
    ${sizeClasses[size]}
    rounded-full
    flex items-center justify-center
    overflow-hidden
    font-semibold
    ${withBorder ? 'ring-2 ring-white ring-offset-2' : ''}
    ${className}
  `;

  // Déterminer quoi afficher
  const shouldShowImage = src && !imageError;
  const shouldShowInitials = !shouldShowImage && name;

  return (
    <div className={`${baseClasses} ${!shouldShowImage ? variantClasses[variant] : ''}`}>
      {/* Cas 1 : Afficher l'image */}
      {shouldShowImage && (
        <Image
          src={src}
          alt={alt || name || 'Avatar'}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      )}

      {/* Cas 2 : Afficher les initiales */}
      {shouldShowInitials && (
        <span className="select-none">
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}
