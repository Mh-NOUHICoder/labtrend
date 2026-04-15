export const AgentMeta = {
  name: "LabTrendAgent",
  version: "1.0.0",
  capabilities: [
    "longitudinal_analysis",
    "renal_deterioration_detection",
    "diabetic_nephropathy_screening"
  ],
  intents: [
    "analyze_renal_risk",
    "get_trend"
  ],
  input_formats: [
    "application/fhir+json",
    "application/json"
  ],
  output_format: "application/json",
  description: "A clinical-grade Renal Risk Intelligence Agent designed for interoperable healthcare systems."
};
