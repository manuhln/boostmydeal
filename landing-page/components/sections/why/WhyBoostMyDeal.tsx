'use client'

import { ComparisonTable } from "@/components/shared/ComparisonTable";
import { Chip } from "@/components/ui/Chip";
import { Section } from "@/components/ui/Section";
import { features } from "./comparason";
import { Icons } from "@/constants/icon-import";
import { useTranslation } from "@/context/LanguageContext";

export function WhyBoostMyDeal() {
  const { t } = useTranslation();

  // Liste des concurrents
  const competitors = [
    { name: 'Instantly', rating: '' },
    { name: 'Vapi', rating: '' },
    { name: 'Ava', rating: '' },
    { name: 'Lemlist', rating: '' },
    { name: 'Clay', rating: '' },
    { name: 'Reoon', rating: '' },
    { name: 'Smartlead.ai', rating: '' },
    { name: 'Apollo.ai', rating: '' },
    { name: 'Saleshandy', rating: '' },
    { name: 'Close.com', rating: '' },
  ];

  return (
    <Section background="white" spacing="sm" id="why">
      {/* Header */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div>
          <Chip icon={<Icons.CopySimpleIcon />} variant="default">
            {t('comparison.chipLabel')}
          </Chip>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-4 leading-tight">
            {t('comparison.title')}
          </h2>
        </div>
        <div className="flex items-end">
          <p className="text-sm lg:text-base text-gray-600 leading-relaxed">
            {t('comparison.description')}
          </p>
        </div>
      </div>

      <ComparisonTable competitors={competitors} features={features} />
    </Section>
  );
}