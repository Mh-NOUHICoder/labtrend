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

    // 1. IMPROVED: Deep Keyword Extraction (Search across the entire object)
    const findValue = (obj: any, key: string): any => {
      if (!obj || typeof obj !== 'object') return null;
      if (obj[key]) return obj[key];
      for (const k in obj) {
        const found = findValue(obj[k], key);
        if (found) return found;
      }
      return null;
    };

    let textContent = findValue(body, 'message') || findValue(body, 'text') || findValue(body, 'input') || findValue(body, 'content') || "";
    if (typeof textContent !== 'string' && textContent?.parts) {
      textContent = textContent.parts.map((p: any) => p.kind === 'text' ? p.text : p.content || "").join('\n');
    }

    let fhirData = findValue(body, 'fhir_data') || findValue(body, 'patient_data') || findValue(body, 'fhir_context') || findValue(body, 'data');
    if (fhirData?.fhir_data) fhirData = fhirData.fhir_data; // Unpack nested context

    // 2. Intent detection
    const intent = findValue(body, 'intent') || "analyze_renal_risk";

    // 3. Scan text for JSON if structural data is missing
    if (!fhirData && typeof textContent === 'string' && textContent.includes("[")) {
      try {
        const jsonMatch = textContent.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) fhirData = JSON.parse(jsonMatch[0]);
      } catch (e) {}
    }

    // 4. Decision Logic
    let normalizedData: any = [];
    if (fhirData) {
      normalizedData = fromFHIR(fhirData);
    } else if (String(textContent).trim().length > 0) {
      normalizedData = String(textContent);
    } else {
      // DEBUG: If it still fails, return the keys we received
      const keysEncountered = Object.keys(body).join(', ');
      return NextResponse.json({
        agent: "LabTrendAgent",
        error: "INVALID_INPUT",
        details: `No data found. Received keys: [${keysEncountered}]. Please check manifest.`
      }, { status: 400, headers: CORS_HEADERS });
    }

    // 5. Run Analyzer
    const aiResult = await runCoreAnalyzer({ 
      data: normalizedData, 
      context: String(textContent)
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
