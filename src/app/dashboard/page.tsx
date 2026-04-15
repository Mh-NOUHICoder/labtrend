"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import AnalysisPanel from "../../components/AnalysisPanel";
import RiskBadge from "../../components/RiskBadge";

type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

interface AnalysisResult {
  agent?: string;
  risk_level: RiskLevel;
  clinical_summary: string;
  key_factors: string[];
  recommended_actions: string[];
  confidence: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [labData, setLabData] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    async function fetchDataAndAnalyze() {
      try {
        setLoading(true);
        // 1. Fetch lab data
        const labsRes = await fetch("/api/search-labs");
        const labs = await labsRes.json();
        setLabData(labs);

        // 2. Send to AI for analysis
        const analyzeRes = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lab_data: labs }),
        });
        const result = await analyzeRes.json();
        setAnalysis(result);
      } catch (error) {
        console.error("Dashboard Error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDataAndAnalyze();
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 p-6 text-slate-50 md:p-12">
      {/* Background glow effects */}
      <div className="absolute -left-[10%] -top-[20%] h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="absolute -right-[10%] -bottom-[20%] h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <h1 className="relative z-10 mb-8 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
          Dashboard
        </h1>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {/* 1. Chart section */}
        <motion.div variants={item} className="lg:col-span-2">
          <div className="group h-full rounded-xl bg-gradient-to-br from-slate-700/50 via-slate-800/30 to-slate-900/50 p-[1px] transition-all duration-500 hover:from-emerald-500/40 hover:to-indigo-500/40">
            <div className="flex h-full min-h-[300px] flex-col rounded-xl bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl transition-all duration-500">
              <h2 className="mb-4 text-lg font-semibold text-slate-200">
                Lab Value Trends
              </h2>
              <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-slate-700/50 bg-slate-800/20 p-4 transition-all duration-500 group-hover:border-emerald-500/30 group-hover:bg-slate-800/40">
                {loading ? (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    <span className="text-sm text-slate-400">Loading lab data...</span>
                  </div>
                ) : (
                  <div className="flex w-full flex-col space-y-2 pt-2 text-sm text-slate-300">
                    <div className="mb-2 flex w-full justify-between border-b border-slate-600/50 pb-2 font-semibold">
                      <span>Date</span>
                      <span>LOINC</span>
                      <span>Result</span>
                    </div>
                    {labData.map((lab, i) => (
                      <div
                        key={i}
                        className="flex w-full justify-between border-b border-slate-700/30 pb-2"
                      >
                        <span className="text-slate-400">{lab.date}</span>
                        <span>{lab.loinc}</span>
                        <span className="font-medium text-emerald-400">
                          {lab.value} <span className="text-xs">{lab.unit}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* 2. Risk indicator section */}
        <motion.div variants={item}>
          <div className="group h-full rounded-xl bg-gradient-to-br from-slate-700/50 via-slate-800/30 to-slate-900/50 p-[1px] transition-all duration-500 hover:from-emerald-500/40 hover:to-indigo-500/40">
            <div className="flex h-full min-h-[300px] flex-col rounded-xl bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl transition-all duration-500">
              <h2 className="mb-4 text-lg font-semibold text-slate-200">
                Risk Assessment
              </h2>
              <div className="flex flex-1 flex-col items-center justify-center rounded-lg bg-slate-800/20 transition-colors group-hover:bg-slate-800/30">
                {loading ? (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    <span className="text-sm text-slate-400">Analyzing risk...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-slate-700/50 bg-slate-800/50 shadow-lg transition-transform duration-500 group-hover:scale-105">
                      {analysis?.risk_level ? (
                        <div className="scale-150">
                          <RiskBadge riskLevel={analysis.risk_level} />
                        </div>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </div>
                    <p className="mt-6 text-sm text-slate-400 transition-colors group-hover:text-slate-300">
                      Probability of kidney complication
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* 3. AI analysis section */}
        <motion.div variants={item} className="md:col-span-2 lg:col-span-3">
          {loading ? (
            <div className="group rounded-xl bg-gradient-to-br from-slate-700/50 via-slate-800/30 to-slate-900/50 p-[1px]">
              <div className="flex min-h-[220px] items-center justify-center rounded-xl bg-slate-900/80 p-6 backdrop-blur-xl">
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  <span className="text-sm text-slate-400">
                    AI is processing insights and generating recommendations...
                  </span>
                </div>
              </div>
            </div>
          ) : analysis ? (
            <AnalysisPanel
              clinical_summary={analysis.clinical_summary || "No clinical summary provided."}
              recommended_actions={analysis.recommended_actions || []}
              key_factors={analysis.key_factors || []}
              confidence={analysis.confidence || 0}
            />
          ) : (
            <div className="group rounded-xl bg-gradient-to-br from-slate-700/50 via-slate-800/30 to-slate-900/50 p-[1px]">
              <div className="flex min-h-[220px] items-center justify-center rounded-xl bg-slate-900/80 p-6 backdrop-blur-xl">
                <span className="text-sm text-slate-500">
                  Data unavailable or analysis failed.
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
