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
    
    // 1. Robust Content Extraction (Handles ALL Prompt Opinion tool variants)
    let textContent = "";
    if (typeof body.message === 'string') textContent = body.message;
    else if (typeof body.text === 'string') textContent = body.text;
    else if (typeof body.input === 'string') textContent = body.input;
    else {
      const parts = body.params?.message?.parts || body.message?.parts || [];
      textContent = parts.map((p: any) => p.kind === 'text' ? p.text : '').join('\n');
    }
    
    // 2. Robust FHIR/JSON Extraction
    let fhirData = body.fhir_data || body.patient_data || body.params?.message?.metadata?.fhir_context?.fhir_data || body.metadata?.fhir_context?.fhir_data;

    // Deep scan text for JSON if fhirData is still missing
    if (!fhirData && textContent.includes("[")) {
      try {
        const jsonMatch = textContent.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) fhirData = JSON.parse(jsonMatch[0]);
      } catch (e) {
        // Fallback to LLM extraction handled below
      }
    }

    // 3. Prevent 400 Errors - Treat any text context as data
    let normalizedData: any = [];
    if (fhirData) {
      normalizedData = fromFHIR(fhirData);
    } else if (textContent.trim().length > 0) {
      normalizedData = textContent; // LLM will handle the extraction
    } else {
      // Last resort: check if the body itself has recognizable keys
      const possibleData = body.lab_data || body.observations;
      if (possibleData) {
        normalizedData = possibleData;
      } else {
        return NextResponse.json({
          agent: "LabTrendAgent",
          error: "INVALID_INPUT",
          details: "No clinical content detected in the request."
        }, { status: 400, headers: CORS_HEADERS });
      }
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
