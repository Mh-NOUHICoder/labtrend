import { NextResponse } from "next/server";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET() {
  return NextResponse.json({
    name: "LabTrendAgent",
    description: "Clinical lab analysis agent for renal risk prediction.",
    url: "https://labtrend.vercel.app/api/a2a",
    version: "1.0.0",
    protocolVersion: "0.3.0",
    preferredTransport: "JSONRPC",
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain"],
    supportedInterfaces: [
      {
        url: "https://labtrend.vercel.app/api/a2a",
        protocolBinding: "JSONRPC",
        protocolVersion: "0.3.0"
      }
    ],
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: true,
      extensions: []
    },
    skills: [
      {
        id: "renal_risk_analysis",
        name: "Renal Risk Analysis",
        description: "Analyzes eGFR and creatinine for kidney risk",
        tags: ["clinical", "renal", "lab-analysis"],
        input_schema: {
          type: "object",
          required: ["fhir_data"],
          properties: {
            fhir_data: { type: "array" }
          }
        },
        output_schema: {
          type: "object",
          required: ["agent", "risk_level", "confidence"]
        }
      }
    ]
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json"
    }
  });
}
