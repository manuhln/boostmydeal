
import { Icons } from '@/constants/icon-import';
import { Button } from '../ui/Button';

interface PricingCardProps {
  name: string;
  subtitle: string;
  price: number;
  period: 'month' | 'year';
  features: string[];
  overage: string;
  badge?: string;
  highlighted?: boolean;
  onGetStarted?: () => void;
  onMoreDetails?: () => void;
  className?: string;
}

export function PricingCard({
  name,
  subtitle,
  price,
  period,
  features,
  overage,
  badge,
  onGetStarted,
  onMoreDetails,
  className = '',
}: PricingCardProps) {
  return (
    <div
      className={`
        relative bg-white rounded-2xl p-6 
        border-2 transition-all duration-200
       border-gray-200 hover:border-gray-300
        ${className}
      `}
    >

      {/* Header */}
      <div className="mb-6 text-left">
        <div className='flex'>
          <h3 className="text-xl font-bold  text-gray-900 mb-1">{name}</h3>
          {badge && (
            <div className="mx-4">
              <span className="bg-[#EA2424] text-white text-xs font-normal px-3 py-1 rounded-full">
                {badge}
              </span>
            </div>
          )}

        </div>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>

      {/* Prix */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-gray-900">${price}</span>
          <span className="text-gray-600">/{period}</span>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5  flex items-center justify-center mt-0.5">
              <Icons.checkIcon size={14} className="text-secondaryMain" />
            </div>
            <span className="text-sm text-gray-700 text-left">{feature}</span>
          </li>
        ))}
      </ul>

      {/* Overage */}
      <div className="mb-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          <span className="font-semibold">Overage</span>
        </p>
        <p className="text-sm text-gray-700 mt-1">{overage}</p>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          variant="solid"
          size="md"
          onClick={onGetStarted}
          className="w-full"
        >
          Get Started
        </Button>

        <button
          onClick={onMoreDetails}
          className="w-full text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          More Details
        </button>
      </div>
    </div>
  );
}