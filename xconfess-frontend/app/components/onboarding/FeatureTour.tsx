"use client";

import { useState } from "react";
import {Joyride} from "react-joyride";
import type { CallBackProps, STATUS, Step } from "react-joyride";
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

  const steps: Step[] = ONBOARDING_STEPS.map((step) => ({
    target: step.target,
    content: (
      <div className="p-2 rounded-lg bg-zinc-800 font-sans">
        <h3 className="font-bold text-lg text-white">{step.title}</h3>
        <p className="mt-1 text-sm text-gray-200">{step.description}</p>
      </div>
    ),
    placement: step.placement as any,
    disableBeacon: step.disableBeacon,
    spotlightClicks: step.spotlightClicks,
    styles: {
      options: {
        zIndex: 10000,
        overlayColor: "rgba(0,0,0,0.8)",
        primaryColor: "#7c3aed",
        textColor: "#fff",
        width: 380,
        arrowColor: "#7c3aed",
        spotlightShadow: "0 0 20px rgba(124, 58, 237, 0.6)",
      },
      buttonNext: {
        backgroundColor: "#7c3aed",
        borderRadius: "8px",
        color: "#fff",
        padding: "6px 14px",
        fontWeight: "bold",
      },
      buttonBack: {
        backgroundColor: "#555",
        borderRadius: "8px",
        color: "#fff",
        padding: "6px 14px",
      },
      buttonSkip: {
        color: "#aaa",
        fontWeight: "bold",
      },
    },
  }));

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, type } = data;

    if (type === "step:after") {
      completeStep(ONBOARDING_STEPS[index].id);
      setCurrentStep(index + 1);
      setStepIndex(index + 1);
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onComplete();

      // Focus Post Confession button after tour ends
      const postButton = document.querySelector<HTMLButtonElement>(
        ".create-confession-button",
      );
      if (postButton) {
        postButton.classList.add("animate-pulse");
        postButton.focus();
      }
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      disableScrolling={false}
      spotlightPadding={10}
      callback={handleJoyrideCallback}
    />
  );
};
