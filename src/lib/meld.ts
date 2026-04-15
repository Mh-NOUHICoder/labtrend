/**
 * Calculates the Model for End-Stage Liver Disease (MELD) score.
 * Formula: 3.78 * ln(bilirubin) + 11.2 * ln(INR) + 9.57 * ln(creatinine) + 6.43
 * 
 * Rules:
 * - Minimum value for any parameter is bounded at 1.0.
 * - Maximum value for creatinine is capped at 4.0.
 */
export function calculateMELD(
  bilirubin: number,
  inr: number,
  creatinine: number
): number {
  // Enforce lower bounds of 1.0 to prevent negative scores
  const safeBilirubin = Math.max(1, bilirubin);
  const safeInr = Math.max(1, inr);
  
  // Cap creatinine at 4.0 as per standard MELD guidelines, lower bound 1.0
  const safeCreatinine = Math.min(4, Math.max(1, creatinine));

  const score =
    3.78 * Math.log(safeBilirubin) +
    11.2 * Math.log(safeInr) +
    9.57 * Math.log(safeCreatinine) +
    6.43;

  // Standard MELD score is rounded to the nearest integer
  return Math.round(score);
}
