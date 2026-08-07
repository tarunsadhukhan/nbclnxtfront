import * as React from "react";
import { tokens } from "@/styles/tokens";
import { Check, AlertCircle } from "lucide-react";

interface Step {
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface StepperProps {
  steps: Step[];
  activeStep: number;
  onStepClick: (stepIndex: number) => void;
  completedSteps: Set<number>;
  errorSteps?: Set<number>;
  orientation?: "horizontal" | "vertical";
  disabled?: boolean;
}

function StepIndicator({
  index,
  isActive,
  isCompleted,
  isError,
  icon,
}: {
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  isError: boolean;
  icon?: React.ReactNode;
}) {
  const size = "w-9 h-9";
  const base = `${size} rounded-full flex items-center justify-center text-sm font-semibold transition-colors shrink-0`;

  if (isError) {
    return (
      <span className={`${base} bg-red-100 text-red-600 border-2 border-red-400`}>
        <AlertCircle className="w-4 h-4" />
      </span>
    );
  }
  if (isCompleted) {
    return (
      <span
        className={`${base} text-white border-2`}
        style={{ backgroundColor: tokens.brand.primary, borderColor: tokens.brand.primary }}
      >
        <Check className="w-4 h-4" />
      </span>
    );
  }
  if (isActive) {
    return (
      <span
        className={`${base} text-white border-2`}
        style={{ backgroundColor: tokens.brand.primary, borderColor: tokens.brand.primary }}
      >
        {icon ?? index + 1}
      </span>
    );
  }
  return (
    <span className={`${base} bg-neutral-100 text-neutral-500 border-2 border-neutral-300`}>
      {icon ?? index + 1}
    </span>
  );
}

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  (
    {
      steps,
      activeStep,
      onStepClick,
      completedSteps,
      errorSteps,
      orientation = "horizontal",
      disabled = false,
    },
    ref,
  ) => {
    const errorSet = errorSteps ?? new Set<number>();
    const maxClickable = Math.max(...Array.from(completedSteps), -1) + 1;

    const isHorizontal = orientation === "horizontal";
    const containerClass = isHorizontal
      ? "flex items-center gap-2 w-full"
      : "flex flex-col gap-4";

    return (
      <div ref={ref} className={containerClass} role="list">
        {steps.map((step, idx) => {
          const isCompleted = completedSteps.has(idx);
          const isActive = activeStep === idx;
          const isError = errorSet.has(idx);
          const isClickable = !disabled && (idx <= maxClickable || isCompleted);

          return (
            <React.Fragment key={idx}>
              <button
                type="button"
                role="listitem"
                aria-current={isActive ? "step" : undefined}
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(idx)}
                className={`flex items-center gap-2 group ${isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-60"} ${isHorizontal ? "" : "w-full"}`}
              >
                <StepIndicator
                  index={idx}
                  isActive={isActive}
                  isCompleted={isCompleted}
                  isError={isError}
                  icon={step.icon}
                />
                <div className={`flex flex-col text-left ${isHorizontal ? "hidden sm:flex" : ""}`}>
                  <span
                    className={`text-sm font-medium leading-tight ${isActive ? "text-neutral-900" : "text-neutral-600"}`}
                  >
                    {step.label}
                  </span>
                  {step.description && (
                    <span className="text-xs text-neutral-400 leading-tight">
                      {step.description}
                    </span>
                  )}
                </div>
              </button>

              {/* connector line */}
              {idx < steps.length - 1 && isHorizontal && (
                <div
                  className="flex-1 h-0.5 min-w-4"
                  style={{
                    backgroundColor: completedSteps.has(idx)
                      ? tokens.brand.primary
                      : tokens.neutral[200],
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  },
);
Stepper.displayName = "Stepper";

export { Stepper };
export type { StepperProps, Step };
