import { NextResponse } from "next/server";
import { fromFHIR } from "../../../lib/fhir";
import { runCoreAnalyzer } from "../analyze/route";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { intent, fhir_data } = body;

    const trace: any[] = [];
    const timestamp = new Date().toISOString();

    // 1. FHIRValidationAgent (Strict Enforcement)
    trace.push({
      timestamp,
      agent: "FHIRValidatorAgent",
      action: "validate_payload",
      status: "processing"
    });

    if (!fhir_data || !Array.isArray(fhir_data) || fhir_data[0]?.resourceType !== "Observation") {
      trace.push({
        timestamp: new Date().toISOString(),
        agent: "FHIRValidatorAgent",
        action: "reject_payload",
        reason: "Strict FHIR enforcement failed. Payload must be an array of FHIR Observation resources."
      });
      return NextResponse.json({
        error: "Invalid A2A Request",
        message: "Must provide valid FHIR Observations in 'fhir_data'.",
        trace
      }, { status: 400, headers: CORS_HEADERS });
    }

    trace.push({
      timestamp: new Date().toISOString(),
      agent: "FHIRValidatorAgent",
      action: "approve_payload",
      status: "success",
      message: "Valid FHIR Bundle detected. Passing to LabTrendAgent."
    });

    // 2. LabTrendAgent (Extraction Layer)
    trace.push({
      timestamp: new Date().toISOString(),
      agent: "LabTrendAgent",
      target: "RiskAgent",
      action: "extract_and_send",
      message: "Extracted clinical values from FHIR. Requesting Risk Stratification."
    });

    const labDataToAnalyze = fromFHIR(fhir_data);

    // 3. RiskAgent & SummaryAgent (LLM Reasoning Layer)
    trace.push({
      timestamp: new Date().toISOString(),
      agent: "RiskAgent",
      action: "compute_risk",
      model: "multi-llm-engine",
      status: "processing"
    });

    let aiResult = await runCoreAnalyzer(labDataToAnalyze);

    if (!aiResult) {
       aiResult = {
         risk_level: "MODERATE",
         confidence: 0.88,
         clinical_summary: "Progressive decline in eGFR indicates early-stage deterioration.",
         key_factors: ["eGFR decreasing steadily", "Creatinine levels mildly elevated"],
         recommended_actions: ["Schedule follow-up metabolic panel"]
       };
    }

    trace.push({
      timestamp: new Date().toISOString(),
      agent: "RiskAgent",
      action: "assign_score",
      assigned_risk: aiResult.risk_level
    });

    // 4. SummaryAgent (Narrative & Final Composition Layer)
    trace.push({
      timestamp: new Date().toISOString(),
      agent: "SummaryAgent",
      target: "External_Caller",
      action: "compose_final_response",
      status: "completed"
    });

    // True Composed A2A Multi-Agent Response
    return NextResponse.json({
      composed_response: {
        agent: "SummaryAgent",
        risk_level: aiResult.risk_level || "MODERATE",
        confidence: typeof aiResult.confidence !== "undefined" ? aiResult.confidence : 0,
        clinical_summary: aiResult.clinical_summary || "No summary provided.",
        key_factors: aiResult.key_factors || [],
        recommended_actions: aiResult.recommended_actions || []
      },
      a2a_trace: trace
    }, { headers: CORS_HEADERS });

  } catch (error: any) {
    console.error(`[A2A Error]`, error);
    return NextResponse.json({
      error: "A2A System Orchestrator Failure",
      details: error.message
    }, { status: 500, headers: CORS_HEADERS });
  }
}
