'use client'

import { ContentLayout } from '@/components/layout/ContentLayout'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { Icons } from '@/constants/icon-import'
import { Images } from '@/constants/images-import'
import { useTranslation } from '@/context/LanguageContext'
import Image from 'next/image'


export default function Product() {
  const { t } = useTranslation()

  return (
    <Section background="white" spacing="sm" id='product'>
      <Container>
        <ContentLayout
          imagePosition="right"
          image={Images.proof}
          chip={{
            icon: <Icons.BookOpenIcon className='text-xl font-bold' />,
            text: t('socialProof.chipLabel'),
            variant: "default"
          }}
          title={t('socialProof.title')}
          description={t('socialProof.description')}
          className="bg-white"
        />
      </Container>
      <Container className='mt-10'>
        <ContentLayout
          imagePosition="left"
          image={Images.pain}
          chip={{
            icon: <Image src={Icons.cloudIndo} alt="icon" width={15} height={150} />,
            text: t('customerPain.chipLabel'),
            variant: "default"
          }}
          title={t('customerPain.title')}
          description={t('customerPain.description')}
          className="bg-white"
        />
      </Container>
    </Section>
  )
}
