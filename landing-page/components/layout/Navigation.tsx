'use client'

import { NAVIGATION_ITEMS } from "@/constants/navigaton"
import { useTranslation } from "@/context/LanguageContext"
import { useScrollToSection } from "@/hooks/useScrollPosition"

interface NavigationProps {
  activeSection: string
}


export function Navigation({ activeSection }: NavigationProps) {
  const scrollToSection = useScrollToSection(80) // 80px d'offset pour le header fixe
  const context = useTranslation()
  const t = typeof context === 'object' && 't' in context ? context.t : (key: string) => key
  return (
    <nav className="flex items-center justify-between w-full">
      {NAVIGATION_ITEMS.map((item) => {
        const isActive = activeSection === item.sectionId

        return (
          <button
            key={item.sectionId}
            onClick={() => scrollToSection(item.sectionId)}
            className={`text-xl font-medium transition-colors relative py-2 ${isActive
              ? 'text-orange-600'
              : 'text-gray-700 hover:text-gray-900'
              }`}
          >
            {t(`header.${item.sectionId}`)}
            {/* Indicateur actif - petite barre en dessous */}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600" />
            )}
          </button>
        )
      })}
    </nav>
  )
}