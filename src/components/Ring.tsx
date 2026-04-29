interface Props {
  pct?: number;
  size?: number;
  thickness?: number;
  gradientId?: string;
}

export default function Ring({ pct = 0, size = 56, thickness = 5, gradientId = "ringgrad" }: Props) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const safe = Math.max(0, Math.min(100, pct));
  const off = c * (1 - safe / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth={thickness}
        fill="none"
        className="text-stone-500"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={`url(#${gradientId})`}
        strokeWidth={thickness}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.8s" }}
      />
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2={size} y2={size}>
          <stop stopColor="#f59e0b" />
          <stop offset="1" stopColor="#ef4444" />
        </linearGradient>
      </defs>
    </svg>
  );
}
