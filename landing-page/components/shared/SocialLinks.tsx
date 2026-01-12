'use client'

import { Icons } from '@/constants/icon-import'
import { SOCIAL_LINKS } from '@/constants/site-config'
import Image from 'next/image'

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
          >
            {Icon && <Image src={Icon} width={200} height={200} alt='social' />}
          </a>
        )
      })}
    </div>
  )
}