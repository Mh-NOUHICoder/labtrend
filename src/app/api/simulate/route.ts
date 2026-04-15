import { NextResponse } from "next/server";

// Decision Engine simulating CareCoordinatorAgent
function decideAction(risk_level: string) {
  switch (risk_level?.toUpperCase()) {
    case "CRITICAL":
    case "HIGH":
      return {
        type: "referral",
        details: "Escalate to Nephrologist. Schedule urgent consultation within 48 hours. Notify primary care physician immediately."
      };
    case "MODERATE":
      return {
        type: "monitoring",
        details: "Implement monthly monitoring plan. Request repeat metabolic panel and HbA1c in 30 days. Consider medication adjustment."
      };
    case "LOW":
    default:
      return {
        type: "routine",
        details: "Continue routine annual follow-up. No immediate specialist intervention required."
      };
  }
}

export async function GET(req: Request) {
  try {
    const timestampStart = new Date().toISOString();

    // Step 1: Simulated FHIR observations from a Primary Care EMR Context
    const fhirMock = [
      {
        resourceType: "Observation",
        effectiveDateTime: "2026-03-01T08:00:00Z",
        code: { coding: [{ system: "http://loinc.org", code: "33914-3" }], text: "eGFR" },
        valueQuantity: { value: 65, unit: "mL/min" }
      },
      {
        resourceType: "Observation",
        effectiveDateTime: "2026-04-10T09:30:00Z",
        code: { coding: [{ system: "http://loinc.org", code: "33914-3" }], text: "eGFR" },
        valueQuantity: { value: 48, unit: "mL/min" }
      },
      {
        resourceType: "Observation",
        effectiveDateTime: "2026-04-10T09:30:00Z",
        code: { coding: [{ system: "http://loinc.org", code: "2160-0" }], text: "Creatinine" },
        valueQuantity: { value: 1.8, unit: "mg/dL" }
      },
      {
        resourceType: "Observation",
        effectiveDateTime: "2026-04-12T07:15:00Z",
        code: { coding: [{ system: "http://loinc.org", code: "4548-4" }], text: "HbA1c" },
        valueQuantity: { value: 9.2, unit: "%" }
      }
    ];

    console.log("[Simulation] 1. PrimaryCareAgent dispatching data to LabTrendAgent");

    // Step 2: LabTrendAgent Processing Phase
    const a2aUrl = new URL("/api/a2a", req.url);
    const a2aResponse = await fetch(a2aUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agent: "PrimaryCareAgent",
        intent: "analyze_renal_risk",
        fhir_data: fhirMock
      })
    });

    const labResult = await a2aResponse.json();
    const timestampMid = new Date().toISOString();

    console.log("[Simulation] 2. LabTrendAgent identified risk level:", labResult.risk_level);

    // Step 3: CareCoordinatorAgent Decision Engine
    const decision = decideAction(labResult.risk_level);
    console.log("[Simulation] 3. CareCoordinatorAgent devised action plan:", decision.type);

    const timestampEnd = new Date().toISOString();

    // Compile Full Multi-Agent Workflow Trace
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
          result: labResult
        },
        {
          timestamp: timestampEnd,
          agent: "CareCoordinatorAgent",
          action: "decide_next_step",
          decision: decision
        }
      ]
    });
  } catch (error: any) {
    console.error(`[Simulation API Error]`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
