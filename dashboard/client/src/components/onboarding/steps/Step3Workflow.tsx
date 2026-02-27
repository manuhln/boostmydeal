import React, { useState } from 'react';
import { StepsProps } from './Step1Welcome';
import { AlertTriangle } from 'lucide-react';


const Toggle = ({
  enabled,
  onToggle,
  disabled = false,
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={disabled ? undefined : onToggle}
    className={`relative inline-flex w-11 h-6 rounded-full transition-colors flex-shrink-0
      ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
      ${enabled ? 'bg-primary' : 'bg-gray-300'}`}
  >
    <span
      className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5
        ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
    />
  </button>
);



// ── Workflow Card

interface WorkflowCardProps {
  title: string;
  description?: string;
  descriptionLink?: boolean;
  enabled: boolean;
  onToggle: () => void;
  requiresLabel?: string;
  infoText?: string;
  warningText?: string;
  disabled?: boolean;
}

const WorkflowCard = ({
  title,
  description,
  descriptionLink = false,
  enabled,
  onToggle,
  requiresLabel,
  infoText,
  warningText,
  disabled = false,
}: WorkflowCardProps) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-3 flex-1">
    {/* Header */}
    <div className="flex items-start justify-between gap-3">
      <h3 className="text-base font-semibold text-gray-900 leading-snug">{title}</h3>
      <Toggle enabled={enabled} onToggle={onToggle} disabled={disabled} />
    </div>

    {/* Requires label */}
    {requiresLabel && (
      <p className="text-xs text-gray-400 -mt-1">{requiresLabel}</p>
    )}

    {/* Description / link */}
    {description && (
      <p className={`text-sm leading-snug ${descriptionLink ? 'text-primary underline cursor-pointer' : 'text-gray-500'}`}>
        {description}
      </p>
    )}

    {/* Info + warning box */}
    {(infoText || warningText) && (
      <div className="rounded-lg border border-gray-200 overflow-hidden text-sm">
        {infoText && (
          <div className="px-3 py-2 text-gray-600 border-b border-gray-200 last:border-b-0">
            {infoText}
          </div>
        )}
        {warningText && (
          <div className="px-3 py-2 flex items-center gap-2 text-gray-500 bg-white">
            <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <span>{warningText}</span>
          </div>
        )}
      </div>
    )}
  </div>
);


const Step3Workflow = ({ onNext, onBack, onSubmit }: StepsProps) => {
  const [workflows, setWorkflows] = useState({
    leadFollowUp: true,
    quoteOffer: false,
    appointmentScheduling: false,
    missedAppointment: false,
  });

  const toggle = (key: keyof typeof workflows) =>
    setWorkflows((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="grid grid-cols-2 gap-4 w-full">
      {/* Lead Follow-Up Automation */}
      <WorkflowCard
        title="Lead Follow-Up Automation"
        description="AI calls and follows up with leads, automatically until response or unsubscribe"
        descriptionLink={false}
        enabled={workflows.leadFollowUp}
        onToggle={() => toggle('leadFollowUp')}
      />

      {/* Quote & Offer Automation */}
      <WorkflowCard
        title="Quote & Offer Automation"
        requiresLabel="Requires CRM connection"
        infoText="AI sends quotes automatically after qualification."
        warningText="Connect your CRM to enable this workflow"
        enabled={workflows.quoteOffer}
        onToggle={() => toggle('quoteOffer')}
        disabled={true}
      />

      {/* Appointment Scheduling & Reminders */}
      <WorkflowCard
        title="Appointment Scheduling & Reminders"
        requiresLabel="Requires calendar connection"
        infoText="AI books meetings and sends reminders."
        warningText="Connect your calendar to enable this workflow"
        enabled={workflows.appointmentScheduling}
        onToggle={() => toggle('appointmentScheduling')}
        disabled={true}
      />

      {/* Missed Appointment Recovery */}
      <WorkflowCard
        title="Missed Appointment Recovery"
        description="Follows up on no-shows and cancellations."
        enabled={workflows.missedAppointment}
        onToggle={() => toggle('missedAppointment')}
      />
    </div>
  );
};

export default Step3Workflow;