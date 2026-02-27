import React from 'react';

interface Step {
  title: string;
  description: string;
  component: React.ComponentType<any>;
}

interface StepIndicatorProps {
  current: number;
  total: number;
  steps: Step[];
}

const StepIndicator = ({ current, total, steps }: StepIndicatorProps) => {
  return (
    <div className="flex items-center">
      {steps.map((step, index) => {
        const isActive = index === current;
        const isCompleted = index < current;

        return (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center">
              {/* Circle */}
              <div
                className={`
                  w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                  ${isActive ? 'bg-primary ring-4 ring-primary/25' : ''}
                  ${isCompleted ? 'bg-primary' : ''}
                  ${!isActive && !isCompleted ? 'bg-gray-300' : ''}
                `}
              >
                {isCompleted && (
                  <svg className="w-3 h-3" fill="none" stroke="white" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              {/* Label */}
              <span
                className={`
                  mt-2 text-xs whitespace-nowrap transition-all
                  ${isActive ? 'font-bold text-foreground' : 'font-normal text-muted-foreground'}
                `}
              >
                {step.title}
              </span>
            </div>

            {/* Connector line */}
            {index < total - 1 && (
              <div
                className={`
                  h-px flex-1 min-w-12 mb-5 transition-all
                  ${isCompleted ? 'bg-primary' : 'bg-gray-300'}
                `}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepIndicator;