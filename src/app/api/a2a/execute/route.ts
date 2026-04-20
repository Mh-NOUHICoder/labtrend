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
    status: 204,
    headers: CORS_HEADERS,
  });
}

// ─── Execution endpoint (/api/a2a/execute) ────────────────────────────────────
// Every code-path MUST go through buildA2AResponse — no raw JSON, no aiResult
// returned unwrapped.

export async function POST(req: Request) {
  let requestId: string | number = "unknown";

  try {
    const rawBody = await req.text();
    if (!rawBody.trim()) {
      return NextResponse.json(
        buildA2AErrorResponse("unknown", -32700, "Empty request body"),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const body = JSON.parse(rawBody) as Record<string, unknown>;

    // ── Branch A: JSON-RPC 2.0 envelope ──────────────────────────────────────
    if (body.jsonrpc === "2.0") {
      const { method, params, id } = body as {
        method?: string;
        params?: Record<string, unknown>;
        id?: string | number;
      };
      requestId = id ?? "1";

      const KNOWN_METHODS = [
        "tasks/send",
        "message/send",
        "sendmessage",
        "tasks/run",
        "run",
      ];
      const requestedMethod = (method ?? "").toLowerCase();

      if (requestedMethod && !KNOWN_METHODS.includes(requestedMethod)) {
        return NextResponse.json(
          buildA2AErrorResponse(requestId, -32601, `Method not found: ${method}`),
          { status: 404, headers: CORS_HEADERS }
        );
      }

      const taskId = crypto.randomUUID();
      const sessionId = (params?.sessionId as string) ?? undefined;
      const fhirData =
        (params as any)?.message?.fhir_data ??
        (params as any)?.fhir_data ??
        (body as any).fhir_data ??
        null;

      let labData: unknown[] = [];
      if (fhirData) {
        labData = fromFHIR(fhirData);
      }

      const aiResult = await runCoreAnalyzer({ data: labData, context: "" });

      const summary = String(aiResult?.clinical_summary ?? "Assessment complete.");
      const metadata: Record<string, unknown> = {
        agent: "LabTrendAgent",
        intent: "analyze_renal_risk",
        risk_level: aiResult?.risk_level ?? "MODERATE",
        confidence: Number(aiResult?.confidence ?? 0.5),
        clinical_summary: summary,
        key_factors: Array.isArray(aiResult?.key_factors) ? aiResult.key_factors : [],
        recommended_actions: Array.isArray(aiResult?.recommended_actions)
          ? aiResult.recommended_actions
          : [],
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(
        buildA2AResponse(requestId, taskId, "COMPLETED", summary, metadata, sessionId),
        { headers: CORS_HEADERS }
      );
    }

    // ── Branch B: flat / legacy JSON ─────────────────────────────────────────
    // PREVIOUSLY: returned raw aiResult — FIXED: always wraps in A2AResponse
    const { fhir_data, patient_data, lab_data } = body as any;
    let labDataToAnalyze: unknown[] = [];

    if (fhir_data) {
      labDataToAnalyze = fromFHIR(fhir_data);
    } else if (patient_data) {
      labDataToAnalyze = fromFHIR(patient_data);
    } else if (Array.isArray(lab_data)) {
      labDataToAnalyze = lab_data;
    }

    const aiResult = await runCoreAnalyzer({ data: labDataToAnalyze, context: "" });

    const summary = String(aiResult?.clinical_summary ?? "Assessment complete.");
    const metadata: Record<string, unknown> = {
      agent: "LabTrendAgent",
      intent: "analyze_renal_risk",
      risk_level: aiResult?.risk_level ?? "MODERATE",
      confidence: Number(aiResult?.confidence ?? 0.5),
      clinical_summary: summary,
      key_factors: Array.isArray(aiResult?.key_factors) ? aiResult.key_factors : [],
      recommended_actions: Array.isArray(aiResult?.recommended_actions)
        ? aiResult.recommended_actions
        : [],
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(
      buildA2AResponse(
        requestId,
        crypto.randomUUID(),
        "COMPLETED",
        summary,
        metadata
      ),
      { headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[A2A Execute] Error:", msg);
    return NextResponse.json(
      buildA2AErrorResponse(requestId, -32603, "Internal Server Error", msg),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
