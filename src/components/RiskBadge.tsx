type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

interface RiskBadgeProps {
  riskLevel: RiskLevel;
}

export default function RiskBadge({ riskLevel }: RiskBadgeProps) {
  const styles = {
    LOW: "border-green-500/20 bg-green-500/10 text-green-500",
    MODERATE: "border-yellow-500/20 bg-yellow-500/10 text-yellow-500",
    HIGH: "border-orange-500/20 bg-orange-500/10 text-orange-500",
    CRITICAL: "border-red-500/20 bg-red-500/10 text-red-500",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${styles[riskLevel]}`}
    >
      {riskLevel}
    </span>
  );
}
