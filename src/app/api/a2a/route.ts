import { NextResponse } from "next/server";
import crypto from "crypto";
import { fromFHIR } from "../../../lib/fhir";
import { runCoreAnalyzer } from "../analyze/route";
import { buildA2AResponse, buildA2AErrorResponse } from "../../../lib/a2a-utils";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ─── Deep key search ──────────────────────────────────────────────────────────

function findValue(obj: unknown, key: string): unknown {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  if (o[key] !== undefined) return o[key];
  for (const k in o) {
    const found = findValue(o[k], key);
    if (found !== null && found !== undefined) return found;
  }
  return null;
}

// ─── Extract plain text from A2A message ─────────────────────────────────────

function extractText(message: unknown): string {
  if (!message) return "";
  if (typeof message === "string") return message;
  
  if (typeof message !== "object") return "";
  const msg = message as Record<string, unknown>;

  // Standard A2A: message.parts[].type === "text"
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .map((p: unknown) => {
        if (typeof p !== "object" || !p) return "";
        const part = p as Record<string, unknown>;
        // spec uses `type`, older impls used `kind`
        if (part.type === "text" || part.kind === "text") {
          return String(part.text ?? part.content ?? "");
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  // Flat string
  if (typeof msg.text === "string") return msg.text;
  if (typeof msg.content === "string") return msg.content;
  return "";
}

// ─── Discovery (GET) ──────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json(
    {
      "name": "LabTrendAgent",
      "description": "Clinical lab analysis agent: renal risk prediction via eGFR/Creatinine/HbA1c trends.",
      "url": "https://labtrend.vercel.app/api/a2a",
      "version": "1.0.0",
      "protocol": "A2A",
      "protocolVersion": "0.3.0",
      // Required by Prompt Opinion SDK to select the correct transport
      "preferredTransport": "JSONRPC",
      "supportedInterfaces": [
        {
          "url": "https://labtrend.vercel.app/api/a2a",
          "protocolBinding": "JSONRPC",
          "protocolVersion": "0.3.0"
        }
      ],
      "defaultInputModes": ["text/plain", "application/json"],
      "defaultOutputModes": ["text/plain", "application/json"],
      "capabilities": {
        "streaming": false,
        "pushNotifications": false,
        "stateTransitionHistory": false
      },
      "skills": [
        {
          "id": "renal_risk_detection",
          "name": "Renal Risk Detection",
          "description": "Detects trends in eGFR and creatinine to predict chronic kidney disease progression.",
          "tags": ["renal", "lab-analysis", "clinical", "FHIR"],
          "examples": [
            "Analyze eGFR trends for patient with CKD stage 3",
            "Assess creatinine and HbA1c for diabetic nephropathy risk"
          ]
        }
      ]
    },
    { headers: CORS_HEADERS }
  );
}

// ─── Execution (POST) ─────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let requestId: string | number = "unknown";
  let rawBody = "";

  try {
    rawBody = await req.text();
    if (!rawBody.trim()) {
      return NextResponse.json(
        buildA2AErrorResponse("unknown", -32700, "Empty body"),
        { headers: CORS_HEADERS }
      );
    }

    const body = JSON.parse(rawBody) as Record<string, unknown>;
    requestId = (body.id as string | number) ?? "1";
    const method = (body.method as string) ?? "";

    // ── Accept all A2A messaging method variants ──────────────────────────────
    // Different SDK versions use different casing/naming:
    //   "tasks/send"    — A2A spec v0.3+
    //   "message/send"  — A2A spec alternate
    //   "SendMessage"   — Prompt Opinion SDK (PascalCase)
    //   ""              — no method field (raw POST)
    // We accept all of them; this agent has a single clinical skill.
    const KNOWN_METHODS = ["tasks/send", "message/send", "sendmessage", "tasks/run", "run"];
    if (method && !KNOWN_METHODS.includes(method.toLowerCase())) {
      // Log but don't reject — handle it anyway
      console.warn(`[LabTrend] Unexpected method: "${method}" — processing anyway`);
    }

    // ── Extract task ID, session ID, and message from params ─────────────────
    const params = (body.params as Record<string, unknown>) ?? {};
    const taskId =
      (params.id as string) ??
      (findValue(body, "taskId") as string) ??
      crypto.randomUUID();
    const sessionId =
      (params.sessionId as string) ??
      (findValue(body, "sessionId") as string) ??
      undefined;

    // Primary: params.message (A2A spec standard location)
    const message = params.message ?? findValue(body, "message");
    let textContent = extractText(message);

    // Fallback: other common fields
    if (!textContent) {
      textContent =
        (findValue(body, "text") as string) ??
        (findValue(body, "input") as string) ??
        (findValue(body, "content") as string) ??
        "";
    }

    // ── Extract FHIR data ─────────────────────────────────────────────────────
    let fhirData =
      findValue(body, "fhir_data") ??
      findValue(body, "patient_data") ??
      findValue(body, "fhir_context") ??
      findValue(params, "data") ??
      null;

    // Try to parse JSON embedded in textContent
    if (!fhirData && textContent.includes("[")) {
      try {
        const jsonMatch = textContent.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) fhirData = JSON.parse(jsonMatch[0]);
      } catch (_) {}
    }

    // ── Normalize data ────────────────────────────────────────────────────────
    let normalizedData: unknown;

    // Detect bare patient ID: a string containing only digits (e.g. "15577").
    // PO passes the selected patient's ID when no explicit lab query is typed.
    // We cannot look up FHIR data without credentials, so we ask for lab values.
    const isBarePatiendId = textContent.trim().length > 0 &&
      /^\d+$/.test(textContent.trim()) &&
      !fhirData;

    if (isBarePatiendId) {
      const patientId = textContent.trim();
      return NextResponse.json(
        buildA2AResponse(
          requestId,
          taskId,
          "COMPLETED",
          `Hello! I am LabTrend, a clinical AI agent specialised in renal risk prediction. I can see patient ID ${patientId} is selected. To perform a full renal risk assessment, please provide the patient's recent lab results — eGFR, Creatinine and/or HbA1c values with dates. You can paste them as text or send structured FHIR observations.`,
          { agent: "LabTrendAgent", intent: "request_lab_data", patient_id: patientId, timestamp: new Date().toISOString() },
          sessionId
        ),
        { headers: CORS_HEADERS }
      );
    }

    if (fhirData) {
      normalizedData = fromFHIR(fhirData);
    } else if (textContent.trim().length > 0) {
      normalizedData = textContent;
    } else {
      // No data at all (e.g. empty ping)
      return NextResponse.json(
        buildA2AResponse(
          requestId,
          taskId,
          "COMPLETED",
          "Hello! I am LabTrend, a clinical AI agent specialised in renal risk prediction. Please share lab results (eGFR, Creatinine, HbA1c) or a clinical question and I will analyse the data for you.",
          { agent: "LabTrendAgent", intent: "greeting", timestamp: new Date().toISOString() },
          sessionId
        ),
        { headers: CORS_HEADERS }
      );
    }

    // ── Run AI analysis ───────────────────────────────────────────────────────
    const aiResult = await runCoreAnalyzer({
      data: normalizedData,
      context: textContent,
    });

    const metadata = {
      agent: "LabTrendAgent",
      intent: "analyze_renal_risk",
      risk_level: aiResult?.risk_level ?? "MODERATE",
      confidence: Number(aiResult?.confidence ?? 0.5),
      clinical_summary: String(
        aiResult?.clinical_summary ?? "Assessment complete."
      ),
      key_factors: Array.isArray(aiResult?.key_factors)
        ? aiResult.key_factors
        : [],
      recommended_actions: Array.isArray(aiResult?.recommended_actions)
        ? aiResult.recommended_actions
        : [],
      timestamp: new Date().toISOString(),
      trace: aiResult?.trace ?? {
        steps: ["normalize", "analyze"],
        data_points: Array.isArray(normalizedData) ? normalizedData.length : 1,
      },
    };

    // ── Return strictly compliant A2A response ───────────────────────────────
    return NextResponse.json(
      buildA2AResponse(
        requestId,
        taskId,
        "COMPLETED",
        metadata.clinical_summary,
        metadata,
        sessionId
      ),
      { headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      buildA2AErrorResponse(requestId, -32603, "Internal Server Error", msg),
      { headers: CORS_HEADERS }
    );
  }
}
