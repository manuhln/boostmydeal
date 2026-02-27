import React, { useState } from 'react';
import { StepsProps } from './Step1Welcome';
import { Images } from '@/utils/image';

// ── Types ──────────────────────────────────────────────────────────

type ConnectionStatus = 'not_connected' | 'connected' | 'testing';

interface ConnectionCardProps {
  title: string;
  options: { label: string; iconKey: keyof typeof Images }[];
  isActive?: boolean;
  layout?: 'full' | 'half';
}

// ── Sub-components (outside parent to prevent remount) ─────────────

const RadioOption = ({
  label,
  iconKey,
  selected,
  onSelect,
}: {
  label: string;
  iconKey: keyof typeof Images;
  selected: boolean;
  onSelect: () => void;
}) => (
  <label className="flex items-center gap-2 cursor-pointer select-none">
    <div
      onClick={onSelect}
      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer
        ${selected ? 'border-primary' : 'border-gray-300'}`}
    >
      {selected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
    </div>
    <img src={Images[iconKey] as string} alt={label} className="w-5 h-5 object-contain" />
    <span className="text-sm text-gray-700">{label}</span>
  </label>
);

const ActionButtons = ({
  status,
  onConnect,
  onTest,
}: {
  status: ConnectionStatus;
  onConnect: () => void;
  onTest: () => void;
}) => (
  <div className="flex items-center gap-2 flex-shrink-0">
    <button
      onClick={onConnect}
      className="px-4 py-1.5 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
    >
      Connect
    </button>
    <button
      onClick={onTest}
      className="px-4 py-1.5 rounded-md text-sm font-medium bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
    >
      Test
    </button>
    <button
      disabled
      className="px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 text-gray-400 cursor-default"
    >
      {status === 'connected' ? 'Connected' : 'Not Connected'}
    </button>
  </div>
);

const ConnectionCard = ({
  title,
  options,
  isActive = false,
  layout = 'full',
}: ConnectionCardProps) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('not_connected');

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-4 bg-white transition-all
        ${isActive ? 'border-primary border-2' : 'border-gray-200'}
        ${layout === 'half' ? 'flex-1' : 'w-full'}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-800">{title}</span>
        </div>
        <ActionButtons
          status={status}
          onConnect={() => setStatus('connected')}
          onTest={() => setStatus('testing')}
        />
      </div>

      {/* Options row */}
      <div className="flex items-center gap-6 flex-wrap">
        {options.map((opt) => (
          <RadioOption
            key={opt.label}
            label={opt.label}
            iconKey={opt.iconKey}
            selected={selected === opt.label}
            onSelect={() => setSelected(opt.label)}
          />
        ))}
      </div>
    </div>
  );
};

const ConnectionCardHalf = ({
  title,
  options,
}: {
  title: string;
  options: { label: string; iconKey: keyof typeof Images }[];
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('not_connected');

  return (
    <div className="rounded-xl border border-gray-200 p-4 flex flex-col gap-4 bg-white flex-1">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-800">{title}</span>
      </div>

      {/* Options grid */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <RadioOption
            key={opt.label}
            label={opt.label}
            iconKey={opt.iconKey}
            selected={selected === opt.label}
            onSelect={() => setSelected(opt.label)}
          />
        ))}
      </div>

      {/* Buttons at bottom */}
      <div className="flex items-center gap-2 mt-auto pt-2">
        <button className="px-4 py-1.5 rounded-md text-sm font-medium bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors">
          Test
        </button>
        <button className="px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 text-gray-400 cursor-default">
          Not Connected
        </button>
        <button
          onClick={() => setStatus('connected')}
          className="ml-auto px-4 py-1.5 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          Connect
        </button>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────

const Step2Tools = ({ onNext, onBack, onSubmit }: StepsProps) => {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* CRM Connection - active/highlighted */}
      <ConnectionCard
        title="CRM Connection"
        isActive={true}
        options={[
          { label: 'HubSpot', iconKey: 'hubspot' },
          { label: 'Zoho', iconKey: 'zohocrm' },
          { label: 'Use BoostMyDeal CRM', iconKey: 'boostmydeal' },
        ]}
      />

      {/* Phone System Connection */}
      <ConnectionCard
        title="Phone System Connection"
        options={[
          { label: 'VoxSun (Recommended)', iconKey: 'voxsun' },
          { label: 'Twilio', iconKey: 'twilio' },
        ]}
      />

      {/* Bottom row: Email + Calendar side by side */}
      <div className="flex gap-4">
        <ConnectionCardHalf
          title="Email System Connection"
          options={[
            { label: 'SMTP', iconKey: 'smtp' },
            { label: 'Google', iconKey: 'google' },
            { label: 'Microsoft', iconKey: 'microsoft' },
          ]}
        />
        <ConnectionCardHalf
          title="Calendar Connection"
          options={[
            { label: 'Google Calendar', iconKey: 'googleCalendar' },
            { label: 'Outlook Calendar', iconKey: 'outlook' },
            { label: 'Calendly', iconKey: 'calendly' },
            { label: 'Zoho Calendar', iconKey: 'zohoCalendar' },
          ]}
        />
      </div>
    </div>
  );
};

export default Step2Tools;