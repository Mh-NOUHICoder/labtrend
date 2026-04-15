import { NextResponse } from "next/server";
import { fromFHIR } from "../../../lib/fhir";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { agent, intent, patient_data, fhir_data, lab_data } = body;

    // Log the A2A request
    console.log(`[A2A Request] Agent: ${agent || "Unknown"}, Intent: ${intent}`);

    // Strict constraint check
    if (!intent) {
      return NextResponse.json({
        agent: "LabTrendAgent",
        risk_level: "MODERATE",
        confidence: 0,
        clinical_summary: "Error: Missing 'intent' in request.",
        key_factors: ["Invalid A2A Request Parameters"],
        recommended_actions: ["Provide a valid intent (e.g., 'analyze_renal_risk')"]
      }, { status: 400 });
    }

    if (intent !== "analyze_renal_risk" && intent !== "get_trend") {
      return NextResponse.json({
        agent: "LabTrendAgent",
        risk_level: "MODERATE",
        confidence: 0,
        clinical_summary: `Error: Unsupported intent '${intent}'.`,
        key_factors: ["Invalid A2A Intent Signature"],
        recommended_actions: ["Use 'analyze_renal_risk' or 'get_trend'"]
      }, { status: 400 });
    }

    // Process and normalize input data
    let labDataToAnalyze: any[] = [];
    
    if (fhir_data) {
      labDataToAnalyze = fromFHIR(fhir_data);
    } else if (patient_data && Array.isArray(patient_data)) {
      // Auto-detect if it's FHIR or internal format
      if (patient_data[0]?.resourceType || patient_data[0]?.code) {
         labDataToAnalyze = fromFHIR(patient_data);
      } else {
         labDataToAnalyze = patient_data;
      }
    } else if (lab_data) {
      labDataToAnalyze = lab_data;
    }

    if (!labDataToAnalyze || labDataToAnalyze.length === 0) {
      return NextResponse.json({
        agent: "LabTrendAgent",
        risk_level: "MODERATE",
        confidence: 0,
        clinical_summary: "Error: No valid observations provided.",
        key_factors: ["Empty or invalid lab payload"],
        recommended_actions: ["Ensure 'patient_data' or 'fhir_data' contains valid FHIR Observations"]
      }, { status: 400 });
    }

    // Route requests to existing logic (/api/analyze)
    const analyzeUrl = new URL("/api/analyze", req.url);
    const analyzeResponse = await fetch(analyzeUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lab_data: labDataToAnalyze }),
    });

    const aiResult = await analyzeResponse.json();

    // Enforce Strict A2A JSON Contract bounds before returning
    return NextResponse.json({
      agent: "LabTrendAgent",
      risk_level: aiResult.risk_level || "MODERATE",
      confidence: typeof aiResult.confidence !== "undefined" ? aiResult.confidence : 0,
      clinical_summary: aiResult.clinical_summary || "No summary provided.",
      key_factors: aiResult.key_factors || [],
      recommended_actions: aiResult.recommended_actions || []
    });

  } catch (error: any) {
    console.error(`[A2A Error]`, error);
    return NextResponse.json({
      agent: "LabTrendAgent",
      risk_level: "MODERATE",
      confidence: 0,
      clinical_summary: "A2A Server Parsing Error.",
      key_factors: ["Internal Try-Catch Failure"],
      recommended_actions: [error.message]
    }, { status: 500 });
  }
}
