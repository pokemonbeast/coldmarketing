"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import {
  Brain,
  Mail,
  Megaphone,
  Pause,
  RotateCcw,
  Zap,
  CheckCircle2,
} from "lucide-react";

// Social media platform icons as SVG components
const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const RedditIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
  </svg>
);

const ThreadsIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.33-3.022.88-.73 2.082-1.123 3.479-1.14.964-.01 1.836.109 2.609.355.013-.553-.07-1.049-.254-1.475-.262-.606-.716-1.064-1.348-1.363-.683-.322-1.547-.49-2.568-.502l-.028-.001c-1.097 0-2.032.267-2.703.771-.618.464-.94 1.048-.94 1.69 0 .193.02.36.063.497l-2.086.422c-.089-.388-.135-.803-.135-1.238 0-1.193.513-2.29 1.447-3.095.986-.85 2.372-1.317 3.904-1.317l.043.001c1.424.017 2.654.283 3.656.791 1.025.52 1.783 1.276 2.254 2.248.432.89.625 1.924.573 3.072.766.39 1.43.878 1.96 1.45.876.95 1.423 2.162 1.578 3.503.191 1.65-.217 3.28-1.181 4.716-1.123 1.674-2.883 2.912-5.088 3.58-1.27.385-2.693.58-4.232.58zm.01-8.68l-.036.001c-.92.014-1.66.225-2.137.61-.405.326-.616.752-.591 1.198.033.583.332 1.064.866 1.39.583.358 1.382.53 2.249.485 1.088-.058 1.946-.474 2.552-1.236.477-.6.798-1.398.951-2.372-.586-.17-1.224-.262-1.906-.27l-.042-.001c-.637 0-1.28.064-1.906.194z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

type WorkflowStep = "idle" | "learning" | "marketing" | "engaging" | "complete";

interface StepConfig {
  id: WorkflowStep;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const steps: StepConfig[] = [
  {
    id: "learning",
    label: "Learn",
    icon: <Brain className="w-7 h-7" />,
    description: "Training on your business",
  },
  {
    id: "marketing",
    label: "Market",
    icon: <Megaphone className="w-7 h-7" />,
    description: "Reaching prospects everywhere",
  },
  {
    id: "engaging",
    label: "Engage",
    icon: <Mail className="w-7 h-7" />,
    description: "Engaging across all platforms",
  },
];

const socialPlatforms = [
  { icon: <LinkedInIcon />, name: "LinkedIn Posts", color: "#0A66C2" },
  { icon: <YouTubeIcon />, name: "YouTube Comments", color: "#FF0000" },
  { icon: <RedditIcon />, name: "Reddit Comments", color: "#FF4500" },
  { icon: <XIcon />, name: "X Comments", color: "#000000" },
  { icon: <ThreadsIcon />, name: "Threads Comments", color: "#000000" },
  { icon: <FacebookIcon />, name: "Facebook Posts", color: "#1877F2" },
];

export default function AgentWorkflowCard() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("idle");
  const [isPaused, setIsPaused] = useState(false);
  const [statusText, setStatusText] = useState("Agent ready");
  const [greenIconCount, setGreenIconCount] = useState(0);

  const getStepIndex = useCallback((step: WorkflowStep) => {
    if (step === "idle") return -1;
    if (step === "complete") return steps.length;
    return steps.findIndex((s) => s.id === step);
  }, []);

  const runDemo = useCallback(() => {
    if (isPaused) return;

    const sequence: { step: WorkflowStep; status: string; delay: number }[] = [
      { step: "learning", status: "Analyzing your business data...", delay: 0 },
      { step: "learning", status: "Training AI on your ideal customers...", delay: 1500 },
      { step: "marketing", status: "Finding relevant conversations online...", delay: 3000 },
      { step: "engaging", status: "Replying in comments and threads promoting your business...", delay: 5000 },
      { step: "complete", status: "Marketing automation active!", delay: 9000 },
      { step: "idle", status: "Agent ready", delay: 11000 },
    ];

    sequence.forEach(({ step, status, delay }) => {
      setTimeout(() => {
        if (!isPaused) {
          setCurrentStep(step);
          setStatusText(status);
          // Reset green icon count when entering engaging step
          if (step === "engaging") {
            setGreenIconCount(0);
          }
          // Reset when going back to idle
          if (step === "idle") {
            setGreenIconCount(0);
          }
        }
      }, delay);
    });

    // Animate icons turning green one by one during engaging step
    const iconDelays = [5300, 5600, 5900, 6200, 6500, 6800]; // Staggered timing
    iconDelays.forEach((delay, index) => {
      setTimeout(() => {
        if (!isPaused) {
          setGreenIconCount(index + 1);
        }
      }, delay);
    });
  }, [isPaused]);

  useEffect(() => {
    // Start demo on mount
    const timer = setTimeout(() => {
      runDemo();
    }, 1000);

    return () => clearTimeout(timer);
  }, [runDemo]);

