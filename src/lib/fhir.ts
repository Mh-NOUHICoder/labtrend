export interface InternalLabData {
  date: string;
  loinc: string;
  value: number;
  unit: string;
}

export function fromFHIR(fhirData: any): InternalLabData[] {
  let observations: any[] = [];
  
  if (Array.isArray(fhirData)) {
    observations = fhirData;
  } else if (fhirData?.resourceType === 'Bundle' && Array.isArray(fhirData.entry)) {
    observations = fhirData.entry.map((e: any) => e.resource).filter((r: any) => r.resourceType === 'Observation');
  }

  return observations.map(obs => {
    const date = obs.effectiveDateTime ? obs.effectiveDateTime.split('T')[0] : "";
    const loinc = obs.code?.coding?.[0]?.code || obs.code?.text || "";
    const value = obs.valueQuantity?.value || 0;
    const unit = obs.valueQuantity?.unit || obs.valueQuantity?.code || "";

    return { date, loinc, value, unit };
  });
}

export function toFHIR(internalData: InternalLabData[]): any[] {
  if (!Array.isArray(internalData)) return [];

  return internalData.map(data => ({
    resourceType: "Observation",
    status: "final",
    effectiveDateTime: data.date ? `${data.date}T00:00:00Z` : new Date().toISOString(),
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: data.loinc
        }
      ],
      text: data.loinc
    },
    valueQuantity: {
      value: data.value,
      unit: data.unit,
      system: "http://unitsofmeasure.org",
      code: data.unit
    }
  }));
}
