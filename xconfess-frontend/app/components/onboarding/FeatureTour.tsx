"use client";

import { useEffect, useState } from "react";
import { ONBOARDING_STEPS } from "@/app/lib/types/onboarding.types";
import { useOnboardingStore } from "@/app/lib/store/onboardingStore";

interface Props {
  run: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const FeatureTour = ({ run, onComplete, onSkip }: Props) => {
  const { setCurrentStep, completeStep } = useOnboardingStore();
  const [stepIndex, setStepIndex] = useState(0);
  const step = ONBOARDING_STEPS[stepIndex];
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;

  useEffect(() => {
    if (!run || !step) return;

    const target = document.querySelector(step.target);
    if (!target) return;

    target.classList.add("ring-2", "ring-purple-500", "rounded-lg");
    (target as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });

    return () => {
      target.classList.remove("ring-2", "ring-purple-500", "rounded-lg");
    };
  }, [run, step]);

  if (!run || !step) return null;

  const handleNext = () => {
    completeStep(step.id);
    setCurrentStep(stepIndex + 1);

    if (isLastStep) {
      onComplete();
      const postButton = document.querySelector<HTMLButtonElement>(
        ".create-confession-button",
      );
      if (postButton) {
        postButton.classList.add("animate-pulse");
        postButton.focus();
      }
      return;
    }

    setStepIndex((prev) => prev + 1);
  };

  const handleBack = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/70 flex items-end md:items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
        <p className="text-xs uppercase tracking-wide text-zinc-400 mb-2">
          Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
        </p>
        <h3 className="text-lg font-semibold text-white">{step.title}</h3>
        <p className="mt-2 text-sm text-zinc-300">{step.description}</p>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              disabled={stepIndex === 0}
              className="px-3 py-2 text-sm rounded-md bg-zinc-700 text-white disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-3 py-2 text-sm rounded-md bg-purple-600 text-white hover:bg-purple-500"
            >
              {isLastStep ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
