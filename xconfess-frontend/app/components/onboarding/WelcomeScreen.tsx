"use client";

import { useState } from "react";
import { Sparkles, Lock, Heart, Zap, X } from "lucide-react";

interface Props {
  onStart: () => void;
  onSkip: () => void;
  onClose?: () => void; // optional: triggered if modal is closed
}

export const WelcomeScreen = ({ onStart, onSkip, onClose }: Props) => {
  const [show, setShow] = useState(true);

  if (!show) return null;

  const features = [
    {
      icon: Lock,
      title: "Anonymous & Safe",
      description: "Share freely without revealing your identity",
    },
    {
      icon: Heart,
      title: "Community Support",
      description: "Connect with others through reactions and empathy",
    },
    {
      icon: Sparkles,
      title: "Blockchain Powered",
      description: "Optional Stellar integration for permanent storage",
    },
    {
      icon: Zap,
      title: "Simple & Fast",
      description: "Easy to use interface for quick confessions",
    },
  ];

  const handleStart = () => {
    setShow(false);
    onStart();
  };

  const handleSkip = () => {
    setShow(false);
    onSkip();
  };

  const handleClose = () => {
    setShow(false);
    if (onClose) onClose(); // start tour if user closes modal
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-zinc-900 rounded-2xl max-w-lg w-full p-6 relative shadow-lg">
        {/* Close button */}
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
          onClick={handleClose}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <h2 className="text-2xl font-bold text-white mb-2">
          Welcome to XConfess
        </h2>
        <p className="text-gray-300 mb-4">
          Your safe space for anonymous confessions
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="flex items-start gap-3 bg-zinc-800 p-3 rounded-lg"
              >
                <Icon className="w-6 h-6 text-purple-500 mt-1" />
                <div>
                  <h3 className="text-white font-semibold">{feature.title}</h3>
                  <p className="text-gray-300 text-sm">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleStart}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition"
          >
            Start Tour
          </button>
          <button
            onClick={handleSkip}
            className="flex-1 border border-gray-600 text-gray-300 hover:bg-zinc-800 py-2 rounded-lg transition"
          >
            Skip & Explore
          </button>
        </div>

        <p className="text-gray-500 text-xs mt-3 text-center">
          You can restart the tour anytime from settings
        </p>
      </div>
    </div>
  );
};
