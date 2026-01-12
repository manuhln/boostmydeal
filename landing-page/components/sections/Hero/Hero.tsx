'use client'

import { Container } from '@/components/ui/Container'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { useTranslation } from '@/context/LanguageContext'
import { useScrollToSection } from '@/hooks/useScrollPosition'
import { Images } from '@/constants/images-import'
import { Section } from '@/components/ui/Section'


// Icône Zap (éclair)
const ZapIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

// Icône Play (pour le bouton démo)
const PlayIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
  </svg>
)

export function Hero() {
  const { t } = useTranslation()
  const scrollToSection = useScrollToSection(80)

  return (
    <Section background="white" spacing="lg" id='hero'
      className="relative min-h-screen flex items-center overflow-hidden"
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
        {/* Overlay avec gradient blanc qui se dissipe */}
        {/* <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/20 to-white/30" /> */}

        {/* Effet de dégradé orange depuis le bas */}
        {/* <div className="absolute inset-0 bg-gradient-to-t from-orange-500/20 via-transparent to-transparent" /> */}
      </div>

      {/* Contenu */}
      <Container className="relative z-10">
        <div className="max-w-4xl mx-auto text-center py-20 sm:py-32">

          {/* Badge "Powered by" */}
          <div className="flex justify-center mb-8 animate-fade-in">
            <Chip
              icon={<ZapIcon />}
              iconPosition="left"
              variant="default"
              size="md"
              className="shadow-sm"
            >
              {t('hero.poweredBy')}
            </Chip>
          </div>

          {/* Titre principal */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight animate-fade-in-up">
            {t('hero.title')}
          </h1>

          {/* Sous-titre */}
          <p className="text-xl sm:text-2xl text-white mb-8 leading-relaxed animate-fade-in-up animation-delay-200">
            {t('hero.subtitle')} {t('hero.description')}
          </p>

          {/* Description */}
          {/* <p className="text-base sm:text-lg text-gray-500 mb-12 max-w-2xl mx-auto animate-fade-in-up animation-delay-300">
            {t('hero.description')}
          </p> */}

          {/* Boutons CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up animation-delay-400">

            {/* Bouton principal avec effet brillant */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => scrollToSection('pricing')}
              className="relative overflow-hidden drop-shadow-white drop-shadow-lg hover:shadow-xl transition-all duration-300 border-none outline-none  "
            >

              Start Automating Your Sales Pipeline

            </Button>

            {/* Bouton secondaire avec icône play */}
            <Button
              variant="solid"
              size="lg"
              icon={<PlayIcon />}
              iconPosition="left"
              className="group drop-shadow-white drop-shadow-lg  transition-all duration-300"
            >
              Book a Live Demo
            </Button>
          </div>



        </div>
      </Container>
    </Section>
  )
}