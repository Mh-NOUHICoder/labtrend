"use client";
import { useState, useEffect } from "react";

export default function ModelsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/models")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-emerald-500 font-mono text-xl">
        Fetching available models across AI networks...
      </div>
    );
  }

  return (
    <div className="p-10 bg-slate-950 min-h-screen text-slate-200">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">
          AI Model Directory
        </h1>
        <p className="mb-8 text-slate-400">
          We have scanned your API keys in <code>.env.local</code>. Click below to copy the structured dump and paste it back to the AI assistant to select the best models.
        </p>
        
        <button 
          onClick={handleCopy}
          className={`px-6 py-3 rounded-lg text-white font-bold transition duration-300 shadow-lg ${
            copied ? "bg-indigo-500 shadow-indigo-500/30" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
          } mb-6`}
        >
          {copied ? "Copied Successfully! ✓" : "Copy All JSON to Clipboard 📋"}
        </button>

        <pre className="bg-slate-900 p-6 rounded-xl overflow-auto text-sm max-h-[600px] border border-slate-700/50 shadow-inner">
          <code className="text-emerald-400/80">
            {JSON.stringify(data, null, 2)}
          </code>
        </pre>
      </div>
    </div>
  );
}
