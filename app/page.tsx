"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { ClockActionButtons } from "@/components/ActionButtons";
import { ClockPanel } from "@/components/ClockPanel";
import { Keypad } from "@/components/Keypad";
import { StampCompleteModal } from "@/components/StampModal";
import { TodayTable } from "@/components/TodayTable";
import { EMPLOYEE_NAME_PLACEHOLDER, STORE_NAME } from "@/features/attendance/constants";
import {
  dateKey,
  displayDuration,
  displayMonth,
  displayTime,
  formatMinutes,
  getWorkedMinutes,
  monthKey,
} from "@/features/attendance/date";
import {
  getCurrentRecord,
  getMonthlyRecords,
  getStatus,
  initialState,
  reducer,
} from "@/features/attendance/reducer";
import type { AttendanceRecord } from "@/features/attendance/types";
import {
  AttendanceApiError,
  fetchAttendanceSnapshotApi,
  type PunchActionType,
  punchAttendanceApi,
  toAttendanceRecord,
} from "@/lib/attendance-api";

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
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

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

  async function handlePunch(actionType: PunchActionType) {
    const at = new Date();

    try {
      const data = await punchAttendanceApi({
        employeeCode: state.employeeCode,
        actionType,
        at,
      });
      const record = toAttendanceRecord(data);

      dispatch({
        type: actionType,
        at,
        employeeName: data.employee.name,
      });
      if (record) {
        dispatch({ type: "replaceRecord", record });
      }
    } catch (error) {
      dispatch({
        type: "setMessage",
        message:
          error instanceof AttendanceApiError
            ? error.message
            : "打刻処理に失敗しました。",
      });
    }
  }

  async function handleSubmitCode() {
    if (!isCodeReady || isSubmittingCode) {
      dispatch({ type: "submitCode" });
      return;
    }

    setIsSubmittingCode(true);
    try {
      const data = await fetchAttendanceSnapshotApi({
        employeeCode: state.employeeCode,
        date: today,
      });
      dispatch({
        type: "submitEmployee",
        employeeCode: data.employee.employeeCode,
        employeeName: data.employee.name,
        record: toAttendanceRecord(data),
      });
    } catch (error) {
      dispatch({
        type: "setMessage",
        message:
          error instanceof AttendanceApiError
            ? error.message
            : "従業員情報の取得に失敗しました。",
      });
    } finally {
      setIsSubmittingCode(false);
    }
  }

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
                onNext={() => void handleSubmitCode()}
              />
            </div>
          </section>
        ) : (
          <section className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
            <div className="flex min-w-0 flex-col gap-4">
              <ClockPanel now={now} />

              <section className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xl font-semibold sm:text-2xl">従業員コード</p>
                  <p className="min-h-12 text-2xl font-semibold sm:text-3xl">
                    {state.employeeName}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xl font-semibold sm:text-2xl">氏名</p>
                  <p className="min-h-12 text-2xl font-semibold sm:text-3xl">
                    {state.employeeName}
                  </p>
                </div>

                {state.message ? (
                  <p className="max-w-2xl rounded bg-white/70 px-4 py-3 text-base font-semibold text-zinc-900 shadow-sm sm:text-lg">
                    {state.message}
                  </p>
                ) : null}
              </section>

              <TodayTable
                records={todayRecords}
                show={state.showTodayRecords}
                onShowTodayRecords={() => dispatch({ type: "showTodayRecords" })}
              />
            </div>

            <aside className="flex justify-center lg:justify-end">
              <ClockActionButtons
                status={status}
                selectedMonth={selectedMonth}
                dispatch={dispatch}
                onClockIn={() => void handlePunch("clockIn")}
                onGoOut={() => void handlePunch("goOut")}
                onReturnBack={() => void handlePunch("returnBack")}
                onClockOut={() => void handlePunch("clockOut")}
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
