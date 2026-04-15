import { NextResponse } from "next/server";

export async function GET() {
  const mockLabs = [
    { date: "2026-01-01", loinc: "4548-4", value: 8.1, unit: "%" },
    { date: "2026-02-01", loinc: "4548-4", value: 8.9, unit: "%" },
    { date: "2026-03-01", loinc: "4548-4", value: 9.4, unit: "%" },
    { date: "2026-03-01", loinc: "2160-0", value: 1.6, unit: "mg/dL" },
    { date: "2026-03-01", loinc: "6301-6", value: 1.2, unit: "" },
    { date: "2026-03-01", loinc: "1975-2", value: 1.1, unit: "mg/dL" },
  ];

  return NextResponse.json(mockLabs);
}
