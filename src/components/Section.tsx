interface SectionProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export default function Section({ title, subtitle, children }: SectionProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-200 tracking-tight">{title}</h2>
        <p className="text-[11px] text-stone-400 dark:text-stone-600">{subtitle}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}
