'use client'

import { useState, useEffect } from 'react'
import { Navigation } from './Navigation'
import { MobileMenu } from './MobileMenu'
import { LanguageSelector } from './LanguageSelector'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import Image from 'next/image'
import { Icons } from '@/constants/icon-import'
import { Images } from '@/constants/images-import'
import { SECTION_IDS } from '@/constants/navigaton'
import { useActiveSection } from '@/hooks/useActiveSection'
import { useTranslation } from '@/context/LanguageContext'
import { Section } from '../ui/Section'



function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const activeSection = useActiveSection(SECTION_IDS, 100)
  const context = useTranslation()
  const t = typeof context === 'object' && 't' in context ? context.t : (key: string) => key

  // Détection du scroll pour l'effet
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Bloquer le scroll quand le menu mobile est ouvert
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 bg-[#FEFBFF]  transition-all  w-screen  duration-300 ${isScrolled
          ? ' py-3'
          : ' py-4'
          }`}
      >
        <Section id='' spacing='none' >
          <div className='flex space-x-4 items-center justify-center w-full'>
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <Image src={Images.logo} alt="logo" className="w-full h-full object-cover" width={20} height={20} />
              </Link>
            </div>

            <div className="flex items-center justify-between bg-white w-full rounded-xl shadow-lg/30 p-4 space-x-4 ">
              {/* Logo text  */}
              <div className="flex items-center">
                <Link href="/" className="flex items-center space-x-2">
                  <Image src={Images.logoText} alt="logoText" className="w-full h-full object-cover" width={100} height={100} />
                </Link>
              </div>
              <div className="hidden xl:flex w-1/2">
                <Navigation activeSection={activeSection} />
              </div>
              <div className="hidden xl:flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="md"
                  icon={<Icons.ArrowIcon />}
                  iconPosition="right"
                >
                  {t(`header.logIn`)}
                </Button>

                <Button
                  variant="solid"
                  size="md"
                  icon={<Icons.ArrowIcon />}
                  iconPosition="right"
                >
                  {t(`header.getStarted`)}
                </Button>

                <LanguageSelector />
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="xl:hidden p-2 text-gray-700 hover:text-gray-900 focus:outline-none"
                aria-label="Open menu"
              >
                <Icons.HamburgerMenu />
              </button>

            </div>
          </div>
        </Section>
      </header>
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeSection={activeSection}
      />
    </>
  )
}



export default Header