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

// 🌐 MANIFEST ENDPOINT (Strict Whitelist Compliance)
export async function GET() {
  return NextResponse.json({
    name: "LabTrendAgent",
    version: "1.0.0",
    type: "a2a-agent",
    description: "Clinical lab analysis agent for early renal risk prediction.",
    entrypoint: "https://labtrend.vercel.app/api/a2a/execute",
    capabilities: [
      "lab_analysis",
      "risk_scoring"
    ]
  }, { headers: CORS_HEADERS });
}
