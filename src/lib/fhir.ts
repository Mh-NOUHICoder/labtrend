export interface NormalizedObservation {
  code: "eGFR" | "Creatinine" | "HbA1c" | "Unknown";
  value: number;
  unit: string;
  date: string; // ISO8601
}

export function fromFHIR(fhirData: any): NormalizedObservation[] {
  let observations: any[] = [];
  
  // 1. Extract Observations from Bundle or Array
  if (Array.isArray(fhirData)) {
    observations = fhirData;
  } else if (fhirData?.resourceType === 'Bundle' && Array.isArray(fhirData.entry)) {
    observations = fhirData.entry.map((e: any) => e.resource).filter((r: any) => r?.resourceType === 'Observation');
  } else if (fhirData?.resourceType === 'Observation') {
    observations = [fhirData];
  }

  // 2. Map and Normalize
  const normalized = observations.map(obs => {
    const rawCode = obs.code?.coding?.[0]?.code || obs.code?.text || "";
    let cleanCode: NormalizedObservation['code'] = "Unknown";
    
    // LOINC Mapping
    if (rawCode.includes("33914-3") || rawCode.toLowerCase().includes("egfr")) cleanCode = "eGFR";
    if (rawCode.includes("2160-0") || rawCode.toLowerCase().includes("creatinine")) cleanCode = "Creatinine";
    if (rawCode.includes("4548-4") || rawCode.toLowerCase().includes("hba1c")) cleanCode = "HbA1c";

    const value = obs.valueQuantity?.value ?? obs.valueInteger ?? 0;
    const unit = obs.valueQuantity?.unit || "";
    const date = obs.effectiveDateTime || obs.issued || new Date().toISOString();

    return { code: cleanCode, value, unit, date };
  })
  .filter(item => item.code !== "Unknown" && !isNaN(item.value));

  // 3. Time-Series Sorting (Oldest to Newest)
  return normalized.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
