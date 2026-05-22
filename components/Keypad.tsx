import type { ReactNode } from "react";

function KeyButton({
  children,
  onClick,
  disabled,
  variant = "number",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "number" | "control";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex aspect-square min-h-16 items-center justify-center rounded-full border border-zinc-400 bg-zinc-100 font-medium text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_2px_5px_rgba(0,0,0,0.22)] transition active:translate-y-px active:shadow-sm disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-20 lg:min-h-24 ${
        variant === "control"
          ? "text-4xl sm:text-5xl"
          : "text-4xl sm:text-5xl lg:text-6xl"
      }`}
    >
      {children}
    </button>
  );
}

export function Keypad({
  onDigit,
  onBackspace,
  onNext,
}: {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onNext: () => void;
}) {
  return (
    <aside className="grid w-full max-w-[460px] grid-cols-3 gap-3 self-start sm:gap-4 lg:max-w-none">
      {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((digit) => (
        <KeyButton key={digit} onClick={() => onDigit(String(digit))}>
          {digit}
        </KeyButton>
      ))}
      <KeyButton variant="control" onClick={onBackspace}>
        C
      </KeyButton>
      <KeyButton onClick={() => onDigit("0")}>
        0
      </KeyButton>
      <KeyButton variant="control" onClick={onNext}>
        次
      </KeyButton>
    </aside>
  );
}
