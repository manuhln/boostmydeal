'use client'

import { ContentLayout } from '@/components/layout/ContentLayout'
import { Card } from '@/components/ui/Card'
import { Container } from '@/components/ui/Container'
import { Icons } from '@/constants/icon-import'
import { useTranslation } from '@/context/LanguageContext'
import Image from 'next/image'
import { industries, steps } from './industryConstant'
import { IconBox } from '@/components/ui/IconBox'
import { Section } from '@/components/ui/Section'

export default function IndustryCase() {
  const { t } = useTranslation()

  return (
    <Section background="white" spacing="lg" id=''>
      <Container className='mb-40'>
        <ContentLayout imagePosition="right"
          layout='centered'
          chip={{
            icon: <Image src={Icons.industryIcon} alt='iconInt' width={15} height={10} />,
            text: t('industryCase.chipLabel'),
            variant: "default"
          }}
          title={t('industryCase.title')}
        />
        <div className="flex flex-wrap items-start justify-center gap-6 lg:gap-8">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-4 lg:gap-6">
              <div className="flex flex-col items-center">
                <IconBox icon={step.icon} size="lg" />
                <div className="text-center mt-4 max-w-[120px]">
                  <p className="text-sm font-normal text-gray-900">
                    {t(step.labelKey)}{' '}
                    <span className="font-bold">{t(step.sublabelKey)}</span>
                  </p>
                </div>
              </div>
              <div className='hidden lg:block'>
                {/* Flèche (sauf après le dernier élément) */}
                {index < steps.length - 1 && (
                  <Icons.ArrowRightIcon
                    className="text-main text-3xl mt-8 flex-shrink-0"
                    size={24}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </Container>
      <Container>
        {/* Header Section - Centré */}
        <ContentLayout imagePosition="right"
          layout='centered'
          chip={{
            icon: <Image src={Icons.industryIcon} alt='iconInt' width={15} height={10} />,
            text: t('highPerformance.chipLabel'),
            variant: "default"
          }}
          title={t('highPerformance.title')}
          description={t('highPerformance.description')}
        />

        {/* Grid des cartes industries */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {industries.map((industry, index) => (
            <Card
              key={index}
              variant="content"
              icon={industry.icon}
              title={t(industry.titleKey)}
              description={t(industry.descriptionKey)}
              className=' border-gray-200  '
            />
          ))}
        </div>
      </Container>
    </Section>
  )
}