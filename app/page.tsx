"use client";

import { useEffect, useMemo, useReducer, useState } from "react";

type AttendanceStatus =
  | "before"
  | "workingBeforeOuting1"
  | "away1"
  | "workingBeforeOuting2"
  | "away2"
  | "workingBeforeOuting3"
  | "away3"
  | "workingAfterOuting3"
  | "finished";

type Outing = {
  out?: string;
  back?: string;
};

type AttendanceRecord = {
  id: string;
  employeeCode: string;
  employeeName: string;
  date: string;
  clockIn?: string;
  outings: Outing[];
  clockOut?: string;
};

type StampModal = {
  time: string;
  message: string;
};

type ViewMode = "clock" | "monthly";

type State = {
  employeeCode: string;
  isCodeSubmitted: boolean;
  records: AttendanceRecord[];
  message: string;
  showTodayRecords: boolean;
  stampModal: StampModal | null;
  viewMode: ViewMode;
  selectedMonth: string;
};

type Action =
  | { type: "hydrate"; records: AttendanceRecord[] }
  | { type: "appendDigit"; digit: string }
  | { type: "backspace" }
  | { type: "clearCode" }
  | { type: "clearInput" }
  | { type: "setEmployeeCode"; value: string }
  | { type: "submitCode" }
  | { type: "clockIn"; at: Date }
  | { type: "clockOut"; at: Date }
  | { type: "goOut"; at: Date }
  | { type: "returnBack"; at: Date }
  | { type: "openMonthly"; month: string }
  | { type: "closeMonthly" }
  | { type: "moveMonth"; direction: -1 | 1 }
  | { type: "showTodayRecords" }
  | { type: "closeStampModal" };

const STORAGE_KEY = "attendance-clock-v1-records";
const STORE_NAME = "浜松和合店";
const EMPLOYEE_NAME_PLACEHOLDER = "未登録";

const initialState: State = {
  employeeCode: "",
  isCodeSubmitted: false,
  records: [],
  message: "",
  showTodayRecords: true,
  stampModal: null,
  viewMode: "clock",
  selectedMonth: "",
};

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function monthKey(date: Date) {
  return dateKey(date).slice(0, 7);
}

function monthDate(month: string) {
  return new Date(`${month}-01T00:00:00+09:00`);
}

function addMonths(month: string, amount: number) {
  const date = monthDate(month);
  date.setMonth(date.getMonth() + amount);
  return monthKey(date);
}

function getTokyoParts(date: Date) {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const find = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: find("year"),
    month: find("month").replace(/^0/, ""),
    day: find("day").replace(/^0/, ""),
    weekday: find("weekday"),
    hour: find("hour"),
    minute: find("minute"),
    second: find("second"),
  };
}

function displayDate(date: Date) {
  const parts = getTokyoParts(date);
  return `${parts.year} 年 ${parts.month} 月 ${parts.day} 日 (${parts.weekday})`;
}

function displayMonth(month: string) {
  const [year, rawMonth] = month.split("-");
  return `${year} 年 ${Number(rawMonth)} 月`;
}

function displayLargeTime(date: Date) {
  const parts = getTokyoParts(date);
  return {
    hour: parts.hour || "--",
    minute: parts.minute || "--",
    second: parts.second || "--",
  };
}

