"use client";

import { useEffect, useMemo, useReducer, useState } from "react";

type AttendanceStatus = "before" | "working" | "away" | "finished";

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

type State = {
  employeeCode: string;
  isCodeSubmitted: boolean;
  records: AttendanceRecord[];
  message: string;
  showTodayRecords: boolean;
};

type Action =
  | { type: "hydrate"; records: AttendanceRecord[] }
  | { type: "appendDigit"; digit: string }
  | { type: "backspace" }
  | { type: "clearInput" }
  | { type: "setEmployeeCode"; value: string }
  | { type: "submitCode" }
  | { type: "clockIn"; at: Date }
  | { type: "clockOut"; at: Date }
  | { type: "goOut"; at: Date }
  | { type: "returnBack"; at: Date }
  | { type: "confirm" }
  | { type: "showTodayRecords" };

const STORAGE_KEY = "attendance-clock-v1-records";
const STORE_NAME = "浜松和合店";
const EMPLOYEE_NAME_PLACEHOLDER = "未登録";

const initialState: State = {
  employeeCode: "",
  isCodeSubmitted: false,
  records: [],
  message: "",
  showTodayRecords: true,
};

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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

function displayDuration(record?: AttendanceRecord) {
  if (!record?.clockIn || !record.clockOut) return "";

  const diffMs = new Date(record.clockOut).getTime() - new Date(record.clockIn).getTime();
  if (diffMs <= 0) return "";

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}

function getCurrentRecord(records: AttendanceRecord[], employeeCode: string, today: string) {
  return records.find(
    (record) => record.employeeCode === employeeCode && record.date === today,
  );
}

