interface Props {
  size?: number;
  className?: string;
}

export default function Wordmark({ size = 18, className = "" }: Props) {
  return (
    <span
      className={className}
      style={{
        fontFamily: "Fraunces, Georgia, serif",
        fontWeight: 700,
        fontSize: size,
        letterSpacing: "-0.01em",
      }}
    >
      Well
      <span
        style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontStyle: "italic",
          fontWeight: 600,
        }}
      >
        fire
      </span>
    </span>
  );
}