  useEffect(() => {
    // Loop the demo
    if (currentStep === "idle" && !isPaused) {
      const timer = setTimeout(() => {
        runDemo();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isPaused, runDemo]);

  const handlePause = () => {
    setIsPaused(!isPaused);
    if (isPaused) {
      // Resume demo
      runDemo();
    }
  };

  const handleReset = () => {
    setCurrentStep("idle");
    setStatusText("Agent ready");
    setIsPaused(false);
    setGreenIconCount(0);
    setTimeout(() => runDemo(), 500);
  };

  const isStepActive = (stepId: WorkflowStep) => currentStep === stepId;
  const isStepCompleted = (stepId: WorkflowStep) => {
    const currentIndex = getStepIndex(currentStep);
    const stepIndex = getStepIndex(stepId);
    return currentIndex > stepIndex;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      className="w-full max-w-xl"
    >
      <div className="glass-card p-6 relative overflow-hidden">
        {/* Card glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />

        {/* Header */}
        <div className="relative flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-semibold text-lg">
              Marketing Agent
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePause}
              className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
              title={isPaused ? "Resume demo" : "Pause demo"}
            >
              {isPaused ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 flex items-center justify-center"
                >
                  <div className="w-0 h-0 border-l-8 border-l-white border-y-4 border-y-transparent ml-0.5" />
                </motion.div>
              ) : (
                <Pause className="w-5 h-5 text-gray-300" />
              )}
            </button>
            <button
              onClick={handleReset}
              className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
              title="Reset demo"
            >
              <RotateCcw className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="relative flex items-center justify-between gap-2 mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Box */}
              <motion.div
                className={`relative flex flex-col items-center justify-center p-4 rounded-2xl flex-1 min-h-[100px] transition-all duration-500 ${
                  isStepActive(step.id)
                    ? "workflow-step active"
                    : isStepCompleted(step.id)
                    ? "workflow-step completed"
                    : "workflow-step"
                }`}
                animate={
                  isStepActive(step.id)
                    ? {
                        scale: [1, 1.02, 1],
                      }
                    : {}
                }
                transition={{
                  duration: 1.5,
                  repeat: isStepActive(step.id) ? Infinity : 0,
                  ease: "easeInOut",
                }}
              >
                {/* Show social icons for Engage step when active */}
                {step.id === "engaging" && isStepActive(step.id) ? (
                  <>
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                      {socialPlatforms.map((platform, i) => {
                        const isGreen = i < greenIconCount;
                        return (
                          <motion.div
                            key={platform.name}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ 
                              opacity: 1, 
                              scale: isGreen ? [1, 1.2, 1] : 1,
                            }}
                            transition={{ 
                              opacity: { delay: i * 0.08 },
                              scale: { duration: 0.3 }
                            }}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                              isGreen 
                                ? "bg-green-500/30 text-green-400" 
                                : "bg-slate-700/50 text-gray-300"
                            }`}
                            title={platform.name}
                          >
                            <div className="w-4 h-4 flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4">
                              {platform.icon}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                    <span className="text-sm font-medium text-white">
                      {step.label}
                    </span>
                  </>
                ) : (
                  <>
                    {/* Icon */}
                    <motion.div
                      className={`mb-2 transition-colors duration-500 ${
                        isStepActive(step.id)
                          ? "text-blue-400"
                          : isStepCompleted(step.id)
                          ? "text-green-400"
                          : "text-gray-500"
                      }`}
                      animate={
                        isStepActive(step.id)
                          ? { rotate: [0, 5, -5, 0] }
                          : {}
                      }
                      transition={{
                        duration: 2,
                        repeat: isStepActive(step.id) ? Infinity : 0,
                      }}
                    >
                      {isStepCompleted(step.id) ? (
                        <CheckCircle2 className="w-7 h-7" />
                      ) : (
                        step.icon
                      )}
                    </motion.div>

                    {/* Label */}
                    <span
                      className={`text-sm font-medium transition-colors duration-500 ${
                        isStepActive(step.id)
                          ? "text-white"
                          : isStepCompleted(step.id)
                          ? "text-green-400"
                          : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </>
                )}

                {/* Active indicator dots */}
                {isStepActive(step.id) && (
                  <motion.div
                    className="absolute -bottom-1 flex gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-blue-400"
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </motion.div>

              {/* Arrow Connector */}
              {index < steps.length - 1 && (
                <div className="flex items-center px-2">
                  <motion.svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`transition-colors duration-500 ${
                      isStepCompleted(steps[index + 1].id) ||
                      isStepActive(steps[index + 1].id)
                        ? "text-blue-400"
                        : "text-gray-600"
                    }`}
                    animate={
                      isStepActive(steps[index + 1].id)
                        ? { x: [0, 4, 0] }
                        : {}
                    }
                    transition={{
                      duration: 1,
                      repeat: isStepActive(steps[index + 1].id) ? Infinity : 0,
                    }}
                  >
                    <path
                      d="M9 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </motion.svg>
                </div>
              )}
            </div>
          ))}

        </div>

        {/* Status Bar */}
        <motion.div
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800/30"
          key={statusText}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className={`w-2 h-2 rounded-full ${
              currentStep === "complete"
                ? "bg-green-400"
                : currentStep === "idle"
                ? "bg-gray-400"
                : "bg-blue-400"
            }`}
            animate={
              currentStep !== "idle" && currentStep !== "complete"
                ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }
                : {}
            }
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span
            className={`text-sm font-medium ${
              currentStep === "complete"
                ? "text-green-400"
                : currentStep === "idle"
                ? "text-gray-400"
                : "text-blue-400"
            }`}
          >
            {statusText}
          </span>
        </motion.div>
      </div>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center text-gray-500 text-sm mt-4"
      >
        This runs automatically every day. No manual work required.
      </motion.p>
    </motion.div>
  );
}

