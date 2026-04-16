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
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json"
    }
  });
}
