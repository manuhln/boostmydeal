'use client'

import { useScrollToSection } from '@/hooks/useScrollPosition'
import { Button } from '@/components/ui/Button'
import { LanguageSelector } from './LanguageSelector'
import { NAVIGATION_ITEMS } from '@/constants/navigaton'
import { Images } from '@/constants/images-import'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from '@/context/LanguageContext'
import { Icons } from '@/constants/icon-import'
interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  activeSection: string
}

export function MobileMenu({ isOpen, onClose, activeSection }: MobileMenuProps) {
  const scrollToSection = useScrollToSection(80)
  const context = useTranslation()
  const t = typeof context === 'object' && 't' in context ? context.t : (key: string) => key

  const handleNavigationClick = (sectionId: string) => {
    scrollToSection(sectionId)
    // Fermer le menu après un court délai pour laisser le scroll commencer
    setTimeout(() => {
      onClose()
    }, 300)
  }

  return (
    <>
      {/* Overlay sombre */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden ${isOpen
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu slide from left */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-80 max-w-[85vw]  bg-white z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">

          {/* Header du menu avec bouton close */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <Link href="" className="flex items-center space-x-2">
                  <Image src={Images.logo} alt="logo" className="w-full h-full object-cover" width={20} height={20} />
                </Link>
              </div>

              <div className="flex items-center">
                <Link href="" className="flex items-center space-x-2">
                  <Image src={Images.logoText} alt="logoText" className="w-full h-full object-cover" width={300} height={300} />
                </Link>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label="Close menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto py-6">
            <div className="px-6 space-y-1">
              {NAVIGATION_ITEMS.map((item) => {
                const isActive = activeSection === item.sectionId

                return (
                  <button
                    key={item.sectionId}
                    onClick={() => handleNavigationClick(item.sectionId)}
                    className={`w-full text-left block px-4 py-3 rounded-lg text-base font-medium transition-colors ${isActive
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    {t(`header.${item.sectionId}`)}
                  </button>
                )
              })}
            </div>
          </nav>

          {/* Actions en bas du menu */}
          <div className="p-6 border-t border-gray-200 space-y-4">
            {/* Sélecteur de langue */}
            <div className="flex justify-center">
              <LanguageSelector />
            </div>

            {/* Boutons */}
            <div className="space-y-3">
              <Button
                variant="outline"
                fullWidth
                icon={<Icons.ArrowIcon />}
                iconPosition="right"
              >
                {t(`header.logIn`)}
              </Button>

              <Button
                variant="solid"
                fullWidth
                icon={<Icons.ArrowIcon />}
                iconPosition="right"
              >
                {t(`header.getStarted`)}
              </Button>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}