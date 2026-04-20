'use client';

import React, { useState } from 'react';

type ValidationResult = {
  valid: boolean;
  errors: string[];
};

function validateA2AResponse(res: any): ValidationResult {
  const errors: string[] = [];
  
  if (!res) {
    return { valid: false, errors: ['Response is falsy'] };
  }

  if (res.jsonrpc !== "2.0") {
    errors.push('res.jsonrpc is either missing or !== "2.0"');
  }

  if (!res.result) {
    errors.push('res.result is missing');
  } else {
    if (!res.result.task) {
      errors.push('res.result.task is missing');
    } else {
      if (!res.result.task.status) {
        errors.push('res.result.task.status is missing');
      } else {
        if (!res.result.task.status.state) {
          errors.push('res.result.task.status.state is missing');
        } else {
          const state = res.result.task.status.state;
          const validStates = [
            "PENDING", "RUNNING", "COMPLETED", "FAILED",
            "submitted", "working", "input-required", "completed", "failed", "unknown"
          ];
          if (!validStates.includes(state)) {
            errors.push(`res.result.task.status.state ("${state}") is not one of: ${JSON.stringify(validStates)}`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default function A2ATesterPage() {
  const [inputMessage, setInputMessage] = useState<string>('Patient has high blood pressure, what are the risks?');
  const [sendMode, setSendMode] = useState<'structured' | 'raw'>('structured');
  
  const [rawRequest, setRawRequest] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [responseSummary, setResponseSummary] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  
  const [latency, setLatency] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedTests, setCopiedTests] = useState<boolean>(false);

  const testMessagesLot = [
    "eGFR dropped from 70 to 45 in 2 months",
    "Patient has creatinine 1.8 and HbA1c 9%",
    "Patient ID 5521",
    "Analyze these results: eGFR 45 mL/min (Jan 2024) and eGFR 30 mL/min (April 2024)",
    "Patient with history of hypertension. Creatinine is 2.1 mg/dL, previously 1.5.",
    "HbA1c level is consistently above 8.5% for the last 3 visits, assess renal risk."
  ];

  const copyAllTestMessages = () => {
    navigator.clipboard.writeText(testMessagesLot.join('\n'));
    setCopiedTests(true);
    setTimeout(() => setCopiedTests(false), 2000);
  };

  const loadSampleRequest = () => {
    if (sendMode === 'structured') {
      setInputMessage('Glucose is 180 mg/dL, patient feels dizzy.');
    } else {
      setInputMessage(JSON.stringify({
        "jsonrpc": "2.0",
        "id": "test-sample-123",
        "method": "message/send",
        "params": {
          "message": "Sample external agent request from Prompt Opinion"
        }
      }, null, 2));
    }
  };

  const loadClinicalAnalyzeSample = () => {
    setSendMode('raw');
    const clinicalPayload = {
      jsonrpc: "2.0",
      id: `test-clinical-${Date.now()}`,
      method: "tasks/send",
      params: {
        message: "Analyze renal risk for this patient based on recent trends.",
        fhir_data: [
          {
            resourceType: "Observation",
            effectiveDateTime: "2026-03-01T08:00:00Z",
            code: { text: "eGFR" },
            valueQuantity: { value: 65, unit: "mL/min" }
          },
          {
            resourceType: "Observation",
            effectiveDateTime: "2026-04-10T09:30:00Z",
            code: { text: "eGFR" },
            valueQuantity: { value: 48, unit: "mL/min" }
          },
          {
            resourceType: "Observation",
            effectiveDateTime: "2026-04-12T07:15:00Z",
            code: { text: "HbA1c" },
            valueQuantity: { value: 9.2, unit: "%" }
          }
        ]
      }
    };
    setInputMessage(JSON.stringify(clinicalPayload, null, 2));
  };

  const sendRequest = async () => {
    setIsLoading(true);
    setRawRequest(null);
    setRawResponse(null);
    setResponseSummary(null);
    setValidation(null);
    setLatency(null);
    setCopied(false);

    let payload: any;

    if (sendMode === 'structured') {
      payload = {
        jsonrpc: "2.0",
        id: `test-${Date.now()}`,
        method: "message/send",
        params: {
          message: inputMessage
        }
      };
    } else {
      try {
        payload = JSON.parse(inputMessage);
      } catch (e) {
        alert("Invalid JSON format in raw input.");
        setIsLoading(false);
        return;
      }
    }

    const requestStr = JSON.stringify(payload, null, 2);
    setRawRequest(requestStr);
    
    // Debug mode requirement: Log request + response to console
    console.log("=== A2A Request ===");
    console.log(payload);

    const startTime = performance.now();

    try {
      const res = await fetch('/api/a2a', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: requestStr
      });

      const data = await res.json();
      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));

      const responseStr = JSON.stringify(data, null, 2);
      setRawResponse(responseStr);
      
      // Extract human-readable summary
      const artifacts = data?.result?.task?.artifacts || [];
      const clinicalArt = artifacts.find((a: any) => a.name === 'clinical_analysis') || artifacts[0];
      const summary = clinicalArt?.parts?.[0]?.text || clinicalArt?.text || null;
      setResponseSummary(summary);
      
      console.log("=== A2A Response ===");
      console.log(data);

      const val = validateA2AResponse(data);
      setValidation(val);

    } catch (e: any) {
      const endTime = performance.now();
      setLatency(Math.round(endTime - startTime));
      setRawResponse(`Error: ${e.message}`);
      setValidation({ valid: false, errors: [`Network or Parsing Error: ${e.message}`] });
      console.error("A2A Request Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const copyResponse = () => {
    if (rawResponse) {
      navigator.clipboard.writeText(rawResponse);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans text-gray-900 bg-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6 border-b pb-4 text-gray-800">Prompt Opinion A2A Tester</h1>

      <div className="space-y-6">
        {/* --- Form Section --- */}
        <section className="bg-gray-50 p-6 rounded-md border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Input Controls</h2>
            
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none border border-gray-300 px-3 py-1.5 rounded-md bg-white hover:bg-gray-100">
                <input 
                  type="radio" 
                  name="sendMode" 
                  checked={sendMode === 'structured'}
                  onChange={() => {
                    setSendMode('structured');
                    setInputMessage('');
                  }}
                  className="accent-blue-600"
                />
                Send Structured JSON-RPC
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none border border-gray-300 px-3 py-1.5 rounded-md bg-white hover:bg-gray-100">
                <input 
                  type="radio" 
                  name="sendMode" 
                  checked={sendMode === 'raw'}
                  onChange={() => {
                    setSendMode('raw');
                    setInputMessage('');
                  }}
                  className="accent-blue-600"
                />
                Send Raw
              </label>
            </div>
          </div>

          <textarea
            className="w-full h-40 p-4 font-mono text-sm border-2 border-gray-300 rounded-md bg-white focus:outline-none focus:border-blue-500 transition-colors resize-y"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={sendMode === 'structured' ? "Type your prompt/message here...\n\ne.g., 'Analyze this blood work result...'" : "Enter full JSON-RPC payload here...\n\n{\n  \"jsonrpc\": \"2.0\",\n  \"method\": \"message/send\",\n  ...\n}"}
          />
          
          <div className="flex gap-3 mt-4">
            <button 
              onClick={sendRequest}
              disabled={isLoading || !inputMessage.trim()}
              className="px-6 py-2.5 bg-blue-700 text-white rounded-md hover:bg-blue-800 disabled:opacity-50 font-medium transition-colors border border-blue-900 shadow-sm"
            >
              {isLoading ? 'Sending Request...' : 'Send A2A Request'}
            </button>
            <button 
              onClick={loadSampleRequest}
              className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium border border-gray-400 shadow-sm transition-colors"
            >
              Load Sample Request
            </button>
            <button 
              onClick={loadClinicalAnalyzeSample}
              className="px-6 py-2.5 bg-emerald-100 text-emerald-800 rounded-md hover:bg-emerald-200 font-medium border border-emerald-300 shadow-sm transition-colors"
            >
              Load Clinical Analysis Sample
            </button>
          </div>
        </section>

        {/* --- Validation Section --- */}
        <section className="bg-gray-50 p-6 rounded border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Validation نتيجة</h2>
            {latency !== null && (
               <span className="text-sm font-mono font-medium text-gray-700 bg-white px-3 py-1.5 rounded border border-gray-300 shadow-sm">
                 Latency: <span className={latency > 2000 ? "text-amber-600" : "text-green-600"}>{latency}ms</span>
               </span>
            )}
          </div>
          
          {validation ? (
             <div className={`p-4 rounded-md border-2 shadow-inner bg-white ${validation.valid ? 'border-green-500' : 'border-red-500'}`}>
                <div className={`font-bold mb-3 flex items-center gap-3 text-lg ${validation.valid ? 'text-green-700' : 'text-red-700'}`}>
                  <div className={`w-4 h-4 rounded-full ${validation.valid ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></div>
                  {validation.valid ? 'PASSED: Response schema is fully compliant' : 'FAILED: Schema mismatch detected'}
                </div>
                {!validation.valid && (
                  <div className="bg-red-50 p-3 rounded border border-red-100">
                    <p className="text-sm text-red-800 font-semibold mb-2">Validation Errors Found:</p>
                    <ul className="list-disc pl-5 font-mono text-sm space-y-1 text-red-700">
                      {validation.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
             </div>
          ) : (
            <div className="text-gray-500 italic p-8 text-center bg-white border border-dashed border-gray-300 rounded">
              Awaiting request. Results and validation checks will appear here...
            </div>
          )}
        </section>
        
        {/* --- Message Preview Section --- */}
        {responseSummary && (
          <section className="bg-slate-50 p-6 rounded-md border border-slate-200 shadow-sm animate-in fade-in duration-500">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-blue-600">💬</span> Human-Readable Response
            </h2>
            <div className="bg-white p-5 rounded-lg border border-slate-300 shadow-inner text-slate-800 leading-relaxed whitespace-pre-wrap font-medium text-lg">
              {responseSummary}
            </div>
            <p className="mt-3 text-xs text-slate-500 italic">
              Extracted from <code className="bg-slate-100 px-1 rounded">result.task.artifacts</code>
            </p>
          </section>
        )}

        {/* --- Raw I/O Section --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-gray-800 p-4 rounded-md border border-gray-900 shadow-md flex flex-col">
            <h2 className="text-lg font-semibold mb-3 text-gray-100 font-mono flex items-center gap-2">
              <span className="text-green-400">▶</span> Raw Request
            </h2>
            <pre className="bg-[#0f172a] text-green-400 p-4 rounded border border-gray-700 w-full h-[500px] overflow-auto text-sm flex-grow shadow-inner">
              {rawRequest ? rawRequest : '// Request payload will appear here'}
            </pre>
          </section>

          <section className="bg-gray-800 p-4 rounded-md border border-gray-900 shadow-md flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-gray-100 font-mono flex items-center gap-2">
                <span className="text-blue-400">◀</span> Raw Response
              </h2>
              {rawResponse && (
                <button 
                  onClick={copyResponse}
                  className={`text-xs px-3 py-1.5 font-medium rounded transition-colors border ${copied ? 'bg-green-600 text-white border-green-700' : 'bg-gray-700 text-gray-200 hover:bg-gray-600 border-gray-600'}`}
                >
                  {copied ? '✓ Copied' : 'Copy JSON'}
                </button>
              )}
            </div>
            <pre className="bg-[#0f172a] text-[#60a5fa] p-4 rounded border border-gray-700 w-full h-[500px] overflow-auto text-sm flex-grow shadow-inner overflow-x-auto">
              {rawResponse ? rawResponse : '// Response payload will appear here'}
            </pre>
          </section>
        </div>
        {/* --- Testing Guide Section --- */}
        <section className="bg-blue-50 p-6 rounded border border-blue-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-blue-900 flex items-center gap-2">
              <span className="text-blue-500">ℹ️</span> A2A Testing Guide
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-blue-800">Scenario: Clinical Analysis</h3>
                <button 
                  onClick={copyAllTestMessages}
                  className={`text-[11px] px-2 py-1 font-medium rounded transition-colors border ${copiedTests ? 'bg-green-600 text-white border-green-700' : 'bg-blue-200 text-blue-800 hover:bg-blue-300 border-blue-300'}`}
                >
                  {copiedTests ? '✓ Copied Full Lot' : 'Copy Full Lot'}
                </button>
              </div>
              <p className="text-blue-700 mb-2">Use these strings in "Structured" mode to test AI logic:</p>
              <ul className="list-disc pl-5 space-y-1 text-blue-800 font-mono text-[13px]">
                {testMessagesLot.map((msg, i) => (
                  <li key={i}>"{msg}"</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-blue-800 mb-2">Schema Verification</h3>
              <p className="text-blue-700 mb-2">The validator checks for:</p>
              <ul className="list-disc pl-5 space-y-1 text-blue-800">
                <li>Valid JSON-RPC 2.0 structure</li>
                <li>Presence of <code className="bg-blue-100 px-1 rounded text-blue-900 font-bold">res.result.task.status.state</code></li>
                <li>State must be <code className="bg-blue-100 px-1 rounded text-blue-900 font-bold">completed</code>, <code className="bg-blue-100 px-1 rounded text-blue-900 font-bold">failed</code>, etc.</li>
                <li>Metadata unwrapping capability</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
