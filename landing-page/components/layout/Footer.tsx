'use client'

import Link from 'next/link'
import { Container } from '@/components/ui/Container'


import { useTranslation } from '@/context/LanguageContext'
import { NewsletterForm } from '../shared/NewsletterForm'
import { SocialLinks } from '../shared/SocialLinks'
import { Column } from '../shared/Column'
import { COMPANY_TAGLINE, FOOTER_COLUMNS } from '@/constants/site-config'
import Image from 'next/image'
import { Images } from '@/constants/images-import'

export function Footer() {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gradient-to-tr  from-secondaryBlack from-80% to-gray-500 relative">

      <Container>
        {/* Section principale du footer */}
        <div className="py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

            {/* Colonne Branding + Newsletter */}
            <div className="lg:col-span-4">
              {/* Logo */}
              <div className="flex items-center space-x-2 mb-4">
                <Image src={Images.FooterLogo} alt='' width={200} height={200} />
              </div>

              {/* Tagline */}
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                {COMPANY_TAGLINE}
              </p>

              {/* Newsletter Form */}
              <NewsletterForm />
            </div>

            {/* Colonnes de liens */}
            <div className="lg:col-span-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                {FOOTER_COLUMNS.map((column) => (
                  <Column key={column.title} column={column} />
                ))}
              </div>
            </div>

            {/* Colonne Social Media */}
            <div className="lg:col-span-2">
              <h3 className="text-white font-semibold mb-4">Social Media</h3>
              <SocialLinks />
            </div>

          </div>
        </div>

        {/* Barre du bas - Copyright et liens légaux */}
        <div className="border-t border-gray-800 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">

            {/* Privacy Policy */}
            <Link
              href="/privacy"
              className="text-gray-400 hover:text-white transition-colors"
            >
              {t('footer.privacy')}
            </Link>

            {/* Copyright */}
            <p className="text-gray-500">
              {t('footer.copyright').replace('2024', currentYear.toString())}
            </p>

            {/* Terms of Service */}
            <Link
              href="/terms"
              className="text-gray-400 hover:text-white transition-colors"
            >
              {t('footer.terms')}
            </Link>

          </div>
        </div>
      </Container>
    </footer>
  )
}