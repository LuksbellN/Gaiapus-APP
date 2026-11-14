import type { WaterRiskPayload } from "@gaiapus/contracts";
import { dayLabel, number } from "../../lib/format";
import { referencePath } from "./chart-path";

export function WaterChart({
  water,
  selectedDate,
}: {
  water: WaterRiskPayload;
  selectedDate: string | null;
}) {
  const days = water.days;
  const max = Math.max(
    water.soil.capacity_mm,
    ...days.map((d) => d.storage_end_mm),
    1,
  );
  const x = (i: number) => 36 + (i / Math.max(days.length - 1, 1)) * 560;
  const y = (value: number) => 130 - (value / max) * 100;
  const path = days
    .map((d, i) => `${i ? "L" : "M"} ${x(i)} ${y(d.storage_end_mm)}`)
    .join(" ");
  const reference = referencePath(
    days.map((day) => day.date),
    water.reference_days,
    x,
    y,
  );
  const selected = days.findIndex((d) => d.date === selectedDate);
  return (
    <div className="water-chart">
      <svg
        viewBox="0 0 640 174"
        role="img"
        aria-label="Reserva de água modelada e referência climática em milímetros. A tabela abaixo apresenta os valores."
      >
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line
              x1="36"
              x2="606"
              y1={y(f * max)}
              y2={y(f * max)}
              className="chart-grid"
            />
            <text x="26" y={y(f * max) + 4} textAnchor="end">
              {number(f * max, 0)}
            </text>
          </g>
        ))}
        <path d={reference} className="reference-line" />
        <path d={path} className="reserve-line" />
        {selected >= 0 && (
          <line
            x1={x(selected)}
            x2={x(selected)}
            y1="20"
            y2="138"
            className="selection-line"
          />
        )}
        {days.map((d, i) => (
          <g key={d.date}>
            <circle
              cx={x(i)}
              cy={y(d.storage_end_mm)}
              r={d.date === selectedDate ? 5 : 3.5}
              className="chart-point"
            />
            <text x={x(i)} y="158" textAnchor="middle">
              {dayLabel(d.date)}
            </text>
          </g>
        ))}
        <text x="36" y="16">
          mm
        </text>
      </svg>
      <div className="chart-legend">
        <span>
          <i className="cyan-dot" />
          Reserva modelada
        </span>
        <span>
          <i className="lime-dot" />
          Referência climática
        </span>
      </div>
    </div>
  );
}
