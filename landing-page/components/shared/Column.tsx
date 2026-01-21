'use client'

import Link from 'next/link'
import { FooterColumn as FooterColumnType } from '@/constants/site-config'
import { useState } from 'react';
import { Icons } from '@/constants/icon-import';

interface FooterColumnProps {
  column: FooterColumnType
}

export function Column({ column }: FooterColumnProps) {
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleItem = (label: string) => {
    setOpenItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  return (
    <div>
      <h3 className="text-white font-semibold mb-4">{column.title}</h3>
      <ul className="space-y-2">
        {column.links.map((link) => {
          const isOpen = openItems.includes(link.label);
          const hasDescription = !!link.description || !!link.content;

          return (
            <li key={link.label}>
              {/* Si le lien a une description/content, afficher un accordion */}
              {hasDescription ? (
                <div className=" rounded-lg overflow-hidden">
                  {/* Header cliquable */}
                  <button
                    onClick={() => toggleItem(link.label)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-800 transition-colors"
                  >
                    <span className="text-gray-400 hover:text-white text-sm">
                      {link.label}
                    </span>
                    <Icons.ChevronDownIcon
                      size={16}
                      className={`text-gray-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                        }`}
                    />
                  </button>

                  {/* Contenu de l'accordion */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                  >
                    <div className="px-4 py-4 bg-gray-800/50 border-t border-gray-700">
                      {/* Si content personnalisé (ex: formulaire) */}
                      {link.content ? (
                        <div className="text-sm text-gray-300">
                          {link.content}
                        </div>
                      ) : (
                        /* Sinon, afficher la description */
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                          {link.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Sinon, afficher un lien normal (comme FAQ) */
                link.isExternal ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors duration-200 text-sm block px-4 py-3"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    href={link.href!}
                    className="text-gray-400 hover:text-white transition-colors duration-200 text-sm block px-4 py-3"
                  >
                    {link.label}
                  </Link>
                )
              )}
            </li>
          );
        })}
      </ul>
    </div>
  )
}