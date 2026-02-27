import Step1Welcome from "@/components/onboarding/steps/Step1Welcome";
import Step2Tools from "@/components/onboarding/steps/Step2Tools";
import Step3Workflow from "@/components/onboarding/steps/Step3Workflow";
import Step4SetupAi from "@/components/onboarding/steps/Step4SetupAi";
import Step5Preference from "@/components/onboarding/steps/Step5Preference";
import Step6GoLive from "@/components/onboarding/steps/Step6GoLive";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Redirect, useLocation } from "wouter";

type Stage = "intro" | "steps" | "review";
const steps = [Step1Welcome, Step2Tools, Step3Workflow, Step4SetupAi, Step5Preference, Step6GoLive];

const useOnboardingWizard = () => {
  const [stage, setStage] = useState<Stage>("intro");
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [location, setLocation] = useLocation();

  const next = (stepData = {}) => {
    setFormData((prev) => ({ ...prev, ...stepData }));
    if (stage === "intro") {
      setCurrentStep(0);
      setStage("steps");
    } else if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setStage("review");
    }
  };

  const back = () => {
    if (stage === "review") {
      setStage("steps");
    } else if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      setStage("intro");
    }
  };

  const submit = async () => {
    await apiRequest("post", "/api/onboarding/complete", formData);
    setLocation("/dashboard");
  };

  return { stage, currentStep, formData, next, back, submit };
};

export default useOnboardingWizard;
