'use client';

import { ContentLayout } from '@/components/layout/ContentLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PricingCard } from '@/components/shared/PricingCard';
import { Section } from '@/components/ui/Section';
import { Toggle } from '@/components/ui/Toggle';
import { Icons } from '@/constants/icon-import';
import { useTranslation } from '@/context/LanguageContext';
import Image from 'next/image';
import { useState } from 'react';

export function Plans() {
  const { t } = useTranslation();
  const [billingPeriod, setBillingPeriod] = useState<'Monthly' | 'Yearly'>('Monthly');

  const pricingPlans = [
    {
      nameKey: 'pricing.plans.starter.name',
      subtitleKey: 'pricing.plans.starter.subtitle',
      descriptionKey: 'pricing.plans.starter.description',
      price: billingPeriod === 'Monthly' ? 199 : 1990,
      featuresKeys: [
        'pricing.plans.starter.features.0',
        'pricing.plans.starter.features.1',
        'pricing.plans.starter.features.2',
        'pricing.plans.starter.features.3',
      ],
      overageKey: 'pricing.plans.starter.overage',
    },
    {
      nameKey: 'pricing.plans.growth.name',
      subtitleKey: 'pricing.plans.growth.subtitle',
      descriptionKey: 'pricing.plans.growth.description',
      price: billingPeriod === 'Monthly' ? 499 : 4990,
      featuresKeys: [
        'pricing.plans.growth.features.0',
        'pricing.plans.growth.features.1',
        'pricing.plans.growth.features.2',
        'pricing.plans.growth.features.3',
      ],
      overageKey: 'pricing.plans.growth.overage',
    },
    {
      nameKey: 'pricing.plans.pro.name',
      subtitleKey: 'pricing.plans.pro.subtitle',
      descriptionKey: 'pricing.plans.pro.description',
      price: billingPeriod === 'Monthly' ? 999 : 9990,
      badgeKey: 'pricing.plans.pro.badge',
      featuresKeys: [
        'pricing.plans.pro.features.0',
        'pricing.plans.pro.features.1',
        'pricing.plans.pro.features.2',
        'pricing.plans.pro.features.3',
      ],
      overageKey: 'pricing.plans.pro.overage',
    },
    {
      nameKey: 'pricing.plans.enterprise.name',
      subtitleKey: 'pricing.plans.enterprise.subtitle',
      descriptionKey: 'pricing.plans.enterprise.description',
      priceKey: 'pricing.plans.enterprise.price',
      featuresKeys: [
        'pricing.plans.enterprise.features.0',
        'pricing.plans.enterprise.features.1',
        'pricing.plans.enterprise.features.2',
        'pricing.plans.enterprise.features.3',
        'pricing.plans.enterprise.features.4',
      ],
      overageKey: 'pricing.plans.enterprise.overage',
    },
  ];

  const payAsYouGoFeaturesKeys = [
    'pricing.payAsYouGo.features.0',
    'pricing.payAsYouGo.features.1',
    'pricing.payAsYouGo.features.2',
    'pricing.payAsYouGo.features.3',
    'pricing.payAsYouGo.features.4',
    'pricing.payAsYouGo.features.5',
  ];

  const overagePricingKeys = [
    { labelKey: 'pricing.payAsYouGo.overage.aiCalling', price: '$0.70' },
    { labelKey: 'pricing.payAsYouGo.overage.emailFollowup', price: '$0.02' },
    { labelKey: 'pricing.payAsYouGo.overage.videoHandoff', price: '$0.30' },
  ];

  return (
    <Section background="white" spacing="sm" id="pricing">
      <ContentLayout
        layout="centered"
        chip={{ icon: <Image src={Icons.planIcon} alt='icon' width={15} height={15} />, text: t('pricing.chipLabel') }}

        title={t('pricing.title')}
        description={t('pricing.description')}
        maxWidth="xl"
      >
        {/* Toggle Monthly/Yearly */}
        <div className="flex justify-center mt-8 mb-4">
          <Toggle
            options={[t('pricing.billing.monthly'), t('pricing.billing.yearly')]}
            selected={billingPeriod === 'Monthly' ? t('pricing.billing.monthly') : t('pricing.billing.yearly')}
            onChange={(value) => setBillingPeriod(value === t('pricing.billing.monthly') ? 'Monthly' : 'Yearly')}
          />
        </div>

        {/* Grid de pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {pricingPlans.map((plan, index) => (
            <PricingCard
              key={index}
              name={t(plan.nameKey)}
              subtitle={t(plan.subtitleKey)}
              price={plan.priceKey ? undefined : plan.price}
              period={billingPeriod === 'Monthly' ? t('pricing.period.month') : t('pricing.period.year')}
              features={plan.featuresKeys.map(key => t(key))}
              overage={t(plan.overageKey)}
              badge={plan.badgeKey ? t(plan.badgeKey) : undefined}
              onGetStarted={() => console.log(`Get started with ${t(plan.nameKey)}`)}
              onMoreDetails={() => console.log(`More details for ${t(plan.nameKey)}`)}
            />
          ))}
        </div>

        {/* Pay-As-You-Go Plan */}
        <Card variant="custom" className="border-2 border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            {/* Colonne 1 : Info */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {t('pricing.payAsYouGo.title')}
              </h3>
              <p className="text-xs text-gray-600 mb-6">
                {t('pricing.payAsYouGo.subtitle')}
              </p>
              <Button
                variant="solid"
                size="md"
                onClick={() => console.log('Get started PAYG')}
                className="w-full"
              >
                {t('pricing.payAsYouGo.getStarted')}
              </Button>
              <button className="block w-full text-sm text-gray-600 hover:text-gray-900 mt-3 transition-colors">
                {t('pricing.payAsYouGo.moreDetails')}
              </button>
            </div>

            {/* Colonne 2 : Features */}
            <div className="lg:col-span-2">
              <p className="text-sm text-gray-600 mb-4">
                {t('pricing.payAsYouGo.description')}
              </p>
              <ul className="space-y-2">
                {payAsYouGoFeaturesKeys.map((featureKey, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5">
                      <Icons.checkIcon size={14} className="text-secondaryMain" />
                    </div>
                    <span className="text-xs text-gray-700 text-left">{t(featureKey)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Colonne 3 : Overage Pricing */}
            <div className="bg-gray-50 rounded-xl p-6">
              <p className="text-sm font-semibold text-gray-900 mb-4">
                {t('pricing.payAsYouGo.overageTitle')}
              </p>
              <div className="space-y-3">
                {overagePricingKeys.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">{t(item.labelKey)}</span>
                    <span className="text-lg font-bold text-gray-900">{item.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </ContentLayout>
    </Section>
  );
}