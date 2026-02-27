'use client'

import { Icons } from '@/constants/icon-import'
import { SOCIAL_LINKS } from '@/constants/site-config'

const iconMap = {
  facebook: Icons.facebook,
  instagram: Icons.instagram,
  twitter: Icons.twitter,
  linkedin: Icons.linkedin
}


export function SocialLinks() {
  return (
    <div className="flex gap-3">
      {SOCIAL_LINKS.map((social) => {
        const Icon = iconMap[social.icon as keyof typeof iconMap]

        return (
          <a
            key={social.name}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.name}
            className='w-full'
          >
            {Icon && <Icon className='text-white border border-white  rounded-lg text-3xl h-auto w-auto p-2 ' />}
          </a>
        )
      })}
    </div>
  )
}