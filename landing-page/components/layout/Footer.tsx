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
    <footer className=" relative">
      <section className="bg-gray-50 py-12 md:py-16">
        <Container>
          <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8 lg:gap-12">
            {/* Left side - Text content */}
            <div className="flex-1 max-w-xl">
              <h2 className="text-lg sm:text-4xl  font-semibold text-gray-900 mb-4 leading-tight">
                Start Closing More Deals With AI Today
              </h2>
              <p className="text-sm sm:text-md text-gray-600 leading-relaxed">
                Be the first to know about releases and industry news and insights.
              </p>
            </div>

            {/* Right side - Newsletter Form */}
            <div className="w-full lg:w-auto lg:flex-shrink-0 hidden lg:block ">
              <NewsletterForm className='flex p-2 bg-gray-500/50 gap-2 text-white placeholder-gray-500 rounded-xl border-none border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent' />
              <span className='hidden lg:block'>We care about your data in our privacy policy.</span>
            </div>
          </div>
        </Container>
      </section>
      <div className='bg-gradient-to-tr  from-secondaryBlack from-80% to-gray-500'>
        <Container>
          {/* Section principale du footer */}
          <div className="py-12 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

              {/* Colonne Branding + Newsletter */}
              <div className="lg:col-span-4">
                {/* Logo */}
                <div className="flex items-center space-x-2 mb-4">
                  <Image src={Images.logoWhite} alt='' width={20} height={20} />
                  <Image src={Images.logoTextWhite} alt='' width={200} height={200} />

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
      </div>
    </footer>
  )
}