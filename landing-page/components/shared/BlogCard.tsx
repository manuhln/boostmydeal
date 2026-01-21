import Image from 'next/image';
import Link from 'next/link';

interface BlogCardProps {
  image: string;
  title: string;
  description: string;
  link?: string;
  linkText?: string;
  className?: string;
}

export function BlogCard({
  image,
  title,
  description,
  link = '#',
  linkText = 'read more',
  className = '',
}: BlogCardProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row gap-4 border border-gray-200 p-3 sm:p-4 rounded-2xl items-start sm:items-center hover:shadow-md transition-shadow ${className}`}
    >

      <div className="relative w-full sm:w-48 md:w-56 lg:w-64 aspect-video sm:aspect-[4/3] flex-shrink-0 overflow-hidden rounded-lg">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 200px, 250px"
          className="object-cover"
        />
      </div>

      {/* Contenu */}
      <div className="flex-1 flex flex-col gap-2">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug line-clamp-2">
          {title}
        </h3>

        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 sm:line-clamp-3">
          {description}
        </p>

        <Link
          href={link}
          className="inline-block text-sm font-medium text-main hover:text-main/80 transition-colors mt-1"
        >
          {linkText} →
        </Link>
      </div>
    </div>
  );
}