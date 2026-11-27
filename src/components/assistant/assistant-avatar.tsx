/** Ícono del asistente: un robot amigable con un destello, sobre un círculo con degradado. */
export function AssistantAvatar({ className = "size-10" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-linear-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-sm ${className}`}
    >
      <svg viewBox="0 0 32 32" className="size-[62%]" fill="none">
        {/* Antena */}
        <path d="M14 7.5V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="14" cy="4" r="1.6" fill="currentColor" />
        {/* Cabeza */}
        <rect x="5" y="8" width="18" height="15" rx="5" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="2" />
        {/* Ojos y sonrisa */}
        <circle cx="10.5" cy="14.5" r="1.8" fill="currentColor" />
        <circle cx="17.5" cy="14.5" r="1.8" fill="currentColor" />
        <path d="M11 19c1.6 1.2 4.4 1.2 6 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        {/* Destello de "IA" */}
        <path
          d="M26 15.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z"
          fill="currentColor"
        />
        <path d="M27 24.5l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" fill="currentColor" opacity="0.8" />
      </svg>
    </span>
  );
}
