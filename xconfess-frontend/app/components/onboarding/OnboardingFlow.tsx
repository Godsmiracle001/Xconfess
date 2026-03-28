"use client";

import { useEffect, useState } from "react";
import { useOnboardingStore } from "@/app/lib/store/onboardingStore";
import { WelcomeScreen } from "./WelcomeScreen";
import { FeatureTour } from "./FeatureTour";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { ONBOARDING_STEPS } from "@/app/lib/types/onboarding.types";

export const OnboardingFlow = () => {
  const {
    isCompleted,
    hasSeenWelcome,
    markWelcomeSeen,
    skipOnboarding,
    completeOnboarding,
  } = useOnboardingStore();

  const [showWelcome, setShowWelcome] = useState(false);
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    if (!isCompleted && !hasSeenWelcome) {
      setTimeout(() => setShowWelcome(true), 500);
    }
  }, [isCompleted, hasSeenWelcome]);

  // ✅ Wait until all targets exist in the DOM
  const startTourWhenReady = () => {
    const checkTargets = () => {
      const allExist = ONBOARDING_STEPS.every((step) =>
        document.querySelector(step.target),
      );
      if (allExist) {
        setRunTour(true); // Start tour
      } else {
        setTimeout(checkTargets, 100); // retry until ready
      }
    };
    checkTargets();
  };

  // Welcome modal button handlers
  const handleStartTour = () => {
    markWelcomeSeen();
    setShowWelcome(false);

    // Wait until the DOM has rendered the targets
    const startWhenReady = () => {
      const allExist = ONBOARDING_STEPS.every((step) =>
        document.querySelector(step.target),
      );

      if (allExist) {
        setRunTour(true); // Start tour
      } else {
        setTimeout(startWhenReady, 100); // retry
      }
    };

    setTimeout(startWhenReady, 300); // small delay for modal to close
  };

  const handleSkipWelcome = () => {
    markWelcomeSeen();
    setShowWelcome(false);
    skipOnboarding();
  };

  const handleCompleteTour = () => {
    setRunTour(false);
    completeOnboarding();
  };

  const handleSkipTour = () => {
    setRunTour(false);
    skipOnboarding();
  };

  return (
    <>
      {showWelcome && (
        <WelcomeScreen onStart={handleStartTour} onSkip={handleSkipWelcome} />
      )}

      {runTour && !isCompleted && (
        <FeatureTour
          run={runTour}
          onComplete={handleCompleteTour}
          onSkip={handleSkipTour}
        />
      )}

      {!isCompleted && <OnboardingChecklist />}
    </>
  );
};
