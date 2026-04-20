import { NextResponse } from "next/server";
import type { A2AResponse } from "../../../lib/a2a-utils";

// ─── Decision engine (CareCoordinatorAgent) ───────────────────────────────────

function decideAction(risk_level: string) {
  switch (risk_level?.toUpperCase()) {
    case "CRITICAL":
    case "HIGH":
      return {
        type: "referral",
        details:
          "Escalate to Nephrologist. Schedule urgent consultation within 48 hours. Notify primary care physician immediately.",
      };
    case "MODERATE":
      return {
        type: "monitoring",
        details:
          "Implement monthly monitoring plan. Request repeat metabolic panel and HbA1c in 30 days. Consider medication adjustment.",
      };
    case "LOW":
    default:
      return {
        type: "routine",
        details:
          "Continue routine annual follow-up. No immediate specialist intervention required.",
      };
  }
}

// ─── Helper: safely unwrap metadata from an A2A response ─────────────────────
// The A2A envelope is:
//   response.result.task.artifacts[1].parts[0].text  (JSON string of metadata)
// We parse it and fall back gracefully if the shape has changed.

function unwrapA2AMetadata(response: A2AResponse): Record<string, unknown> {
  try {
    const metadataArtifact = response?.result?.task?.artifacts?.find(
      (a) => a.name === "metadata"
    );
    const raw = metadataArtifact?.parts?.[0]?.text;
    if (raw) return JSON.parse(raw) as Record<string, unknown>;
  } catch (_) {}
  return {};
}

// ─── GET /api/simulate ────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const timestampStart = new Date().toISOString();

    // Step 1: Simulated FHIR observations from a Primary Care EMR context
    const fhirMock = [
      {
        resourceType: "Observation",
        effectiveDateTime: "2026-03-01T08:00:00Z",
        code: {
          coding: [{ system: "http://loinc.org", code: "33914-3" }],
          text: "eGFR",
        },
        valueQuantity: { value: 65, unit: "mL/min" },
      },
      {
        resourceType: "Observation",
        effectiveDateTime: "2026-04-10T09:30:00Z",
        code: {
          coding: [{ system: "http://loinc.org", code: "33914-3" }],
          text: "eGFR",
        },
        valueQuantity: { value: 48, unit: "mL/min" },
      },
      {
        resourceType: "Observation",
        effectiveDateTime: "2026-04-10T09:30:00Z",
        code: {
          coding: [{ system: "http://loinc.org", code: "2160-0" }],
          text: "Creatinine",
        },
        valueQuantity: { value: 1.8, unit: "mg/dL" },
      },
      {
        resourceType: "Observation",
        effectiveDateTime: "2026-04-12T07:15:00Z",
        code: {
          coding: [{ system: "http://loinc.org", code: "4548-4" }],
          text: "HbA1c",
        },
        valueQuantity: { value: 9.2, unit: "%" },
      },
    ];

    console.log(
      "[Simulation] 1. PrimaryCareAgent dispatching data to LabTrendAgent"
    );

    // Step 2: Call LabTrendAgent — receives a fully-wrapped A2A response
    const a2aUrl = new URL("/api/a2a", req.url);
    const a2aRawResponse = await fetch(a2aUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "simulate-1",
        method: "tasks/send",
        params: {
          fhir_data: fhirMock,
        },
      }),
    });

    // PREVIOUSLY: read labResult.risk_level directly — WRONG (it's wrapped)
    // FIXED: unwrap the A2A envelope before reading metadata
    const labResult = (await a2aRawResponse.json()) as A2AResponse;
    const labMetadata = unwrapA2AMetadata(labResult);

    console.log(
      "[Simulation] Full A2A response:\n" + JSON.stringify(labResult, null, 2)
    );

    const timestampMid = new Date().toISOString();
    const riskLevel = String(labMetadata?.risk_level ?? "MODERATE");

    console.log(
      "[Simulation] 2. LabTrendAgent identified risk level:",
      riskLevel
    );

    // Step 3: CareCoordinatorAgent decision engine
    const decision = decideAction(riskLevel);
    console.log(
      "[Simulation] 3. CareCoordinatorAgent devised action plan:",
      decision.type
    );

    const timestampEnd = new Date().toISOString();

    // Compile full multi-agent workflow trace
    return NextResponse.json({
      workflow: [
        {
          timestamp: timestampStart,
          agent: "PrimaryCareAgent",
          action: "send_patient_data",
          payload_size: fhirMock.length,
        },
        {
          timestamp: timestampMid,
          agent: "LabTrendAgent",
          action: "analyze_risk",
          // Surface the structured metadata, not the raw envelope
          result: labMetadata,
        },
        {
          timestamp: timestampEnd,
          agent: "CareCoordinatorAgent",
          action: "decide_next_step",
          decision,
        },
      ],
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Simulation API Error]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
