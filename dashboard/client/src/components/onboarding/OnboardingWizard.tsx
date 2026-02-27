import useOnboardingWizard from '@/hooks/useOnboardingWizard';
import React from 'react';
import Step1Welcome from './steps/Step1Welcome';
import Step2Tools from './steps/Step2Tools';
import Step3Workflow from './steps/Step3Workflow';
import Step4SetupAi from './steps/Step4SetupAi';
import Step5Preference from './steps/Step5Preference';
import Step6GoLive from './steps/Step6GoLive';
import StepIndicator from './StepIndicator';
import OnboardingIntro from './OnboardingIntro';
import FinalReview from './steps/FinalReview';
import { Link } from 'wouter';
import { useTheme } from '@/contexts/ThemeContext';
import { BoostMyLeadWhiteIcon } from '../BoostMyLeadWhiteIcon';
import { BoostMyLeadIcon } from '../BoostMyLeadIcon';
import { ChevronLeft } from 'lucide-react';

const steps = [
  {
    title: "Business",
    label: "Customer Setup Wizard",
    description: "A guided setup to get your AI revenue system ready—step by step.",
    component: Step1Welcome
  },
  {
    label: "Connect Your Tools",
    title: "Tools",
    description: "Link your CRM, phone and email system to kickstart automation and provide full functionality.",
    component: Step2Tools
  },
  {
    label: "Create the AI Workflow",
    title: "Workflow",
    description: "A guided setup to get your AI revenue system ready—step by step.",
    component: Step3Workflow
  },
  {
    title: "AI Agent",
    label: "Set Up Your AI Voice Agent",
    description: "Customize how the AI Voice Agent will engage with your callers and identify when to transfer or escalate the call.",
    component: Step4SetupAi
  },
  {
    label: "Set Your Reporting Preferences",
    title: "Report",
    description: "Receive a summary report on your AI system’s activity and performance. elect how often you’d like receive these updates.",
    component: Step5Preference
  },
  {
    title: "Go Live",
    label: "Set Your Reporting Preferences",
    description: "Confirm everything is set up and connected to go live.",
    component: Step6GoLive
  }
];



const OnboardingWizard = () => {
  const { stage, currentStep, formData, next, back, submit } = useOnboardingWizard();
  const { theme } = useTheme();

  if (stage === 'intro') {
    return <OnboardingIntro onStart={next} />;
  }

  if (stage === 'review') {
    return <FinalReview formData={formData} onSubmit={submit} onBack={back} />;
  }

  const currentStepData = steps[currentStep];
  const CurrentStepComponent = currentStepData.component;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background relative">
      {/* Logo Top Right */}
      <div className="absolute top-6 right-6">
        {theme === 'light' ? (
          <BoostMyLeadWhiteIcon width={180} height={90} className="hover:opacity-80 transition-opacity text-black" />
        ) : (
          <BoostMyLeadIcon width={180} height={90} className="hover:opacity-80 transition-opacity" />
        )}
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className=" text-3xl lg:text-7xl  font-normal text-foreground mb-2">
            {currentStepData.label}
          </h1>
          <p className="text-muted-foreground text-sm">
            {currentStepData.description}
          </p>
        </header>

        {/* Back Button + Step Indicator */}
        <div className="relative flex items-center mb-8">
          <button
            onClick={back}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <div className="absolute left-1/2 -translate-x-1/2">
            <StepIndicator current={currentStep} total={steps.length} steps={steps} />
          </div>
        </div>
        {/* Step Content */}
        <div className="bg-white dark:bg-card rounded-lg shadow-sm p-8 mb-6">
          <CurrentStepComponent onNext={next} onBack={back} onSubmit={submit} />
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={back}
            className="px-6 py-2.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            Back
          </button>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground text-sm underline transition-colors"
            >
              Skip for now
            </Link>
            <button
              onClick={next}
              className="px-8 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;