'use client'

import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { useTranslation } from '@/context/LanguageContext'
import { useScrollToSection } from '@/hooks/useScrollPosition'
import { Images } from '@/constants/images-import'
import { Section } from '@/components/ui/Section'
import { useState } from 'react'
import BookingModal from '@/components/shared/BookingModal'
import { Icons } from '@/constants/icon-import'
import WaitlistModal from '@/components/shared/WaitListMoadal'

export function Hero() {
  const { t } = useTranslation()
  const scrollToSection = useScrollToSection(80)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isWaitModalOpen, setIsWaitModalOpen] = useState(false)
  return (
    <Section background="white" spacing="none" id='hero'
      className="relative min-h-screen mt-4 pt-0 sm:min-h-screen flex items-center overflow-hidden"
    >
      {/* Background Image avec gradient overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${Images.heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* espace gradiant pour l'effet blanc sur le hero */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-white/10 to-white/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-orange-500/20 via-transparent to-transparent" />
      </div>
      <Container className="relative z-10 mt-0">
        <div className="max-w-4xl mx-auto text-center ">
          <div className="flex justify-center mb-8 animate-fade-in">
            <Chip
              icon={<Icons.zapIcon />}
              iconPosition="left"
              variant="default"
              size="md"
              className="shadow-sm"
            >
              {t('hero.poweredBy')}
            </Chip>
          </div>
          <h1 className="text-3xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight animate-fade-in-up">
            {t('hero.title')}
          </h1>
          <p className="text-xl sm:text-2xl text-white mb-8 leading-relaxed animate-fade-in-up animation-delay-200">
            {t('hero.subtitle')} {t('hero.description')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up animation-delay-400">
            <Button
              variant="outline"
              size="lg"
              onClick={() => scrollToSection('pricing')}
              className="relative whitespace-nowrap   hover:shadow-xl transition-all duration-300 border-none outline-none  "
            >
              {t('hero.cta')}
            </Button>

            <Button
              variant="solid"
              size="lg"
              icon={<Icons.playIcon />}
              iconPosition="left"
              onClick={() => setIsModalOpen(true)}
              className="group   whitespace-nowrap transition-all duration-300"
            >
              {t('hero.demo')}
            </Button>
            <Button
              variant="solid"
              size="lg"
              icon={<Icons.fileListIcon />}
              iconPosition="left"
              onClick={() => setIsWaitModalOpen(true)}
              className="group   whitespace-nowrap transition-all duration-300"
            >
              {t('hero.waitlist')}
            </Button>
          </div>
        </div>
      </Container>
      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        logo={Images.logo}
      />
      <WaitlistModal
        isOpen={isWaitModalOpen}
        onClose={() => setIsWaitModalOpen(false)}
        logo={Images.logo}
      />
    </Section>
  )
}