import type { ReactNode } from "react";
import type { Action, AttendanceStatus } from "@/features/attendance/types";

function ActionButton({
  children,
  onClick,
  disabled,
  tone = "default",
  size = "default",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "primary" | "warning";
  size?: "default" | "clockIn" | "outing" | "clockOut" | "confirm";
}) {
  const toneClass =
    tone === "primary"
      ? "border-emerald-700 bg-white text-emerald-900"
      : tone === "warning"
        ? "border-orange-600 bg-white text-orange-900"
        : "border-zinc-400 bg-zinc-100 text-zinc-900";
  const sizeClass =
    size === "clockIn"
      ? "min-h-14 w-full px-5 py-3 text-3xl sm:min-h-16 sm:text-4xl"
      : size === "outing"
        ? "min-h-14 w-[40%] min-w-0 px-2 py-3 text-lg sm:min-h-16 sm:text-xl"
        : size === "clockOut"
          ? "min-h-14 w-full px-5 py-3 text-3xl sm:min-h-16 sm:text-4xl"
          : size === "confirm"
            ? "min-h-14 w-full px-3 py-3 text-base sm:min-h-16 sm:text-lg lg:text-xl"
            : "min-h-14 min-w-28 px-5 py-3 text-lg sm:min-h-16 sm:min-w-36 sm:text-xl";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`whitespace-nowrap rounded-none border font-semibold [font-family:'MS_Gothic','ＭＳ_ゴシック',monospace] shadow-[0_2px_5px_rgba(0,0,0,0.25)] transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 ${sizeClass} ${toneClass}`}
    >
      {children}
    </button>
  );
}

export function ClockActionButtons({
  status,
  selectedMonth,
  dispatch,
  onClockIn,
  onGoOut,
  onReturnBack,
  onClockOut,
}: {
  status: AttendanceStatus;
  selectedMonth: string;
  dispatch: (action: Action) => void;
  onClockIn: () => void;
  onGoOut: () => void;
  onReturnBack: () => void;
  onClockOut: () => void;
}) {
  const isFinished = status === "finished";

  return (
    <div className="flex w-full max-w-[520px] flex-col items-center gap-8 lg:max-w-[320px] lg:gap-14 lg:pt-20">
      <div className="flex min-h-[8rem] w-full flex-col items-center justify-center gap-4 sm:min-h-[9rem] lg:min-h-[9.75rem] lg:gap-7">
        {status === "before" ? (
          <ActionButton size="clockIn" onClick={onClockIn}>
            出　勤
          </ActionButton>
        ) : null}

        {status === "workingBeforeOuting1" ? (
          <>
            <ActionButton
              size="outing"
              onClick={onGoOut}
            >
              外　出
            </ActionButton>
            <ActionButton
              size="clockOut"
              onClick={onClockOut}
            >
              退　勤
            </ActionButton>
          </>
        ) : null}

        {status === "away1" ? (
          <ActionButton onClick={onReturnBack}>
            外出戻り
          </ActionButton>
        ) : null}

        {status === "workingBeforeOuting2" ? (
          <>
            <ActionButton
              size="outing"
              onClick={onGoOut}
            >
              外　出
            </ActionButton>
            <ActionButton
              size="clockOut"
              onClick={onClockOut}
            >
              退　勤
            </ActionButton>
          </>
        ) : null}

        {status === "away2" ? (
          <ActionButton onClick={onReturnBack}>
            外出戻り
          </ActionButton>
        ) : null}

        {status === "workingBeforeOuting3" ? (
          <>
            <ActionButton
              size="outing"
              onClick={onGoOut}
            >
              外　出
            </ActionButton>
            <ActionButton
              size="clockOut"
              onClick={onClockOut}
            >
              退　勤
            </ActionButton>
          </>
        ) : null}

        {status === "away3" ? (
          <ActionButton onClick={onReturnBack}>
            外出戻り
          </ActionButton>
        ) : null}

        {status === "workingAfterOuting3" ? (
          <ActionButton size="clockOut" onClick={onClockOut}>
            退　勤
          </ActionButton>
        ) : null}

        {isFinished ? (
          <p className="w-full text-center text-base font-bold text-zinc-950 sm:text-lg lg:text-xl">
            ※本日の打刻は終了しています。
          </p>
        ) : null}
      </div>

      <div className="grid w-full max-w-[520px] grid-cols-2 gap-3 lg:max-w-[320px]">
        <ActionButton
          size="confirm"
          onClick={
            isFinished
              ? () => dispatch({ type: "openMonthly", month: selectedMonth })
              : () => undefined
          }
        >
          確　認
        </ActionButton>
        <ActionButton
          size="confirm"
          onClick={isFinished ? () => dispatch({ type: "showTodayRecords" }) : () => undefined}
        >
          当日打刻確認
        </ActionButton>
      </div>

      <div className="flex justify-center lg:w-full lg:justify-center">
        <ActionButton onClick={() => dispatch({ type: "clearInput" })}>
          クリア
        </ActionButton>
      </div>
    </div>
  );
}
