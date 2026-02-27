import React, { useState } from 'react';
import { StepsProps } from './Step1Welcome';
import { ChevronDown, AlertTriangle } from 'lucide-react';

// ── Checkbox (outside parent) ──────────────────────────────────────

const Checkbox = ({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={disabled ? undefined : onChange}
    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors border
      ${checked ? 'bg-primary border-primary' : 'bg-gray-100 border-gray-300'}
      ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    {checked && (
      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    )}
  </button>
);

// ── Select Field (outside parent) ─────────────────────────────────

const SelectField = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-gray-400 transition-colors"
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
  </div>
);

// ── Main Component ─────────────────────────────────────────────────

const Step4SetupAi = ({ onNext, onBack, onSubmit }: StepsProps) => {
  // Use Cases
  const [useCases, setUseCases] = useState({
    inbound: true,
    booking: true,
    missedCall: true,
  });

  // Voice & Tone
  const [voice, setVoice] = useState('Default Voice');
  const [tone, setTone] = useState<'Professional' | 'Friendly' | 'Direct'>('Professional');
  const [language, setLanguage] = useState('English');

  // Handoff Rules - when to transfer
  const [transferWhen, setTransferWhen] = useState({
    pricingRequest: true,
    objections: false,
    angryLead: false,
  });

  // Handoff Rules - how to handle
  const [transferHow, setTransferHow] = useState({
    bookMeeting: true,
    transferCall: true,
    createTask: true,
  });

  const toggleUseCase = (key: keyof typeof useCases) =>
    setUseCases((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleTransferWhen = (key: keyof typeof transferWhen) =>
    setTransferWhen((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleTransferHow = (key: keyof typeof transferHow) =>
    setTransferHow((prev) => ({ ...prev, [key]: !prev[key] }));

  const anyUseCaseSelected = Object.values(useCases).some(Boolean);

  return (
    <div className="flex gap-4 w-full">

      {/* ── Column 1: Use Cases ── */}
      <div className="flex flex-col gap-3 flex-1 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 ">Use Cases</h3>

        {/* Inbound qualification */}
        <div className="flex items-start gap-3">
          <Checkbox checked={useCases.inbound} onChange={() => toggleUseCase('inbound')} />
          <div>
            <p className="text-sm font-medium text-gray-800">Inbound qualification</p>
            <p className="text-xs text-gray-400">Answer and qualify incoming leads.</p>
          </div>
        </div>

        {/* Booking & Scheduling */}
        <div className="flex items-start gap-3">
          <Checkbox checked={useCases.booking} onChange={() => toggleUseCase('booking')} />
          <div>
            <p className="text-sm font-medium text-gray-800">Booking & Scheduling</p>
            <p className="text-xs text-gray-400">Assist in booking and scheduling.</p>
          </div>
        </div>

        {/* Missed call follow-up */}
        <div className="flex items-start gap-3">
          <Checkbox checked={useCases.missedCall} onChange={() => toggleUseCase('missedCall')} />
          <div>
            <p className="text-sm font-medium text-gray-800">Missed call follow-up</p>
            <p className="text-xs text-gray-400">Callback leads who miss your call.</p>
          </div>
        </div>

        {/* Warning */}
        {!anyUseCaseSelected && (
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 mt-1">
            <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <span className="text-xs text-gray-500">Please select one or more use case.</span>
          </div>
        )}
        {anyUseCaseSelected && (
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 mt-1 opacity-50">
            <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <span className="text-xs text-gray-500">Please select one or more use case.</span>
          </div>
        )}
      </div>

      {/* ── Column 2: Voice & Tone ── */}
      <div className="flex flex-col gap-4 flex-1 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between  border-b border-gray-200 pb-2 ">
          <h3 className="text-base font-semibold text-gray-900">Voice & Tone</h3>
          <span className="text-sm text-gray-400">Language</span>
        </div>

        {/* Voice */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Voice</label>
          <SelectField
            value={voice}
            onChange={setVoice}
            options={['Default Voice', 'Male Voice', 'Female Voice', 'Neutral Voice']}
          />
        </div>

        {/* Tone */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Tone</label>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['Professional', 'Friendly', 'Direct'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTone(t)}
                className={`flex-1 py-2 text-sm font-medium transition-colors
                  ${tone === t ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Language</label>
          <SelectField
            value={language}
            onChange={setLanguage}
            options={['English', 'Spanish', 'French', 'German', 'Arabic']}
          />
        </div>
      </div>

      {/* ── Column 3: Handoff Rules ── */}
      <div className="flex flex-col gap-4 flex-1 rounded-xl border border-primary border-2 bg-white p-5">
        <h3 className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 ">Handoff Rules (required)</h3>

        {/* When to transfer */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-gray-700">when to transfer call:</p>
          <div className="flex items-center gap-2">
            <Checkbox checked={transferWhen.pricingRequest} onChange={() => toggleTransferWhen('pricingRequest')} />
            <span className="text-sm text-gray-700">Pricing Request</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={transferWhen.objections} onChange={() => toggleTransferWhen('objections')} />
            <span className="text-sm text-gray-700">Objections</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={transferWhen.angryLead} onChange={() => toggleTransferWhen('angryLead')} />
            <span className="text-sm text-gray-700">Angry Lead</span>
          </div>
        </div>

        {/* How to handle */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-gray-700">How to handle transfer:</p>
          <div className="flex items-center gap-2">
            <Checkbox checked={transferHow.bookMeeting} onChange={() => toggleTransferHow('bookMeeting')} />
            <span className="text-sm text-gray-700">Book Meeting</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={transferHow.transferCall} onChange={() => toggleTransferHow('transferCall')} />
            <span className="text-sm text-gray-700">Transfer Call</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={transferHow.createTask} onChange={() => toggleTransferHow('createTask')} />
            <span className="text-sm text-gray-700">Create Task + notify</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Step4SetupAi;