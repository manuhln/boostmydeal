'use client'

import { ContentLayout } from '@/components/layout/ContentLayout'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { Icons } from '@/constants/icon-import'
import { Images } from '@/constants/images-import'
import { useTranslation } from '@/context/LanguageContext'
import Image from 'next/image'

export default function Solution() {
  const { t } = useTranslation()

  return (
    <Section background="dark" spacing="sm" id='solutions'>
      <Container>
        <ContentLayout
          imagePosition="right"
          image={Images.solu}
          chip={{
            icon: <Icons.ComputerLineIcon className='text-xl font-bold' />,
            text: t('solution.chipLabel'),
            variant: "default"
          }}
          title={t('solution.title')}
          description={t('solution.description')}
          darkMode={true}  // Active le mode sombre
        />
      </Container>

      <div className="">
        <Image
          src={Images.solubg}
          alt='solution background'
          width={1440}
          height={500}
          className="w-full h-auto"
        />
      </div>
    </Section>
  )
}