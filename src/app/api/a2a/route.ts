import { NextResponse } from "next/server";
import crypto from "crypto";
import { fromFHIR } from "../../../lib/fhir";
import { runCoreAnalyzer } from "../analyze/route";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

// 🌐 DISCOVERY ENDPOINT (Manifest)
export async function GET() {
  return NextResponse.json({
    name: "LabTrendAgent",
    display_name: "LabTrend Clinical AI",
    version: "1.0.0",
    protocolVersion: "0.3.0",
    preferredTransport: "JSONRPC",
    description: "Clinical lab analysis agent for renal risk prediction.",
    url: "https://labtrend.vercel.app/api/a2a",
    
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: true,
      extensions: []
    },

    skills: [
      {
        name: "renal_risk_analysis",
        description: "Analyzes eGFR and creatinine for kidney risk",
        input_schema: {
          type: "object",
          required: ["fhir_data"],
          properties: {
            fhir_data: { type: "array" }
          }
        },
        output_schema: {
          type: "object",
          required: ["agent", "risk_level", "confidence"]
        }
      }
    ],

    health_check: "https://labtrend.vercel.app/api/a2a",
    authentication: "none"
  }, { headers: CORS_HEADERS });
}

// 🌐 EXECUTION ENDPOINT (Handles JSON-RPC and Flat JSON)
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. JSON-RPC 2.0 (Prompt Opinion / A2A Protocol)
    if (body.jsonrpc === "2.0") {
      const { method, params, id } = body;

      if (method !== "message/send") {
        return NextResponse.json({
          jsonrpc: "2.0",
          error: { code: -32601, message: "Method not found" },
          id
        }, { headers: CORS_HEADERS });
      }

      // Extract user message parts
      const parts = params?.message?.parts || [];
      const text = parts.map((p: any) => p.kind === 'text' ? p.text : '').join('\n');
      
      // Extract FHIR data if present in metadata (common for Health Agents)
      const metadata = params?.message?.metadata || {};
      const fhirContextKey = Object.keys(metadata).find(k => k.includes('fhir-context'));
      const fhirContext = fhirContextKey ? metadata[fhirContextKey] : null;

      // Decide what to analyze
      let labData: any[] = [];
      if (fhirContext?.fhir_data) {
        labData = fromFHIR(fhirContext.fhir_data);
      } else {
        // Fallback to searching for JSON-like content in text if needed, 
        // but for now, we expect JSON in parts or metadata.
      }

      // Run analysis
      const aiResult = await runCoreAnalyzer(labData);

      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          kind: "message",
          messageId: crypto.randomUUID(),
          role: "agent",
          parts: [{
            kind: "text",
            text: aiResult?.clinical_summary || "I've analyzed the lab trends. Risk Level: " + (aiResult?.risk_level || "UNKNOWN")
          }],
          metadata: {
            analysis_result: aiResult
          }
        }
      }, { headers: CORS_HEADERS });
    }

    // 2. FLAT JSON (Simulation / Legacy)
    const { fhir_data, patient_data, lab_data } = body;
    let labDataToAnalyze: any[] = [];

    if (fhir_data) {
      labDataToAnalyze = fromFHIR(fhir_data);
    } else if (patient_data) {
      labDataToAnalyze = fromFHIR(patient_data);
    } else if (lab_data) {
      labDataToAnalyze = lab_data;
    }

    const aiResult = await runCoreAnalyzer(labDataToAnalyze);
    
    return NextResponse.json(aiResult || {
      agent: "LabTrendAgent",
      risk_level: "MODERATE",
      clinical_summary: "Manual fallback triggered."
    }, { headers: CORS_HEADERS });

  } catch (error: any) {
    console.error("[A2A API Error]", error);
    return NextResponse.json({
      error: "Internal Server Error",
      details: error.message
    }, { status: 500, headers: CORS_HEADERS });
  }
}
