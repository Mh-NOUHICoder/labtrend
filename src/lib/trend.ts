export interface LabEntry {
  date: string | Date;
  value: number;
}

export interface HbA1cTrendAnalysis {
  isIncreasing: boolean;
  rateOfIncreasePerMonth: number;
  totalChange: number;
  message: string;
}

/**
 * Calculates the trend and rate of increase for HbA1c lab values over time.
 */
export function calculateHbA1cTrend(labs: LabEntry[]): HbA1cTrendAnalysis {
  if (labs.length < 2) {
    return {
      isIncreasing: false,
      rateOfIncreasePerMonth: 0,
      totalChange: 0,
      message: "Insufficient data to calculate a trend.",
    };
  }

  // Sort chronologically
  const sorted = [...labs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const firstLab = sorted[0];
  const lastLab = sorted[sorted.length - 1];

  const firstDate = new Date(firstLab.date);
  const lastDate = new Date(lastLab.date);

  // Difference in months
  const msPerMonth = 1000 * 60 * 60 * 24 * 30.436875;
  const timeDiffMonths = (lastDate.getTime() - firstDate.getTime()) / msPerMonth;

  const totalChange = lastLab.value - firstLab.value;
  const isIncreasing = totalChange > 0;
  
  // Calculate monthly rate, handle division by zero if dates are identical
  const rateOfIncreasePerMonth = timeDiffMonths > 0 ? totalChange / timeDiffMonths : 0;

  let message = "HbA1c levels are stable or decreasing.";
  if (isIncreasing) {
    if (rateOfIncreasePerMonth > 0.5) {
      message = "Alert: Rapid increase detected in HbA1c levels.";
    } else {
      message = "Gradual increase detected in HbA1c levels.";
    }
  }

  return {
    isIncreasing,
    rateOfIncreasePerMonth: Number(rateOfIncreasePerMonth.toFixed(3)),
    totalChange: Number(totalChange.toFixed(3)),
    message,
  };
}
