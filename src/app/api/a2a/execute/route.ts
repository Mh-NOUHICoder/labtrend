import { NextResponse } from "next/server";
import crypto from "crypto";
import { fromFHIR } from "../../../../lib/fhir";
import { runCoreAnalyzer } from "../../analyze/route";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

// 🌐 EXECUTION ENDPOINT (Mirroring logic from /api/a2a)
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

      const parts = params?.message?.parts || [];
      const metadata = params?.message?.metadata || {};
      const fhirContextKey = Object.keys(metadata).find(k => k.includes('fhir-context'));
      const fhirContext = fhirContextKey ? metadata[fhirContextKey] : null;

      let labData: any[] = [];
      if (fhirContext?.fhir_data) {
        labData = fromFHIR(fhirContext.fhir_data);
      }

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
          metadata: { analysis_result: aiResult }
        }
      }, { headers: CORS_HEADERS });
    }

    // 2. FLAT JSON (Standard/Legacy)
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
      clinical_summary: "Execution Fallback triggered."
    }, { headers: CORS_HEADERS });

  } catch (error: any) {
    console.error(`[A2A Execute Error]`, error);
    return NextResponse.json({
      error: "Internal Server Error",
      details: error.message
    }, { status: 500, headers: CORS_HEADERS });
  }
}
