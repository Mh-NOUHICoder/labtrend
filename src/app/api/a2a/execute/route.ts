import { NextResponse } from "next/server";
import crypto from "crypto";
import { fromFHIR } from "../../../../lib/fhir";
import { runCoreAnalyzer } from "../../analyze/route";
import { buildA2AResponse, buildA2AErrorResponse } from "../../../../lib/a2a-utils";

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
      
      // We accept various methods but handle them consistently
      const KNOWN_METHODS = ["tasks/send", "message/send", "sendmessage", "tasks/run", "run"];
      const requestedMethod = (method as string)?.toLowerCase() || "";
      
      if (requestedMethod && !KNOWN_METHODS.includes(requestedMethod)) {
        return NextResponse.json(
          buildA2AErrorResponse(id, -32601, `Method not found: ${method}`),
          { headers: CORS_HEADERS }
        );
      }

      const metadata = params?.message?.metadata || params?.metadata || {};
      const fhirData = params?.message?.fhir_data || params?.fhir_data || body.fhir_data || null;
      
      let labData: any[] = [];
      if (fhirData) {
        labData = fromFHIR(fhirData);
      }

      const aiResult = await runCoreAnalyzer(labData);

      return NextResponse.json(
        buildA2AResponse(
          id,
          crypto.randomUUID(),
          "COMPLETED",
          aiResult?.clinical_summary || "Assessment complete.",
          { ...metadata, analysis_result: aiResult }
        ), 
        { headers: CORS_HEADERS }
      );
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
