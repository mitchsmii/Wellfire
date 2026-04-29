interface Props {
  size?: number;
  stroke?: string;
  className?: string;
}

export default function Flame({ size = 24, stroke, className }: Props) {
  const color = stroke ?? "currentColor";
  const w = Math.max(1.8, size * 0.09);
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={className}
    >
      <path
        d="M32 10 C32 10, 20 22, 20 36 C20 46, 25 54, 32 54 C39 54, 44 46, 44 36 C44 29, 40 25, 40 25"
        stroke={color}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M32 10 C34 22, 40 28, 37 34 C35 37, 32 38, 32 38"
        stroke={color}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
