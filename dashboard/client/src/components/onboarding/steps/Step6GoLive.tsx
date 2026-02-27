import React from 'react';
import { StepsProps } from './Step1Welcome';

// ── Bullet Item (outside parent) ───────────────────────────────────

const BulletItem = ({ text }: { text: string }) => (
  <li className="flex items-start gap-2 text-sm text-gray-600">
    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
    {text}
  </li>
);

// ── Icons (outside parent) ─────────────────────────────────────────

const BriefcaseIcon = () => (
  <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="2" y="7" width="20" height="14" rx="2" strokeWidth={1.6} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 12v.01M2 12h20" />
  </svg>
);

const ToolsIcon = () => (
  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <circle cx="12" cy="12" r="3" strokeWidth={1.6} />
  </svg>
);

const WorkflowIcon = () => (
  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="6" height="6" rx="1" strokeWidth={1.6} />
    <rect x="15" y="3" width="6" height="6" rx="1" strokeWidth={1.6} />
    <rect x="9" y="15" width="6" height="6" rx="1" strokeWidth={1.6} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M6 9v3a3 3 0 003 3h6a3 3 0 003-3V9" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 12v3" />
  </svg>
);

const MessagingIcon = () => (
  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ReportingIcon = () => (
  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

// ── Section Card (outside parent) ─────────────────────────────────

const SectionCard = ({
  icon,
  title,
  items,
  highlighted = false,
  twoCol = false,
  onEdit,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[] | [string[], string[]];
  highlighted?: boolean;
  twoCol?: boolean;
  onEdit?: () => void;
}) => (
  <div className={`flex flex-col gap-3 rounded-xl border bg-white p-5 transition-all
    ${highlighted ? 'border-blue-400 border-2' : 'border-gray-200'}`}
  >
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        {icon}
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="text-sm text-blue-500 hover:text-blue-600 transition-colors font-medium"
      >
        Edit
      </button>
    </div>

    {/* Bullet list */}
    {twoCol && Array.isArray(items[0]) ? (
      <div className="grid grid-cols-2 gap-x-8">
        <ul className="flex flex-col gap-1.5">
          {(items as [string[], string[]])[0].map((item) => (
            <BulletItem key={item} text={item} />
          ))}
        </ul>
        <ul className="flex flex-col gap-1.5">
          {(items as [string[], string[]])[1].map((item) => (
            <BulletItem key={item} text={item} />
          ))}
        </ul>
      </div>
    ) : (
      <ul className="flex flex-col gap-1.5">
        {(items as string[]).map((item) => (
          <BulletItem key={item} text={item} />
        ))}
      </ul>
    )}
  </div>
);

// ── Main Component ─────────────────────────────────────────────────

const Step6GoLive = ({ onNext, onBack, onSubmit }: StepsProps) => {
  return (
    <div className="flex flex-col gap-4 w-full">

      {/* Business Profile - full width, highlighted */}
      <SectionCard
        icon={<BriefcaseIcon />}
        title="Business Profile"
        highlighted={true}
        twoCol={true}
        items={[
          [
            'Industry: SaaS',
            'Country & Timezone: United States: (EST)',
            'Company Size: 6~20 employees',
            'Sales Goal: Appointments, Deals Closed',
          ],
          [
            'CRM: HubSpot',
            'PBX: VoxSun',
            'Email: Google',
            'Calendar: GoogeCalendar',
          ],
        ]}
      />

      {/* 2x2 grid */}
      <div className="grid grid-cols-2 gap-4">
        <SectionCard
          icon={<ToolsIcon />}
          title="Connected Tools"
          items={[
            'CRM: HubSpot',
            'PBX: VoxSun',
            'Email: Google',
          ]}
        />

        <SectionCard
          icon={<WorkflowIcon />}
          title="AI Workflows"
          items={[
            'Inbound qualification: Active',
            'Outbound follow-Ups: Custom logic',
            'Lead Qualification logic: Custom',
          ]}
        />

        <SectionCard
          icon={<MessagingIcon />}
          title="Messaging & Tone"
          items={[
            'Call Style: Friendly, Professional',
            'Email Tone: Natural, Helpful',
            'AI Agent + Messages: Tuned',
          ]}
        />

        <SectionCard
          icon={<ReportingIcon />}
          title="Reporting & Tracking"
          items={[
            'Metrics: Meetings Booked',
            'Insights: Conversation Insights',
            'CRM Sync: Activity Sync',
          ]}
        />
      </div>

    </div>
  );
};

export default Step6GoLive;