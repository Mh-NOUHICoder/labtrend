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
    "version": "1.0.0",
    "protocol": "A2A",
    "input_format": "FHIR",
    "output_format": "JSON",
    "capabilities": [
      "renal risk detection",
      "trend analysis",
      "clinical decision support"
    ],
    "endpoint": "/api/a2a"
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json"
    }
  });
}
