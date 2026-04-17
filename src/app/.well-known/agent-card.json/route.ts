import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  return NextResponse.json(
    {
      name: "LabTrendAgent",
      description:
        "Clinical lab analysis agent: renal risk prediction via eGFR/Creatinine/HbA1c trends.",
      url: "https://labtrend.vercel.app/api/a2a", // ← top-level required by A2A spec
      version: "1.0.0",
      defaultInputModes: ["text/plain", "application/json"],
      defaultOutputModes: ["text/plain", "application/json"],
      capabilities: {
        streaming: false,
        pushNotifications: false,
        stateTransitionHistory: false,
      },
      skills: [
        {
          id: "renal_risk_detection",
          name: "Renal Risk Detection",
          description:
            "Detects trends in eGFR and creatinine to predict chronic kidney disease progression.",
          tags: ["renal", "lab-analysis", "clinical", "FHIR"],
          examples: [
            "Analyze eGFR trends for patient with CKD stage 3",
            "Assess creatinine and HbA1c for diabetic nephropathy risk",
          ],
        },
      ],
    },
    { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
}
