'use client'

import { useState } from 'react'
import { Images } from '@/constants/images-import'
import { useTranslation } from '@/context/LanguageContext'
import Image from 'next/image'
import { VideoPlayers } from '@/components/shared/VideoPlayers'
import { Section } from '@/components/ui/Section'


// Icône Play
const PlayIcon = () => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 64 64"
    fill="none"
  >
    <circle
      cx="32"
      cy="32"
      r="32"
      fill="white"
      fillOpacity="0.9"
    />
    <path
      d="M26 20L44 32L26 44V20Z"
      fill="#EA580C"
    />
  </svg>
)

// Configuration des partenaires
const PARTNERS = [
  { name: 'Partner 1', logo: Images.partner1 },
  { name: 'Partner 2', logo: Images.partner2 },
  { name: 'Partner 3', logo: Images.partner3 },
  { name: 'Partner 4', logo: Images.partner4 },
  { name: 'Partner 5', logo: Images.partner5 },
  { name: 'Partner 6', logo: Images.partner6 },
  { name: 'Partner 7', logo: Images.partner7 },
  { name: 'Partner 8', logo: Images.partner8 }
]

export function Partners() {
  const { t } = useTranslation()
  const [isVideoOpen, setIsVideoOpen] = useState(false)

  // URL de la vidéo (YouTube, Vimeo, etc.)
  // Pour l'instant vide, à remplacer par ton URL vidéo
  const videoUrl = "https://voxsun.com/images/BoostMyDeal.mov"

  return (
    <Section background="white" spacing="lg" id=''>
      {/* Video Container - Chevauchement avec section précédente */}
      <div className="relative -mt-28 lg:-mt-38 mb-16">
        <button
          onClick={() => setIsVideoOpen(true)}
          className="relative w-full max-w-4xl mx-auto block group focus:outline-none focus:ring-4 focus:ring-orange-500 focus:ring-offset-4 rounded-2xl"
        >
          {/* Container avec ombre et coins arrondis */}
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 group-hover:shadow-3xl group-hover:-translate-y-2">

            {/* Aspect ratio 16:9 */}
            <div className="relative" style={{ paddingBottom: '56.25%' }}>
              {/* Thumbnail ou placeholder */}
              <div className="absolute inset-0  flex items-center justify-center">

                {/* Icône Play centrée */}
                <div className="relative">
                  <div className="absolute inset-0 bg-orange-500 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                  <div className="relative transform group-hover:scale-110 transition-transform duration-300">
                    <PlayIcon />
                  </div>
                </div>
              </div>

              <video
                className="absolute inset-0 w-full h-full object-cover"
                src="https://voxsun.com/images/BoostMyDeal.mov"
                autoPlay
                muted
                loop
                playsInline
                controls={false}
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Texte sous la vidéo */}
            <div className="absolute bottom-0 left-0 right-0 p-6 to-transparent">
              <p className="text-gray-900 text-center text-sm sm:text-base font-medium">
                {t('partners.videoCaption')}
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Section Logos Partenaires */}
      <div className="text-center">
        {/* Titre "Trusted by..." */}
        <p className="text-gray-500 text-sm sm:text-base font-medium mb-8">
          {t('partners.trustedBy')}
        </p>

        {/* Grille de logos */}
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {PARTNERS.map((partner, index) => (
            <div
              key={index}
              className="  transition-all duration-300"
            >
              <Image
                src={partner.logo}
                alt={partner.name}
                className="h-8 sm:h-10 w-auto object-contain"
                loading="lazy"
                width={100}
                height={100}
              />
            </div>
          ))}
        </div>
      </div>


      {/* Video Modal */}
      <VideoPlayers
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        videoUrl={videoUrl}
      />
    </Section>
  )
}