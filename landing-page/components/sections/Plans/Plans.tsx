'use client';

import { ContentLayout } from '@/components/layout/ContentLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PricingCard } from '@/components/ui/PricingCard';
import { Section } from '@/components/ui/Section';
import { Toggle } from '@/components/ui/Toggle';
import { Icons } from '@/constants/icon-import';
import { useState } from 'react';

export function Plans() {
  const [billingPeriod, setBillingPeriod] = useState<'Monthly' | 'Yearly'>('Monthly');

  // Plans de pricing
  const pricingPlans = [
    {
      name: 'Starter',
      subtitle: 'Ideal for individuals & small agencies',
      price: billingPeriod === 'Monthly' ? 199 : 1990,
      features: [
        '300 AI calling minutes',
        'Automated email follow-ups',
        '$0.50 /additional AI minute',
        'Human-like AI conversations',
      ],
      overage: '$0.50 additional AI minute',
    },
    {
      name: 'Growth',
      subtitle: 'Ideal for growing teams',
      price: billingPeriod === 'Monthly' ? 499 : 4990,
      features: [
        '1,000 AI calling minutes',
        'Advanced CRM & email integrations',
        'Full AI sales workflow automation',
        'Consolidated follow-ups',
      ],
      overage: '$0.50 additional AI minute',
    },
    {
      name: 'Pro',
      subtitle: 'Ideal for high-performance teams',
      price: billingPeriod === 'Monthly' ? 999 : 9990,
      badge: 'Most popular plan',

      features: [
        '3,000 AI calling minutes',
        'Advanced analytics & reporting',
        'AI personalization across calls, emails & meetings',
        'Priority onboarding & feature',
      ],
      overage: '$0.50 additional AI minute',
    },
    {
      name: 'Enterprise',
      subtitle: 'Built for large teams & agencies',
      price: 'Custom',
      features: [
        'Custom AI models',
        'API access',
        'Unlimited users',
        'Dedicated onboarding & support',
        'Enterprise-grade customization',
      ],
      overage: 'Custom pricing',
    },
  ];

  // Pay-As-You-Go features
  const payAsYouGoFeatures = [
    'Top-Up Balance: User buys $25, $50, $100, or $500 in BoostMyDeal Credits.',
    'Automatic Deduction: Every AI call minute or email follow-up deducts credits in real time.',
    'Balance Alerts: When balance drops below $10, system prompts auto-reload.',
    'Optional Auto-Recharge: Users can enable auto top-up',
  ];

  const overagePricing = [
    { label: 'Email Follow-up', price: '$0.02' },
    { label: 'AI Calling Minute', price: '$0.70' },
    { label: 'Video Handoff', price: '$0.30' },
  ];

  return (
    <Section background="white" spacing="lg" id=''>
      <ContentLayout
        layout="centered"
        chip={{ text: 'Customer Plans' }}
        title="Simple Plans for Every Sales Team"
        description="Flexible pricing designed for teams of every size, from solo founders to enterprise sales operations."
        maxWidth="xl"
      >
        {/* Toggle Monthly/Yearly */}
        <div className="flex justify-center mt-8 mb-12">
          <Toggle
            options={['Monthly', 'Yearly']}
            selected={billingPeriod}
            onChange={(value) => setBillingPeriod(value as 'Monthly' | 'Yearly')}
          />
        </div>

        {/* Grid de pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {pricingPlans.map((plan) => (
            <PricingCard
              key={plan.name}
              name={plan.name}
              subtitle={plan.subtitle}
              price={typeof plan.price === 'number' ? plan.price : 0}
              period={billingPeriod === 'Monthly' ? 'month' : 'year'}
              features={plan.features}
              overage={plan.overage}
              badge={plan.badge}
              onGetStarted={() => console.log(`Get started with ${plan.name}`)}
              onMoreDetails={() => console.log(`More details for ${plan.name}`)}
            />
          ))}
        </div>

        {/* Pay-As-You-Go Plan */}
        <Card variant="custom" className="border-2 border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            {/* Colonne 1 : Info */}
            <div className=''>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Pay-As-You-Go Plan
              </h3>
              <p className="text-xs text-gray-600 mb-6">
                Start for free — pay only for what you use.
              </p>
              <Button
                variant="solid"
                size="md"
                onClick={() => console.log('Get started PAYG')}
                className='w-full'
              >
                Get Started
              </Button>
              <button className="block w-full text-sm text-gray-600 hover:text-gray-900 mt-3 transition-colors">
                More Details
              </button>
            </div>

            {/* Colonne 2 : Features */}
            <div className="lg:col-span-2">
              <p className="text-sm text-gray-600 mb-4">
                Recharge anytime with prepaid credits — no monthly fees, no commitments.
              </p>
              <ul className="space-y-2">
                {payAsYouGoFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5">
                      <Icons.checkIcon size={14} className="text-secondaryMain" />
                    </div>
                    <span className="text-xs text-gray-700 text-left">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Colonne 3 : Overage Pricing */}
            <div className="bg-gray-50 rounded-xl p-6">
              <p className="text-sm font-semibold text-gray-900 mb-4">Overage</p>
              <div className="space-y-3">
                {overagePricing.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">{item.label}</span>
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