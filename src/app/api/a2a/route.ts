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
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

// 🌐 DISCOVERY (Production Manifest)
export async function GET() {
  return NextResponse.json({
    "name": "LabTrendAgent",
    "description": "Clinical lab analysis agent for renal risk prediction.",
    "version": "1.0.0",
    "protocol": "A2A",
    "protocolVersion": "0.3.0",
    "preferredTransport": "JSONRPC",
    "input_format": "FHIR",
    "output_format": "JSON",
    "defaultInputModes": ["text/plain", "application/json"],
    "defaultOutputModes": ["text/plain", "application/json"],
    "supportedInterfaces": [
      {
        "url": "https://labtrend.vercel.app/api/a2a",
        "protocolBinding": "JSONRPC",
        "protocolVersion": "0.3.0"
      }
    ],
    "capabilities": {
      "streaming": false,
      "pushNotifications": false,
      "stateTransitionHistory": true,
      "extensions": []
    },
    "skills": [
      {
        "id": "renal_risk_detection",
        "name": "Renal Risk Detection",
        "description": "Detects trends in eGFR and creatinine",
        "tags": ["renal", "lab-analysis"]
      }
    ],
    "endpoint": "/api/a2a"
  }, { headers: CORS_HEADERS });
}

// 🌐 EXECUTION (Strict Contract)
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Validate Intent & Input
    const intent = body.intent || body.params?.message?.metadata?.intent || "analyze_renal_risk";
    
    // Extract textual content (this handles files that were converted to text by the platform)
    const parts = body.params?.message?.parts || [];
    const textContent = parts.map((p: any) => p.kind === 'text' ? p.text : '').join('\n');
    
    // Attempt to find fhir_data in various locations
    let fhirData = body.fhir_data || body.patient_data || body.params?.message?.metadata?.fhir_context?.fhir_data;

    // Smart Extraction: If fhirData is missing, try to find JSON structure inside textContent
    if (!fhirData && textContent.includes("[")) {
      try {
        const jsonMatch = textContent.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) fhirData = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn("Failed to parse JSON from text parts");
      }
    }

    // If still no fhirData, but we have text, let's treat the text itself as the clinical data.
    // The Prompt Opinion Orchestrator often summarizes JSON into plain text before making the A2A call.
    let normalizedData: any = [];
    if (fhirData) {
      normalizedData = fromFHIR(fhirData);
    } else if (textContent.trim()) {
      // Pass the summarized text directly to the AI
      normalizedData = textContent;
    } else {
      return NextResponse.json({
        agent: "LabTrendAgent",
        error: "INVALID_INPUT",
        details: "No clinical data found. Please provide FHIR observations or describe the patient's lab results."
      }, { status: 400, headers: CORS_HEADERS });
    }

    // 3. Analyze (Pass textContent as well for language detection)
    const aiResult = await runCoreAnalyzer({ 
      data: normalizedData, 
      context: textContent // This helps the AI detect the requested language
    });

    // 4. Structured Production Output
    const response = {
      agent: "LabTrendAgent",
      intent: String(intent),
      risk_level: aiResult?.risk_level || "MODERATE",
      confidence: Number(aiResult?.confidence || 0.5),
      clinical_summary: String(aiResult?.clinical_summary || "Automated risk assessment completed."),
      key_factors: Array.isArray(aiResult?.key_factors) ? aiResult.key_factors : [],
      recommended_actions: Array.isArray(aiResult?.recommended_actions) ? aiResult.recommended_actions : [],
      timestamp: new Date().toISOString(),
      trace: aiResult?.trace || { steps: ["normalize", "analyze"], data_points: normalizedData.length }
    };

    // Handle JSON-RPC wrapper if requested
    if (body.jsonrpc === "2.0") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id,
        result: {
          kind: "message",
          messageId: crypto.randomUUID(),
          role: "agent",
          parts: [{ kind: "text", text: response.clinical_summary }],
          metadata: response
        }
      }, { headers: CORS_HEADERS });
    }

    return NextResponse.json(response, { headers: CORS_HEADERS });

  } catch (error: any) {
    console.error("[A2A Protocol Error]", error);
    return NextResponse.json({
      agent: "LabTrendAgent",
      error: "INTERNAL_ERROR",
      details: error.message
    }, { status: 500, headers: CORS_HEADERS });
  }
}
