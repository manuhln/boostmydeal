import React, { useState } from 'react';
import { StepsProps } from './Step1Welcome';

type ReportOption = 'daily' | 'weekly' | 'monthly' | 'none';

// ── Calendar icon with letter badge (outside parent) ───────────────

const CalendarBadgeIcon = ({ letter }: { letter: string }) => (
  <div className="relative w-14 h-14 flex items-center justify-center">
    {/* Outer gray circle background */}
    <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
      {/* Calendar SVG */}
      <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={1.8} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 2v4M8 2v4M3 10h18" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M7 15l3 3 7-6" />
      </svg>
    </div>
    {/* Small letter badge bottom-right */}
    <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-gray-500 flex items-center justify-center">
      <span className="text-white text-[9px] font-bold leading-none">{letter}</span>
    </div>
  </div>
);

// ── Bell off icon with circle background (outside parent) ──────────

const BellOffCircleIcon = () => (
  <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
    <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M13.73 21a2 2 0 01-3.46 0M18.63 13A17.89 17.89 0 0118 8M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14M18 8a6 6 0 00-9.33-5M3 3l18 18" />
    </svg>
  </div>
);

// ── Report Card (outside parent) ───────────────────────────────────

const ReportCard = ({
  id,
  label,
  title,
  description,
  selected,
  onSelect,
  icon,
}: {
  id: ReportOption;
  label: string;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
}) => (
  <div className="flex flex-col gap-2 cursor-pointer" onClick={onSelect}>
    {/* Label row above card */}
    <div className="flex items-center gap-2">
      <div
        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors
          ${selected ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}
      >
        {selected && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`text-sm font-medium ${selected ? 'text-gray-900' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>

    {/* Card box */}
    <div className={`flex flex-col items-center gap-4 rounded-xl border bg-white p-5 transition-all
      ${selected ? 'border-gray-200 shadow-sm' : 'border-gray-200'}`}
    >
      {/* Icon */}
      <div className="flex items-center justify-center pt-2">
        {icon}
      </div>

      {/* Text */}
      <div className="flex flex-col items-center gap-1 text-center pb-2">
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-400 leading-relaxed">{description}</p>
      </div>
    </div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────

const Step5Preference = ({ onNext, onBack, onSubmit }: StepsProps) => {
  const [selected, setSelected] = useState<ReportOption | null>('daily');

  const options = [
    {
      id: 'daily' as ReportOption,
      label: 'Daily Summary',
      title: 'Daily Summary',
      description: 'Get a daily summary of calls, leads and automations.',
      icon: <CalendarBadgeIcon letter="d" />,
    },
    {
      id: 'weekly' as ReportOption,
      label: 'Weekly Summary',
      title: 'Weekly Summary',
      description: 'Get a weekly summary of calls, leads and automations.',
      icon: <CalendarBadgeIcon letter="w" />,
    },
    {
      id: 'monthly' as ReportOption,
      label: 'Monthly Report',
      title: 'Monthly Summary',
      description: 'Receive a detailed monthly report with key metrics.',
      icon: <CalendarBadgeIcon letter="m" />,
    },
    {
      id: 'none' as ReportOption,
      label: 'No Reports',
      title: 'No Reports',
      description: 'Skip these notifications for now.',
      icon: <BellOffCircleIcon />,
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 4-column card grid */}
      <div className="grid grid-cols-4 gap-4">
        {options.map((opt) => (
          <ReportCard
            key={opt.id}
            {...opt}
            selected={selected === opt.id}
            onSelect={() => setSelected(opt.id)}
          />
        ))}
      </div>

      {/* Warning pill - centered */}
      <div className="flex justify-center">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 transition-opacity
          ${selected ? 'opacity-40' : 'opacity-100'}`}
        >
          <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span className="text-sm text-gray-500">Please select one reporting option.</span>
        </div>
      </div>
    </div>
  );
};

export default Step5Preference;