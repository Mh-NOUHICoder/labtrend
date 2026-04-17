import { NextResponse } from "next/server";
import crypto from "crypto";
import { fromFHIR } from "../../../lib/fhir";
import { runCoreAnalyzer } from "../analyze/route";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*", // Allow all headers for debugging
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
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
    "endpoint": "https://labtrend.vercel.app/api/a2a" // Absolute URL
  }, { headers: CORS_HEADERS });
}

// 🌐 EXECUTION (Strict Contract)
export async function POST(req: Request) {
  let requestId = "unknown";
  let rawBody = "";
  try {
    rawBody = await req.text();
    if (!rawBody) throw new Error("Empty body");
    const body = JSON.parse(rawBody);
    requestId = body.id || "1";

    const findValue = (obj: any, key: string): any => {
      if (!obj || typeof obj !== 'object') return null;
      if (obj[key] !== undefined) return obj[key];
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
    if (fhirData?.fhir_data) fhirData = fhirData.fhir_data;

    const intent = findValue(body, 'intent') || "analyze_renal_risk";

    if (!fhirData && typeof textContent === 'string' && textContent.includes("[")) {
      try {
        const jsonMatch = textContent.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) fhirData = JSON.parse(jsonMatch[0]);
      } catch (e) {}
    }

    let normalizedData: any = [];
    if (fhirData) {
      normalizedData = fromFHIR(fhirData);
    } else if (String(textContent).trim().length > 0) {
      normalizedData = String(textContent);
    } else {
      // Return proper JSON-RPC error
      return NextResponse.json({
        jsonrpc: "2.0",
        id: requestId,
        error: {
          code: -32602,
          message: "No clinical data found in request",
          data: { keys: Object.keys(body), preview: rawBody.substring(0, 200) }
        }
      }, { headers: CORS_HEADERS });
    }

    const aiResult = await runCoreAnalyzer({ data: normalizedData, context: String(textContent) });

    const responseMetadata = {
      agent: "LabTrendAgent",
      intent: String(intent),
      risk_level: aiResult?.risk_level || "MODERATE",
      confidence: Number(aiResult?.confidence || 0.5),
      clinical_summary: String(aiResult?.clinical_summary || "Assessment complete."),
      key_factors: Array.isArray(aiResult?.key_factors) ? aiResult.key_factors : [],
      recommended_actions: Array.isArray(aiResult?.recommended_actions) ? aiResult.recommended_actions : [],
      timestamp: new Date().toISOString(),
      trace: aiResult?.trace || { steps: ["normalize", "analyze"], data_points: normalizedData.length }
    };

    // ALWAYS return JSON-RPC 2.0 to satisfy the A2A SDK
    return NextResponse.json({
      jsonrpc: "2.0",
      id: requestId,
      result: {
        kind: "message",
        messageId: crypto.randomUUID(),
        role: "agent",
        parts: [{ kind: "text", text: responseMetadata.clinical_summary }],
        metadata: responseMetadata
      }
    }, { headers: CORS_HEADERS });

  } catch (error: any) {
    return NextResponse.json({
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: -32603,
        message: "Internal Server Error",
        data: error.message
      }
    }, { headers: CORS_HEADERS });
  }
}
