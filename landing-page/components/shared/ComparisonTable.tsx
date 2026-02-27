'use client'

import { Icons } from "@/constants/icon-import";
import { useTranslation } from "@/context/LanguageContext";
import Image from "next/image";

export interface ComparisonFeature {
  category?: string;
  feature: string;
  boostMyDeal: boolean | string;
  competitors: {
    [key: string]: boolean | string;
  };
}

interface ComparisonTableProps {
  competitors: Array<{
    name: string;
    logo?: string;
    rating?: string;
  }>;
  features: ComparisonFeature[];
  className?: string;
}

export function ComparisonTable({
  competitors,
  features,
  className = '',
}: ComparisonTableProps) {
  const { t } = useTranslation();

  // Ratings (nombre d'étoiles)
  const ratings: { [key: string]: number | string } = {
    BOOSTMYDEAL: 5,
    Vapi: 2,
    'Air.ai': t('comparison.table.unverifiedData'),
    Lemlist: 4,
    Clay: 2,
    Instantly: 4,
    Reoon: 4,
    'Smartlead.ai': 5,
    'Sales.ai': 3,
    Salesloftclose: 4,
    'Sales.ai.com': 4,
  };

  // Services regions
  const regions: { [key: string]: string } = {
    BOOSTMYDEAL: t('comparison.table.regions.global'),
    Vapi: t('comparison.table.regions.global'),
    'Air.ai': t('comparison.table.regions.naEuropeAsia'),
    Lemlist: t('comparison.table.regions.global'),
    Clay: t('comparison.table.regions.global'),
    Instantly: t('comparison.table.regions.naEuropeAsia'),
    Reoon: t('comparison.table.regions.global'),
    'Smartlead.ai': t('comparison.table.regions.global'),
    'Sales.ai': t('comparison.table.regions.global'),
    Salesloftclose: t('comparison.table.regions.global'),
    'Sales.ai.com': t('comparison.table.regions.global'),
  };

  // Pricing models
  const pricingModels: { [key: string]: string } = {
    BOOSTMYDEAL: t('comparison.table.pricing.unlimited'),
    Vapi: t('comparison.table.pricing.limited'),
    'Air.ai': t('comparison.table.pricing.limited'),
    Lemlist: t('comparison.table.pricing.perUser'),
    Clay: t('comparison.table.pricing.creditBased'),
    Instantly: t('comparison.table.pricing.creditBasedNoSeat'),
    Reoon: t('comparison.table.pricing.perUser'),
    'Smartlead.ai': t('comparison.table.pricing.planBased'),
    'Sales.ai': t('comparison.table.pricing.planBased'),
    Salesloftclose: t('comparison.table.pricing.planBased'),
    'Sales.ai.com': t('comparison.table.pricing.limited'),
  };

  const renderStars = (count: number) => {
    return (
      <div className="flex gap-0.5 justify-center">
        {Array.from({ length: count }).map((_, i) => (
          <Icons.StarIcon key={i} size={10} className="text-main" />
        ))}
      </div>
    );
  };

  const renderCell = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <div className="flex justify-center">
          <Image src={Icons.check} alt="check" width={10} height={10} />
        </div>
      ) : (
        <div className="flex justify-center">
          <Image src={Icons.X} alt="cross" width={10} height={10} />
        </div>
      );
    }
    return (
      <div className="text-center text-[10px] leading-tight text-gray-700 px-1">
        {value}
      </div>
    );
  };

  return (
    <div className={`overflow-x-auto ${className}`}>
      <div className="min-w-[1200px] border border-gray-200">
        <table className="w-full border-collapse bg-white">
          {/* Header */}
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="p-3 text-left bg-orange-50 sticky left-0 z-20 min-w-[200px] text-xs font-bold text-gray-700">
                {t('comparison.table.header.categoryFeature')}
              </th>
              <th className="p-1 bg-orange-100 min-w-[110px] text-xs font-bold text-gray-900 uppercase">
                BOOSTMYDEAL
              </th>
              {competitors.map((competitor, index) => (
                <th key={index} className="p-1 bg-white min-w-[110px] text-xs font-semibold text-gray-700">
                  {competitor.name}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Overall Customer Rating */}
            <tr className="border-b border-gray-200 bg-orange-50/30">
              <td className="p-1 text-xs font-bold text-gray-900 sticky left-0 z-10 bg-orange-50">
                {t('comparison.table.header.overallRating')}
              </td>
              <td className="p-1 bg-orange-50/50">
                {renderStars(5)}
              </td>
              {competitors.map((competitor, index) => {
                const rating = ratings[competitor.name];
                return (
                  <td key={index} className="p-3">
                    {typeof rating === 'number' ? (
                      renderStars(rating)
                    ) : (
                      <div className="text-center text-[9px] leading-tight px-1">
                        <div className="inline-block bg-yellow-100 border border-yellow-400 rounded px-2 py-1">
                          {rating}
                        </div>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* Offers services in */}
            <tr className="border-b border-gray-200 bg-white">
              <td className="p-3 text-xs font-semibold text-gray-900 sticky left-0 z-10 bg-white">
                {t('comparison.table.header.offersServices')}
              </td>
              <td className="p-3 bg-orange-50/30 text-center text-[10px] text-gray-700">
                {regions.BOOSTMYDEAL}
              </td>
              {competitors.map((competitor, index) => (
                <td key={index} className="p-3 text-center text-[10px] text-gray-700">
                  {regions[competitor.name]}
                </td>
              ))}
            </tr>

            {/* Pay-per-Minute/Usage Option */}
            <tr className="border-b border-gray-200 bg-orange-50/30">
              <td className="p-3 text-xs font-semibold text-gray-900 sticky left-0 z-10 bg-orange-50">
                {t('comparison.table.header.payPerUsage')}
              </td>
              <td className="p-3 bg-orange-50/50 text-center text-[10px] text-gray-700">
                {pricingModels.BOOSTMYDEAL}
              </td>
              {competitors.map((competitor, index) => (
                <td key={index} className="p-3 text-center text-[10px] leading-tight text-gray-700">
                  {pricingModels[competitor.name]}
                </td>
              ))}
            </tr>

            {/* Features */}
            {features.map((item, index) => (
              <tr
                key={index}
                className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-orange-50'}`}
              >
                <td className="p-3 text-xs text-gray-800 sticky left-0 z-10 bg-inherit font-medium">
                  {item.feature}
                </td>
                <td className={`p-3 ${index % 2 === 0 ? 'bg-orange-50' : 'bg-orange-50'}`}>
                  {renderCell(item.boostMyDeal)}
                </td>
                {competitors.map((competitor, idx) => (
                  <td key={idx} className="p-3">
                    {renderCell(item.competitors[competitor.name])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}