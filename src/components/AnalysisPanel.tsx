"use client";

import { motion } from "framer-motion";

interface AnalysisPanelProps {
  clinical_summary: string;
  recommended_actions: string[];
  key_factors: string[];
  confidence: number;
}

export default function AnalysisPanel({
  clinical_summary,
  recommended_actions,
  key_factors,
  confidence,
}: AnalysisPanelProps) {
  // Convert 0.85 to 85 if it's a decimal <= 1, otherwise assume it's already a percentage.
  const displayConfidence = confidence <= 1 ? Math.round(confidence * 100) : confidence;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.01 }}
      className="group rounded-xl bg-gradient-to-br from-slate-700/50 via-slate-800/30 to-slate-900/50 p-[1px] transition-all duration-500 hover:from-indigo-500/40 hover:to-purple-500/40"
    >
      <div className="relative flex h-full w-full flex-col space-y-4 rounded-xl bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl transition-all duration-500">
        <div className="relative z-10 flex items-start justify-between border-b border-slate-700/50 pb-4">
          <div className="pr-4">
            <h3 className="text-lg font-semibold text-slate-200">Clinical Summary</h3>
            <p className="mt-1 leading-relaxed text-sm text-slate-300 transition-colors group-hover:text-slate-200">
              {clinical_summary}
            </p>
          </div>
          <div className="flex flex-col items-end whitespace-nowrap">
            <span className="text-xs uppercase tracking-wider text-slate-500">
              Confidence
            </span>
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-xl font-bold text-transparent">
              {displayConfidence}%
            </span>
          </div>
        </div>

        {key_factors && key_factors.length > 0 && (
          <div className="relative z-10 pt-2 border-b border-slate-700/50 pb-4">
            <h4 className="mb-3 text-sm font-medium text-slate-400">
              Key Risk Factors
            </h4>
            <ul className="list-inside list-disc space-y-2 text-sm text-slate-300">
              {key_factors.map((factor, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                  className="leading-relaxed transition-colors group-hover:text-slate-200"
                >
                  {factor}
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        <div className="relative z-10 pt-2">
          <h4 className="mb-3 text-sm font-medium text-slate-400">
            Recommended Action Plan
          </h4>
          <ul className="list-inside list-disc space-y-2 text-sm text-slate-300">
            {recommended_actions.map((rec, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="leading-relaxed transition-colors group-hover:text-slate-200"
              >
                {rec}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Subtle hover background effect */}
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </div>
    </motion.div>
  );
}
