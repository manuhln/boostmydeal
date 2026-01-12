'use client'

import Link from 'next/link'
import { FooterColumn as FooterColumnType } from '@/constants/site-config'

interface FooterColumnProps {
  column: FooterColumnType
}

export function Column({ column }: FooterColumnProps) {
  return (
    <div>
      <h3 className="text-white font-semibold mb-4">{column.title}</h3>
      <ul className="space-y-3">
        {column.links.map((link) => (
          <li key={link.label}>
            {link.isExternal ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}