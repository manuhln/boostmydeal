import Image from 'next/image';
interface IconBoxProps {
  icon: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function IconBox({
  icon,
  size = 'md',
  className = '',
}: IconBoxProps) {
  // Tailles du conteneur
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        bg-white
        rounded-2xl
        shadow-sm
        border-8 border-gray-200
        flex items-center justify-center
        text-main
        ${className}
      `}
    >
      <Image src={icon}
        alt='icon'
        width={40}
        height={40}
        className=" " />
    </div>
  );
}