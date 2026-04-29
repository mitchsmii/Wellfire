export default function LoadingScreen({ theme }: { theme: string }) {
  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-[#faf7f2] dark:bg-[#0f0e0c] flex items-center justify-center transition-colors duration-300">
        <div className="flex flex-col items-center gap-3">
          <svg viewBox="0 0 28 28" fill="none" className="w-8 h-8 animate-pulse">
            <path
              d="M14 3C14 3 8 9 8 15a6 6 0 0012 0c0-3-2-5-2-5s-.5 2.5-2 3.5C17 11 14 3 14 3z"
              fill="url(#flame-load)"
            />
            <defs>
              <linearGradient id="flame-load" x1="14" y1="3" x2="14" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f59e0b" />
                <stop offset="1" stopColor="#ef4444" />
              </linearGradient>
            </defs>
          </svg>
          <span className="text-sm text-stone-400 dark:text-stone-600">Loading...</span>
        </div>
      </div>
    </div>
  );
}
