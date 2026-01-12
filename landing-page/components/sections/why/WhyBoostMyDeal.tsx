import { ComparisonFeature, ComparisonTable } from "@/components/shared/ComparisonTable";
import { Chip } from "@/components/ui/Chip";
import { Section } from "@/components/ui/Section";
import { features } from "./comparason";


export function WhyBoostMyDeal() {
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
    <Section background="white" spacing="sm" id="WhyBoostMyDeal">
      {/* Header */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Left: Chip + Title */}
        <div>
          <Chip variant="default">Comparison Page</Chip>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-4 leading-tight">
            Why BoostMyDeal Is Different
          </h2>
        </div>

        {/* Right: Description */}
        <div className="flex items-end">
          <p className="text-sm lg:text-base text-gray-600 leading-relaxed">
            Discover how BoostMyDeal streamlines sales processes by automating
            every step of the customer journey in a single intelligent system.
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <ComparisonTable competitors={competitors} features={features} />
    </Section>
  );
}