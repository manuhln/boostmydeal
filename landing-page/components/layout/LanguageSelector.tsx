'use client'

import { Icons } from '@/constants/icon-import'
import { languages } from '@/constants/site-config'
import { useTranslation } from '@/context/LanguageContext'
import { Locale } from '@/types/Index'
import { useState, useRef, useEffect } from 'react'



export function LanguageSelector() {
  const { locale, setLocale } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Obtenir la langue actuelle
  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0]

  // Fermer le dropdown si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLanguageChange = (languageCode: Locale) => {
    setLocale(languageCode)
    setIsOpen(false)
  }


  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-main focus:ring-offset-2"
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <Icons.WorldIcon />
        <span>{currentLanguage.code.toUpperCase()}</span>
        <Icons.ChevronDownIcon />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code as Locale)}
              className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${locale === language.code
                ? 'bg-orange-50 text-orange-600 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
                }`}
            >
              <span className="text-lg">{language.flag}</span>
              <span>{language.label}</span>


            </button>
          ))}
        </div>
      )}
    </div>
  )
}