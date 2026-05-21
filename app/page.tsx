"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { ClockActionButtons } from "@/components/ActionButtons";
import { ClockPanel } from "@/components/ClockPanel";
import { DailyStoreAttendanceModal } from "@/components/DailyStoreAttendanceModal";
import { Keypad } from "@/components/Keypad";
import { MissingPunchCheckButton } from "@/components/MissingPunchCheckButton";
import { MonthlyAttendanceModal } from "@/components/MonthlyAttendanceModal";
import { StampCompleteModal } from "@/components/StampModal";
import { STORE_NAME } from "@/features/attendance/constants";
import { dateKey, getWorkedMinutes, monthKey } from "@/features/attendance/date";
import {
  getCurrentRecord,
  getMonthlyRecords,
  getStatus,
  initialState,
  reducer,
} from "@/features/attendance/reducer";
import {
  AttendanceApiError,
  fetchAttendanceSnapshotApi,
  fetchDailyStoreAttendanceApi,
  fetchMonthlyAttendanceApi,
  type PunchActionType,
  punchAttendanceApi,
  toAttendanceRecord,
  toAttendanceRecords,
  toDailyStoreAttendanceRows,
} from "@/lib/attendance-api";
import type { DailyStoreAttendanceRow } from "@/features/attendance/types";

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [now, setNow] = useState(() => new Date());
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [dailyStoreRows, setDailyStoreRows] = useState<DailyStoreAttendanceRow[]>([]);
  const [isDailyStoreLoading, setIsDailyStoreLoading] = useState(false);

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
  const isDailyStoreScreen = isClockScreen && state.viewMode === "dailyStore";
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

  useEffect(() => {
    if (!isMonthlyScreen || state.employeeCode.length !== 7) return;

    let isActive = true;

    async function loadMonthlyRecords() {
      try {
        const data = await fetchMonthlyAttendanceApi({
          employeeCode: state.employeeCode,
          month: selectedMonth,
        });

        if (!isActive) return;
        dispatch({ type: "replaceRecords", records: toAttendanceRecords(data) });
      } catch (error) {
        if (!isActive) return;
        dispatch({
          type: "setMessage",
          message:
            error instanceof AttendanceApiError
              ? error.message
              : "打刻実績の取得に失敗しました。",
        });
      }
    }

    void loadMonthlyRecords();

    return () => {
      isActive = false;
    };
  }, [isMonthlyScreen, selectedMonth, state.employeeCode]);

  useEffect(() => {
    if (!isDailyStoreScreen || state.employeeCode.length !== 7) return;

    let isActive = true;
    async function loadDailyStoreRecords() {
      setDailyStoreRows([]);
      setIsDailyStoreLoading(true);

      try {
        const data = await fetchDailyStoreAttendanceApi({
          employeeCode: state.employeeCode,
          date: today,
        });

        if (!isActive) return;
        setDailyStoreRows(toDailyStoreAttendanceRows(data));
      } catch (error) {
        if (!isActive) return;
        dispatch({
          type: "setMessage",
          message:
            error instanceof AttendanceApiError
              ? error.message
              : "当日打刻状況の取得に失敗しました。",
        });
        dispatch({ type: "closeDailyStore" });
      } finally {
        if (isActive) {
          setIsDailyStoreLoading(false);
        }
      }
    }

    void loadDailyStoreRecords();

    return () => {
      isActive = false;
    };
  }, [isDailyStoreScreen, state.employeeCode, today]);

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

        {!isClockScreen ? (
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

                <MissingPunchCheckButton
                  onClick={() => dispatch({ type: "openDailyStore" })}
                />
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
      {isMonthlyScreen ? (
        <MonthlyAttendanceModal
          employeeName={state.employeeName}
          month={selectedMonth}
          records={monthlyRecords}
          totalMinutes={monthlyTotalMinutes}
          onPreviousMonth={() => dispatch({ type: "moveMonth", direction: -1 })}
          onNextMonth={() => dispatch({ type: "moveMonth", direction: 1 })}
          onClose={() => dispatch({ type: "closeMonthly" })}
        />
      ) : null}
      {isDailyStoreScreen ? (
        <DailyStoreAttendanceModal
          date={today}
          rows={dailyStoreRows}
          isLoading={isDailyStoreLoading}
          onClose={() => dispatch({ type: "closeDailyStore" })}
        />
      ) : null}
      {state.stampModal ? (
        <StampCompleteModal
          modal={state.stampModal}
          onClose={() => dispatch({ type: "closeStampModal" })}
        />
      ) : null}
    </main>
  );
}
