import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

// 🌐 MANIFEST ENDPOINT (Exact Agent Card Match)
export async function GET() {
  return NextResponse.json({
    name: "LabTrendAgent",
    display_name: "LabTrend Clinical AI",
    version: "1.0.0",
    type: "a2a-agent",
    description: "Clinical lab analysis agent for renal risk prediction.",
    entrypoint: "https://labtrend.vercel.app/api/a2a/execute",
    
    capabilities: [
      "lab_analysis",
      "risk_scoring"
    ],

    skills: [
      {
        name: "renal_risk_analysis",
        description: "Analyzes eGFR and creatinine for kidney risk"
      }
    ],

    input_schema: {
      type: "object",
      required: ["fhir_data"],
      properties: {
        fhir_data: {
          type: "array"
        }
      }
    },

    output_schema: {
      type: "object",
      required: [
        "agent",
        "risk_level",
        "confidence",
        "clinical_summary",
        "key_factors",
        "recommended_actions"
      ]
    },

    health_check: "https://labtrend.vercel.app/api/a2a",
    authentication: "none"
  }, { headers: CORS_HEADERS });
}