function getStatus(record?: AttendanceRecord): AttendanceStatus {
  if (!record?.clockIn) return "before";
  if (record.clockOut) return "finished";

  const latestOuting = record.outings.at(-1);
  if (latestOuting?.out && !latestOuting.back) return "away";

  return "working";
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

    case "clearInput":
      return {
        ...state,
        employeeCode: "",
        isCodeSubmitted: false,
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
      };

    case "goOut":
      if (state.employeeCode.length !== 7) return state;
      return {
        ...state,
        records: upsertRecord(state.records, state.employeeCode, action.at, (record) => ({
          ...record,
          outings: [...record.outings, { out: action.at.toISOString() }],
        })),
        message: "外出を記録しました。",
      };

    case "returnBack":
      if (state.employeeCode.length !== 7) return state;
      return {
        ...state,
        records: upsertRecord(state.records, state.employeeCode, action.at, (record) => ({
          ...record,
          outings: record.outings.map((outing, index) =>
            index === record.outings.length - 1
              ? { ...outing, back: outing.back ?? action.at.toISOString() }
              : outing,
          ),
        })),
        message: "戻りを記録しました。",
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
      };

    case "confirm":
      return { ...state, message: "本日の打刻を確認しました。" };

    case "showTodayRecords":
      return {
        ...state,
        showTodayRecords: true,
        message: "当日の打刻を表示しています。",
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
      className={`flex aspect-square min-h-16 items-center justify-center rounded-full border border-zinc-400 bg-zinc-100 text-3xl font-medium text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_2px_5px_rgba(0,0,0,0.22)] transition active:translate-y-px active:shadow-sm disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-20 sm:text-4xl lg:min-h-24 ${
        variant === "control" ? "text-2xl sm:text-3xl" : ""
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
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "primary" | "warning";
}) {
  const toneClass =
    tone === "primary"
      ? "border-emerald-700 bg-white text-emerald-900"
      : tone === "warning"
        ? "border-orange-600 bg-white text-orange-900"
        : "border-zinc-400 bg-zinc-100 text-zinc-900";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-14 min-w-28 rounded border px-5 py-3 text-lg font-semibold shadow-[0_2px_5px_rgba(0,0,0,0.25)] transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-16 sm:min-w-36 sm:text-xl ${toneClass}`}
    >
      {children}
    </button>
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
        className="mt-3 flex items-baseline justify-center gap-2 font-mono text-[#ff9d1c] [font-variant-numeric:tabular-nums] sm:gap-4"
      >
        <span className="w-[2ch] text-right text-7xl font-light leading-none sm:text-8xl md:text-9xl lg:text-[9.5rem]">
          {time.hour}
        </span>
        <span className="text-6xl font-light leading-none sm:text-8xl md:text-9xl lg:text-[8.5rem]">
          :
        </span>
        <span className="w-[2ch] text-right text-7xl font-light leading-none sm:text-8xl md:text-9xl lg:text-[9.5rem]">
          {time.minute}
        </span>
        <span className="text-4xl font-light leading-none sm:text-5xl md:text-6xl">
          :
        </span>
        <span className="w-[2ch] text-right text-4xl font-light leading-none sm:text-5xl md:text-6xl">
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
  const todayRecords = useMemo(
    () => state.records.filter((record) => record.date === today),
    [state.records, today],
  );

  return (
    <main className="min-h-dvh bg-[#00df08] text-zinc-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col gap-3 p-3 sm:p-4 lg:p-5">
        <header className="border-2 border-[#1fbf25] bg-zinc-50 px-4 py-3 text-center text-lg font-bold text-red-600 shadow-sm sm:text-xl">
          {STORE_NAME}
        </header>

        {!isClockScreen ? (
          <section className="grid flex-1 place-items-center py-4">
            <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-center">
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
                    className="w-full rounded border-2 border-emerald-700 bg-emerald-50/90 px-4 py-4 text-center text-4xl font-semibold tracking-[0.2em] outline-none focus:border-zinc-950 sm:text-6xl"
                    placeholder="7桁"
                    autoFocus
                  />
                </div>

                {state.message ? (
                  <p className="rounded bg-white/70 px-4 py-3 text-base font-semibold text-zinc-900 shadow-sm sm:text-lg">
                    {state.message}
                  </p>
                ) : null}
              </section>

              <Keypad
                digitDisabled={state.employeeCode.length >= 7}
                onDigit={(digit) => dispatch({ type: "appendDigit", digit })}
                onBackspace={() => dispatch({ type: "backspace" })}
                onNext={() => dispatch({ type: "submitCode" })}
              />
            </div>
          </section>
        ) : (
          <section className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(300px,0.65fr)] xl:grid-cols-[minmax(0,2fr)_minmax(340px,0.7fr)]">
            <div className="flex min-w-0 flex-col gap-4">
              <ClockPanel now={now} />

              <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <p className="text-xl font-semibold sm:text-2xl">従業員コード</p>
                    <p className="w-full max-w-md rounded border-2 border-emerald-700 bg-emerald-50/80 px-4 py-3 text-center text-3xl font-semibold tracking-[0.2em] sm:text-4xl">
                      {state.employeeCode}
                    </p>
                  </div>

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
                </div>

                <div className="flex flex-wrap gap-3 lg:max-w-sm lg:justify-end">
                  {status === "before" ? (
                    <ActionButton
                      tone="primary"
                      onClick={() => dispatch({ type: "clockIn", at: new Date() })}
                    >
                      出勤
                    </ActionButton>
                  ) : null}

                  {status === "working" ? (
                    <>
                      <ActionButton onClick={() => dispatch({ type: "goOut", at: new Date() })}>
                        外出
                      </ActionButton>
                      <ActionButton
                        tone="warning"
                        onClick={() => dispatch({ type: "clockOut", at: new Date() })}
                      >
                        退勤
                      </ActionButton>
                    </>
                  ) : null}

                  {status === "away" ? (
                    <ActionButton
                      tone="primary"
                      onClick={() => dispatch({ type: "returnBack", at: new Date() })}
                    >
                      戻り
                    </ActionButton>
                  ) : null}

                  {status === "finished" ? (
                    <>
                      <ActionButton onClick={() => dispatch({ type: "confirm" })}>
                        確認
                      </ActionButton>
                      <ActionButton onClick={() => dispatch({ type: "showTodayRecords" })}>
                        当日打刻確認
                      </ActionButton>
                      <ActionButton onClick={() => dispatch({ type: "clearInput" })}>
                        クリア
                      </ActionButton>
                    </>
                  ) : null}

                  {status !== "finished" ? (
                    <ActionButton onClick={() => dispatch({ type: "clearInput" })}>
                      クリア
                    </ActionButton>
                  ) : null}
                </div>
              </section>
            </div>

            <section className="lg:col-start-1 lg:row-start-2">
              {state.showTodayRecords ? (
                <div className="overflow-x-auto">
                  <table className="min-w-[780px] border-collapse bg-white text-center text-sm shadow-md sm:text-base">
                    <thead>
                      <tr className="bg-[#d92913] text-white">
                        <th className="border border-zinc-500 px-3 py-2">出勤日</th>
                        <th className="border border-zinc-500 px-3 py-2">コード</th>
                        <th className="border border-zinc-500 px-3 py-2">氏名</th>
                        <th className="border border-zinc-500 px-3 py-2">出勤</th>
                        <th className="border border-zinc-500 px-3 py-2">外出</th>
                        <th className="border border-zinc-500 px-3 py-2">戻り</th>
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
                              {record.employeeCode}
                            </td>
                            <td className="border border-zinc-400 px-3 py-2">
                              {record.employeeName}
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
                            colSpan={8}
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
                  className="rounded border border-zinc-400 bg-zinc-100 px-5 py-2 text-sm font-semibold shadow"
                  onClick={() => dispatch({ type: "showTodayRecords" })}
                >
                  打刻漏れ確認
                </button>
              </div>
            </section>
          </section>
        )}
      </div>
    </main>
  );
}
