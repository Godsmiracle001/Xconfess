"use client";

import { useOnboardingStore } from "@/app/lib/store/onboardingStore";
import { Check, ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { useState } from "react";

export const OnboardingChecklist = () => {
  const { tutorialSteps, getTutorialProgress } = useOnboardingStore();
  const [isExpanded, setIsExpanded] = useState(true);

  const progress = getTutorialProgress();
  const completedCount = tutorialSteps.filter((s) => s.completed).length;
  const totalCount = tutorialSteps.length;
  const isComplete = completedCount === totalCount;

  if (isComplete && !isExpanded) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg overflow-hidden z-50">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800 transition-colors"
      >
        <div>
          <h4 className="font-semibold text-white">Getting Started</h4>
          <p className="text-xs text-gray-400">
            {completedCount} of {totalCount} completed
          </p>
        </div>
        <div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-300" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-300" />
          )}
        </div>
      </button>

      {/* Progress bar */}
      {isExpanded && (
        <>
          <div className="h-2 bg-zinc-700 rounded-full mx-4 mt-2">
            <div
              className="h-2 bg-green-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Tutorial Steps */}
          <div className="p-4 space-y-2">
            {tutorialSteps.map((step) => (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                  step.completed
                    ? "bg-green-500/10 border-green-500/20"
                    : "bg-zinc-800/50 border-zinc-700"
                }`}
              >
                {/* Icon */}
                <div className="w-6 h-6 flex items-center justify-center">
                  {step.completed ? (
                    <Check className="text-green-500 w-5 h-5" />
                  ) : (
                    step.icon
                  )}
                </div>

                {/* Title & description */}
                <div className="flex-1">
                  <h5 className="text-white font-medium">{step.title}</h5>
                  <p className="text-gray-400 text-sm">{step.description}</p>
                </div>

                {/* Required badge */}
                {step.required && !step.completed && (
                  <span className="text-xs font-semibold text-red-400 bg-red-900/30 px-2 py-0.5 rounded">
                    Required
                  </span>
                )}
              </div>
            ))}

            {/* Completion message */}
            {isComplete && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-green-500/20 rounded-lg text-green-400 font-semibold">
                <Trophy className="w-5 h-5" /> 🎉 Congratulations! You've
                completed all onboarding steps
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
