'use client'

import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { Images } from '@/constants/images-import'
import { useTranslation } from '@/context/LanguageContext'

export default function Features() {
  const { t } = useTranslation()

  const features = [
    {
      image: Images.feature1,
      titleKey: 'features.feature1.title',
      descriptionKey: 'features.feature1.description'
    },
    {
      image: Images.feature2,
      titleKey: 'features.feature2.title',
      descriptionKey: 'features.feature2.description'
    },
    {
      image: Images.feature3,
      titleKey: 'features.feature3.title',
      descriptionKey: 'features.feature3.description'
    },
    {
      image: Images.feature4,
      titleKey: 'features.feature4.title',
      descriptionKey: 'features.feature4.description'
    },
    {
      image: Images.feature5,
      titleKey: 'features.feature5.title',
      descriptionKey: 'features.feature5.description'
    },
    {
      image: Images.feature6,
      titleKey: 'features.feature6.title',
      descriptionKey: 'features.feature6.description'
    }
  ]

  return (
    <Section background="white" spacing="lg" id=''>
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              variant="feature"
              image={feature.image}
              title={t(feature.titleKey)}
              description={t(feature.descriptionKey)}
            />
          ))}
        </div>
      </Container>
    </Section>
  )
}