function displayTime(value?: string) {
  if (!value) return "";

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function displayStampTime(date: Date) {
  const parts = getTokyoParts(date);
  return `${parts.hour}:${parts.minute}:${parts.second}`;
}

function getWorkedMinutes(record?: AttendanceRecord) {
  if (!record?.clockIn || !record.clockOut) return "";

  const clockInMs = new Date(record.clockIn).getTime();
  const clockOutMs = new Date(record.clockOut).getTime();
  let diffMs = clockOutMs - clockInMs;
  if (diffMs <= 0) return "";

  const outingMs = record.outings.reduce((total, outing) => {
    if (!outing.out || !outing.back) return total;

    const outMs = new Date(outing.out).getTime();
    const backMs = new Date(outing.back).getTime();
    return backMs > outMs ? total + (backMs - outMs) : total;
  }, 0);
  diffMs = Math.max(0, diffMs - outingMs);

  return Math.floor(diffMs / 60000);
}

function formatMinutes(totalMinutes: number | "") {
  if (totalMinutes === "") return "";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}

function displayDuration(record?: AttendanceRecord) {
  return formatMinutes(getWorkedMinutes(record));
}

function getCurrentRecord(records: AttendanceRecord[], employeeCode: string, today: string) {
  return records.find(
    (record) => record.employeeCode === employeeCode && record.date === today,
  );
}

function getMonthlyRecords(
  records: AttendanceRecord[],
  employeeCode: string,
  selectedMonth: string,
) {
  return records
    .filter(
      (record) =>
        record.employeeCode === employeeCode && record.date.startsWith(selectedMonth),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getStatus(record?: AttendanceRecord): AttendanceStatus {
  if (!record?.clockIn) return "before";
  if (record.clockOut) return "finished";

  const firstOuting = record.outings[0];
  const secondOuting = record.outings[1];
  const thirdOuting = record.outings[2];

  if (!firstOuting?.out) return "workingBeforeOuting1";
  if (!firstOuting.back) return "away1";
  if (!secondOuting?.out) return "workingBeforeOuting2";
  if (!secondOuting.back) return "away2";
  if (!thirdOuting?.out) return "workingBeforeOuting3";
  if (!thirdOuting.back) return "away3";

  return "workingAfterOuting3";
}

function upsertRecord(
  records: AttendanceRecord[],
  employeeCode: string,
  at: Date,
  update: (record: AttendanceRecord) => AttendanceRecord,
) {
  const today = dateKey(at);
  const id = `${today}-${employeeCode}`;
  const existing = getCurrentRecord(records, employeeCode, today);
  const base: AttendanceRecord = existing ?? {
    id,
    employeeCode,
    employeeName: EMPLOYEE_NAME_PLACEHOLDER,
    date: today,
    outings: [],
  };
  const nextRecord = update(base);

  if (!existing) return [...records, nextRecord];

  return records.map((record) => (record.id === id ? nextRecord : record));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { ...state, records: action.records };

    case "appendDigit":
      if (state.employeeCode.length >= 7) return state;
      return {
        ...state,
        employeeCode: `${state.employeeCode}${action.digit}`,
        isCodeSubmitted: false,
        message: "",
      };

    case "backspace":
      return {
        ...state,
        employeeCode: state.employeeCode.slice(0, -1),
        isCodeSubmitted: false,
        message: "",
      };

    case "clearCode":
      return {
        ...state,
        employeeCode: "",
        isCodeSubmitted: false,
        message: "",
      };

    case "clearInput":
      return {
        ...state,
        employeeCode: "",
        isCodeSubmitted: false,
        viewMode: "clock",
        message: "入力をクリアしました。保存済みの打刻履歴は残っています。",
      };

    case "setEmployeeCode":
      return {
        ...state,
        employeeCode: action.value.replace(/\D/g, "").slice(0, 7),
        isCodeSubmitted: false,
        message: "",
      };

    case "submitCode":
      if (state.employeeCode.length !== 7) {
        return {
          ...state,
          message: "従業員コードを7桁で入力してください。",
        };
      }
      return {
        ...state,
        isCodeSubmitted: true,
        message: "",
      };

    case "clockIn":
      if (state.employeeCode.length !== 7) return state;
      return {
        ...state,
        records: upsertRecord(state.records, state.employeeCode, action.at, (record) => ({
          ...record,
          clockIn: record.clockIn ?? action.at.toISOString(),
        })),
        message: "出勤を記録しました。",
        stampModal: {
          time: displayStampTime(action.at),
          message: "出勤しました",
        },
      };

    case "goOut":
      if (state.employeeCode.length !== 7) return state;
      return {
        ...state,
        records: upsertRecord(state.records, state.employeeCode, action.at, (record) => ({
          ...record,
          outings:
            record.outings.length >= 3
              ? record.outings
              : [...record.outings, { out: action.at.toISOString() }],
        })),
        message: "外出を記録しました。",
        stampModal: {
          time: displayStampTime(action.at),
          message: "外出しました",
        },
      };

    case "returnBack":
      if (state.employeeCode.length !== 7) return state;
      return {
        ...state,
        records: upsertRecord(state.records, state.employeeCode, action.at, (record) => ({
          ...record,
          outings: record.outings.map((outing) =>
            outing.out && !outing.back
              ? { ...outing, back: outing.back ?? action.at.toISOString() }
              : outing,
          ),
        })),
        message: "戻りを記録しました。",
        stampModal: {
          time: displayStampTime(action.at),
          message: "外出戻りしました",
        },
      };

    case "clockOut":
      if (state.employeeCode.length !== 7) return state;
      return {
        ...state,
        records: upsertRecord(state.records, state.employeeCode, action.at, (record) => ({
          ...record,
          clockOut: record.clockOut ?? action.at.toISOString(),
        })),
        message: "退勤を記録しました。",
        showTodayRecords: true,
        stampModal: {
          time: displayStampTime(action.at),
          message: "退勤しました",
        },
      };

    case "openMonthly":
      return {
        ...state,
        selectedMonth: action.month,
        viewMode: "monthly",
        message: "",
      };

    case "closeMonthly":
      return {
        ...state,
        viewMode: "clock",
        message: "",
      };

    case "moveMonth":
      return {
        ...state,
        selectedMonth: addMonths(state.selectedMonth, action.direction),
        message: "",
      };

    case "showTodayRecords":
      return {
        ...state,
        showTodayRecords: true,
        message: "当日の打刻を表示しています。",
      };

    case "closeStampModal":
      return {
        ...state,
        employeeCode: "",
        isCodeSubmitted: false,
        viewMode: "clock",
        message: "",
        stampModal: null,
      };
  }
}

function safeReadRecords(): AttendanceRecord[] {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return [];

    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function KeyButton({
  children,
  onClick,
  disabled,
  variant = "number",
}: {
  children: React.ReactNode;
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

function ActionButton({
  children,
  onClick,
  disabled,
  tone = "default",
  size = "default",
}: {
  children: React.ReactNode;
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
      ? "min-h-14 w-full px-5 py-3 text-lg sm:min-h-16 sm:text-xl"
      : size === "outing"
        ? "min-h-14 w-1/3 min-w-0 px-2 py-3 text-lg sm:min-h-16 sm:text-xl"
        : size === "clockOut"
          ? "min-h-14 w-full px-5 py-3 text-lg sm:min-h-16 sm:text-xl"
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

function StampCompleteModal({
  modal,
  onClose,
}: {
  modal: StampModal;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-700/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="打刻完了"
    >
      <div className="w-full max-w-md rounded bg-zinc-200/60 px-6 py-7 text-center text-zinc-950 shadow-2xl backdrop-blur-sm sm:px-8">
        <p className="[font-family:var(--font-clock),Arial,sans-serif] text-4xl font-normal [font-variant-numeric:tabular-nums] sm:text-5xl">
          {modal.time}
        </p>
        <p className="mt-6 text-2xl font-bold sm:text-3xl">{modal.message}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-7 min-h-14 min-w-36 rounded-none border border-zinc-500 bg-zinc-100/60 px-8 py-3 text-xl font-semibold text-zinc-950 shadow-[0_2px_5px_rgba(0,0,0,0.25)] transition active:translate-y-px [font-family:'MS_Gothic','ＭＳ_ゴシック',monospace]"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

function ClockActionButtons({
  status,
  selectedMonth,
  dispatch,
}: {
  status: AttendanceStatus;
  selectedMonth: string;
  dispatch: (action: Action) => void;
}) {
  const isFinished = status === "finished";

  return (
    <div className="flex w-full max-w-[520px] flex-col items-center gap-8 lg:max-w-[320px] lg:gap-14 lg:pt-20">
      <div className="flex min-h-[8rem] w-full flex-col items-center justify-center gap-4 sm:min-h-[9rem] lg:min-h-[9.75rem] lg:gap-7">
        {status === "before" ? (
          <ActionButton
            size="clockIn"
            onClick={() => dispatch({ type: "clockIn", at: new Date() })}
          >
            出勤
          </ActionButton>
        ) : null}

        {status === "workingBeforeOuting1" ? (
          <>
            <ActionButton
              size="outing"
              onClick={() => dispatch({ type: "goOut", at: new Date() })}
            >
              外出
            </ActionButton>
            <ActionButton
              size="clockOut"
              onClick={() => dispatch({ type: "clockOut", at: new Date() })}
            >
              退勤
            </ActionButton>
          </>
        ) : null}

        {status === "away1" ? (
          <ActionButton
            tone="primary"
            onClick={() => dispatch({ type: "returnBack", at: new Date() })}
          >
            外出戻り1
          </ActionButton>
        ) : null}

        {status === "workingBeforeOuting2" ? (
          <>
            <ActionButton
              size="outing"
              onClick={() => dispatch({ type: "goOut", at: new Date() })}
            >
              外出
            </ActionButton>
            <ActionButton
              size="clockOut"
              onClick={() => dispatch({ type: "clockOut", at: new Date() })}
            >
              退勤
            </ActionButton>
          </>
        ) : null}

        {status === "away2" ? (
          <ActionButton
            tone="primary"
            onClick={() => dispatch({ type: "returnBack", at: new Date() })}
          >
            外出戻り2
          </ActionButton>
        ) : null}

        {status === "workingBeforeOuting3" ? (
          <>
            <ActionButton
              size="outing"
              onClick={() => dispatch({ type: "goOut", at: new Date() })}
            >
              外出
            </ActionButton>
            <ActionButton
              size="clockOut"
              onClick={() => dispatch({ type: "clockOut", at: new Date() })}
            >
              退勤
            </ActionButton>
          </>
        ) : null}

        {status === "away3" ? (
          <ActionButton
            tone="primary"
            onClick={() => dispatch({ type: "returnBack", at: new Date() })}
          >
            外出戻り3
          </ActionButton>
        ) : null}

        {status === "workingAfterOuting3" ? (
          <ActionButton
            size="clockOut"
            onClick={() => dispatch({ type: "clockOut", at: new Date() })}
          >
            退勤
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
          確認
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

function ClockPanel({ now }: { now: Date }) {
  const time = displayLargeTime(now);

  return (
    <section className="rounded-sm bg-zinc-900/90 px-4 py-4 text-white shadow-lg sm:px-7 sm:py-5">
      <p
        suppressHydrationWarning
        className="text-center text-2xl font-semibold tracking-wide sm:text-4xl lg:text-5xl"
      >
        {displayDate(now)}
      </p>
      <div
        suppressHydrationWarning
        className="mt-3 grid grid-cols-[max-content_max-content_max-content_max-content_max-content] items-baseline justify-center gap-1 text-center text-[#ff9d1c] [font-family:var(--font-clock),Arial,sans-serif] [font-variant-numeric:tabular-nums] sm:gap-2"
      >
        <span className="text-7xl font-normal leading-none sm:text-8xl md:text-9xl lg:text-[9.5rem]">
          {time.hour}
        </span>
        <span className="text-6xl font-normal leading-none sm:text-7xl md:text-8xl lg:text-[8rem]">
          :
        </span>
        <span className="text-7xl font-normal leading-none sm:text-8xl md:text-9xl lg:text-[9.5rem]">
          {time.minute}
        </span>
        <span className="text-4xl font-normal leading-none sm:text-5xl md:text-6xl">
          :
        </span>
        <span className="text-4xl font-normal leading-none sm:text-5xl md:text-6xl">
          {time.second}
        </span>
      </div>
    </section>
  );
}

function Keypad({
  onDigit,
  onBackspace,
  onNext,
  digitDisabled,
}: {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onNext: () => void;
  digitDisabled?: boolean;
}) {
  return (
    <aside className="grid w-full max-w-[460px] grid-cols-3 gap-3 self-start sm:gap-4 lg:max-w-none">
      {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((digit) => (
        <KeyButton
          key={digit}
          disabled={digitDisabled}
          onClick={() => onDigit(String(digit))}
        >
          {digit}
        </KeyButton>
      ))}
      <KeyButton variant="control" onClick={onBackspace}>
        C
      </KeyButton>
      <KeyButton disabled={digitDisabled} onClick={() => onDigit("0")}>
        0
      </KeyButton>
      <KeyButton variant="control" onClick={onNext}>
        次
      </KeyButton>
    </aside>
  );
}

function MonthlySummaryScreen({
  employeeCode,
  month,
  records,
  totalMinutes,
  onPreviousMonth,
  onNextMonth,
  onBack,
}: {
  employeeCode: string;
  month: string;
  records: AttendanceRecord[];
  totalMinutes: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onBack: () => void;
}) {
  return (
    <section className="flex flex-1 flex-col gap-4">
      <div className="grid gap-4 rounded-sm bg-white/75 p-4 shadow-md lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-xl font-bold sm:text-2xl">勤怠確認</p>
          <p className="mt-1 text-base font-semibold text-zinc-700 sm:text-lg">
            従業員コード {employeeCode} / 氏名 {EMPLOYEE_NAME_PLACEHOLDER}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="min-h-12 rounded-none border border-zinc-500 bg-zinc-100 px-6 py-2 text-lg font-semibold shadow [font-family:'MS_Gothic','ＭＳ_ゴシック',monospace]"
        >
          戻る
        </button>
      </div>

      <div className="grid gap-4 rounded-sm bg-zinc-900/90 p-4 text-white shadow-lg md:grid-cols-[auto_1fr_auto] md:items-center">
        <button
          type="button"
          onClick={onPreviousMonth}
          className="min-h-12 rounded-none border border-zinc-500 bg-zinc-100 px-5 py-2 text-lg font-semibold text-zinc-950 shadow [font-family:'MS_Gothic','ＭＳ_ゴシック',monospace]"
        >
          前月
        </button>
        <div className="text-center">
          <p className="text-3xl font-bold sm:text-4xl">{displayMonth(month)}</p>
          <p className="mt-2 text-xl font-semibold text-[#ff9d1c] sm:text-2xl">
            月合計 {formatMinutes(totalMinutes)}
          </p>
        </div>
        <button
          type="button"
          onClick={onNextMonth}
          className="min-h-12 rounded-none border border-zinc-500 bg-zinc-100 px-5 py-2 text-lg font-semibold text-zinc-950 shadow [font-family:'MS_Gothic','ＭＳ_ゴシック',monospace]"
        >
          次月
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[980px] border-collapse bg-white text-center text-sm shadow-md sm:text-base">
          <thead>
            <tr className="bg-[#d92913] text-white">
              <th className="border border-zinc-500 px-3 py-2">出勤日</th>
              <th className="border border-zinc-500 px-3 py-2">出勤</th>
              <th className="border border-zinc-500 px-3 py-2">外出1</th>
              <th className="border border-zinc-500 px-3 py-2">戻り1</th>
              <th className="border border-zinc-500 px-3 py-2">外出2</th>
              <th className="border border-zinc-500 px-3 py-2">戻り2</th>
              <th className="border border-zinc-500 px-3 py-2">外出3</th>
              <th className="border border-zinc-500 px-3 py-2">戻り3</th>
              <th className="border border-zinc-500 px-3 py-2">退勤</th>
              <th className="border border-zinc-500 px-3 py-2">時間</th>
            </tr>
          </thead>
          <tbody>
            {records.length > 0 ? (
              records.map((record) => (
                <tr key={record.id}>
                  <td className="border border-zinc-400 px-3 py-2">
                    {record.date.replaceAll("-", "/")}
                  </td>
                  <td className="border border-zinc-400 px-3 py-2">
                    {displayTime(record.clockIn)}
                  </td>
                  <td className="border border-zinc-400 px-3 py-2">
                    {displayTime(record.outings[0]?.out)}
                  </td>
                  <td className="border border-zinc-400 px-3 py-2">
                    {displayTime(record.outings[0]?.back)}
                  </td>
                  <td className="border border-zinc-400 px-3 py-2">
                    {displayTime(record.outings[1]?.out)}
                  </td>
                  <td className="border border-zinc-400 px-3 py-2">
                    {displayTime(record.outings[1]?.back)}
                  </td>
                  <td className="border border-zinc-400 px-3 py-2">
                    {displayTime(record.outings[2]?.out)}
                  </td>
                  <td className="border border-zinc-400 px-3 py-2">
                    {displayTime(record.outings[2]?.back)}
                  </td>
                  <td className="border border-zinc-400 px-3 py-2">
                    {displayTime(record.clockOut)}
                  </td>
                  <td className="border border-zinc-400 px-3 py-2">
                    {displayDuration(record)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={10}
                  className="border border-zinc-400 px-3 py-8 text-zinc-600"
                >
                  この月の勤怠はまだありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [now, setNow] = useState(() => new Date());
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const startup = window.setTimeout(() => {
      dispatch({ type: "hydrate", records: safeReadRecords() });
      setIsHydrated(true);
    }, 0);
    const timer = window.setInterval(() => setNow(new Date()), 1000);

    return () => {
      window.clearTimeout(startup);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
  }, [isHydrated, state.records]);

  const today = useMemo(() => dateKey(now ?? new Date()), [now]);
  const currentRecord = useMemo(
    () => getCurrentRecord(state.records, state.employeeCode, today),
    [state.employeeCode, state.records, today],
  );
  const status = getStatus(currentRecord);
  const isCodeReady = state.employeeCode.length === 7;
  const isClockScreen = state.isCodeSubmitted && isCodeReady;
  const selectedMonth = state.selectedMonth || monthKey(now);
  const isMonthlyScreen = isClockScreen && state.viewMode === "monthly";
  const todayRecords = useMemo(
    () =>
      state.records.filter(
        (record) => record.date === today && record.employeeCode === state.employeeCode,
      ),
    [state.employeeCode, state.records, today],
  );
  const monthlyRecords = useMemo(
    () => getMonthlyRecords(state.records, state.employeeCode, selectedMonth),
    [selectedMonth, state.employeeCode, state.records],
  );
  const monthlyTotalMinutes = useMemo(
    () =>
      monthlyRecords.reduce((total, record) => {
        const workedMinutes = getWorkedMinutes(record);
        return total + (workedMinutes === "" ? 0 : workedMinutes);
      }, 0),
    [monthlyRecords],
  );

  return (
    <main className="min-h-dvh bg-[#00df08] text-zinc-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col gap-3 p-3 sm:p-4 lg:p-5">
        <header className="border-2 border-[#1fbf25] bg-zinc-50 px-4 py-3 text-center text-lg font-bold text-red-600 shadow-sm sm:text-xl">
          {STORE_NAME}
        </header>

        {isMonthlyScreen ? (
          <MonthlySummaryScreen
            employeeCode={state.employeeCode}
            month={selectedMonth}
            records={monthlyRecords}
            totalMinutes={monthlyTotalMinutes}
            onPreviousMonth={() => dispatch({ type: "moveMonth", direction: -1 })}
            onNextMonth={() => dispatch({ type: "moveMonth", direction: 1 })}
            onBack={() => dispatch({ type: "closeMonthly" })}
          />
        ) : !isClockScreen ? (
          <section className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(300px,0.65fr)] xl:grid-cols-[minmax(0,2fr)_minmax(340px,0.7fr)]">
            <div className="flex min-w-0 flex-col gap-4">
              <ClockPanel now={now} />

              <section className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="employee-code"
                    className="block text-xl font-semibold sm:text-2xl"
                  >
                    従業員コード
                  </label>
                  <input
                    id="employee-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={state.employeeCode}
                    onChange={(event) =>
                      dispatch({ type: "setEmployeeCode", value: event.target.value })
                    }
                    className="w-full max-w-md rounded border-2 border-emerald-700 bg-emerald-50/90 px-4 py-3 text-center text-3xl font-semibold tracking-[0.2em] outline-none focus:border-zinc-950 sm:text-4xl"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xl font-semibold sm:text-2xl">氏名</p>
                  <p className="min-h-12 text-2xl font-semibold sm:text-3xl" />
                </div>

                {state.message ? (
                  <p className="max-w-2xl rounded bg-white/70 px-4 py-3 text-base font-semibold text-zinc-900 shadow-sm sm:text-lg">
                    {state.message}
                  </p>
                ) : null}
              </section>
            </div>

            <div className="flex justify-center lg:justify-start">
              <Keypad
                digitDisabled={state.employeeCode.length >= 7}
                onDigit={(digit) => dispatch({ type: "appendDigit", digit })}
                onBackspace={() => dispatch({ type: "clearCode" })}
                onNext={() => dispatch({ type: "submitCode" })}
              />
            </div>
          </section>
        ) : (
          <section className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
            <div className="flex min-w-0 flex-col gap-4">
              <ClockPanel now={now} />

              <section className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xl font-semibold sm:text-2xl">氏名</p>
                  <p className="min-h-12 text-2xl font-semibold sm:text-3xl">
                    {EMPLOYEE_NAME_PLACEHOLDER}
                  </p>
                </div>

                {state.message ? (
                  <p className="max-w-2xl rounded bg-white/70 px-4 py-3 text-base font-semibold text-zinc-900 shadow-sm sm:text-lg">
                    {state.message}
                  </p>
                ) : null}
              </section>

            <section>
              {state.showTodayRecords ? (
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] border-collapse bg-white text-center text-sm shadow-md sm:text-base">
                    <thead>
                      <tr className="bg-[#d92913] text-white">
                        <th className="border border-zinc-500 px-3 py-2">出勤日</th>
                        <th className="border border-zinc-500 px-3 py-2">出勤</th>
                        <th className="border border-zinc-500 px-3 py-2">外出1</th>
                        <th className="border border-zinc-500 px-3 py-2">戻り1</th>
                        <th className="border border-zinc-500 px-3 py-2">外出2</th>
                        <th className="border border-zinc-500 px-3 py-2">戻り2</th>
                        <th className="border border-zinc-500 px-3 py-2">外出3</th>
                        <th className="border border-zinc-500 px-3 py-2">戻り3</th>
                        <th className="border border-zinc-500 px-3 py-2">退勤</th>
                        <th className="border border-zinc-500 px-3 py-2">時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayRecords.length > 0 ? (
                        todayRecords.map((record) => (
                          <tr key={record.id}>
                            <td className="border border-zinc-400 px-3 py-2">
                              {record.date.replaceAll("-", "/")}
                            </td>
                            <td className="border border-zinc-400 px-3 py-2">
                              {displayTime(record.clockIn)}
                            </td>
                            <td className="border border-zinc-400 px-3 py-2">
                              {displayTime(record.outings[0]?.out)}
                            </td>
                            <td className="border border-zinc-400 px-3 py-2">
                              {displayTime(record.outings[0]?.back)}
                            </td>
                            <td className="border border-zinc-400 px-3 py-2">
                              {displayTime(record.outings[1]?.out)}
                            </td>
                            <td className="border border-zinc-400 px-3 py-2">
                              {displayTime(record.outings[1]?.back)}
                            </td>
                            <td className="border border-zinc-400 px-3 py-2">
                              {displayTime(record.outings[2]?.out)}
                            </td>
                            <td className="border border-zinc-400 px-3 py-2">
                              {displayTime(record.outings[2]?.back)}
                            </td>
                            <td className="border border-zinc-400 px-3 py-2">
                              {displayTime(record.clockOut)}
                            </td>
                            <td className="border border-zinc-400 px-3 py-2">
                              {displayDuration(record)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={10}
                            className="border border-zinc-400 px-3 py-5 text-zinc-600"
                          >
                            本日の打刻はまだありません。
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : null}

              <div className="mt-4 text-center">
                <button
                  type="button"
                  className="rounded-none border border-zinc-400 bg-zinc-100 px-5 py-2 text-sm font-semibold shadow [font-family:'MS_Gothic','ＭＳ_ゴシック',monospace]"
                  onClick={() => dispatch({ type: "showTodayRecords" })}
                >
                  打刻漏れ確認
                </button>
              </div>
            </section>
            </div>

            <aside className="flex justify-center lg:justify-end">
              <ClockActionButtons
                status={status}
                selectedMonth={selectedMonth}
                dispatch={dispatch}
              />
            </aside>
          </section>
        )}
      </div>
      {state.stampModal ? (
        <StampCompleteModal
          modal={state.stampModal}
          onClose={() => dispatch({ type: "closeStampModal" })}
        />
      ) : null}
    </main>
  );
}
