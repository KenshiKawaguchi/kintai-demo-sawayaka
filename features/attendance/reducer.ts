import { EMPLOYEE_NAME_PLACEHOLDER } from "./constants";
import { addMonths, dateKey, displayStampTime } from "./date";
import type { Action, AttendanceRecord, AttendanceStatus, State } from "./types";

export const initialState: State = {
  employeeCode: "",
  employeeName: EMPLOYEE_NAME_PLACEHOLDER,
  isCodeSubmitted: false,
  records: [],
  message: "",
  showTodayRecords: true,
  stampModal: null,
  viewMode: "clock",
  selectedMonth: "",
};

export function getCurrentRecord(
  records: AttendanceRecord[],
  employeeCode: string,
  today: string,
) {
  return records.find(
    (record) => record.employeeCode === employeeCode && record.date === today,
  );
}

export function getMonthlyRecords(
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

export function getStatus(record?: AttendanceRecord): AttendanceStatus {
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
  employeeName = EMPLOYEE_NAME_PLACEHOLDER,
) {
  const today = dateKey(at);
  const id = `${today}-${employeeCode}`;
  const existing = getCurrentRecord(records, employeeCode, today);
  const base: AttendanceRecord = existing ?? {
    id,
    employeeCode,
    employeeName,
    storeCode: "",
    storeName: "",
    date: today,
    outings: [],
  };
  const nextRecord = { ...update(base), employeeName };

  if (!existing) return [...records, nextRecord];

  return records.map((record) => (record.id === id ? nextRecord : record));
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { ...state, records: action.records };

    case "appendDigit":
      if (state.employeeCode.length >= 7) return state;
      return {
        ...state,
        employeeCode: `${state.employeeCode}${action.digit}`,
        employeeName: EMPLOYEE_NAME_PLACEHOLDER,
        isCodeSubmitted: false,
        message: "",
      };

    case "backspace":
      return {
        ...state,
        employeeCode: state.employeeCode.slice(0, -1),
        employeeName: EMPLOYEE_NAME_PLACEHOLDER,
        isCodeSubmitted: false,
        message: "",
      };

    case "clearCode":
      return {
        ...state,
        employeeCode: "",
        employeeName: EMPLOYEE_NAME_PLACEHOLDER,
        isCodeSubmitted: false,
        message: "",
      };

    case "clearInput":
      return {
        ...state,
        employeeCode: "",
        employeeName: EMPLOYEE_NAME_PLACEHOLDER,
        isCodeSubmitted: false,
        viewMode: "clock",
        message: "",
      };

    case "setEmployeeCode":
      return {
        ...state,
        employeeCode: action.value.replace(/\D/g, "").slice(0, 7),
        employeeName: EMPLOYEE_NAME_PLACEHOLDER,
        isCodeSubmitted: false,
        message: "",
      };

    case "setMessage":
      return {
        ...state,
        message: action.message,
      };

    case "replaceRecord":
      return {
        ...state,
        records: [
          ...state.records.filter((record) => record.id !== action.record.id),
          action.record,
        ].sort((a, b) => a.date.localeCompare(b.date)),
      };

    case "replaceRecords":
      return {
        ...state,
        records: [
          ...state.records.filter(
            (record) =>
              !action.records.some((nextRecord) => nextRecord.id === record.id),
          ),
          ...action.records,
        ].sort((a, b) => a.date.localeCompare(b.date)),
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

    case "submitEmployee":
      return {
        ...state,
        employeeCode: action.employeeCode,
        employeeName: action.employeeName,
        isCodeSubmitted: true,
        message: "",
        records: action.record
          ? [
              ...state.records.filter((record) => record.id !== action.record?.id),
              action.record,
            ].sort((a, b) => a.date.localeCompare(b.date))
          : state.records.filter(
              (record) =>
                record.employeeCode !== action.employeeCode ||
                record.date !== dateKey(new Date()),
            ),
      };

    case "clockIn":
      if (state.employeeCode.length !== 7) return state;
      const clockInEmployeeName = action.employeeName ?? EMPLOYEE_NAME_PLACEHOLDER;
      return {
        ...state,
        records: upsertRecord(state.records, state.employeeCode, action.at, (record) => ({
          ...record,
          clockIn: record.clockIn ?? action.at.toISOString(),
        }), clockInEmployeeName),
        employeeName: clockInEmployeeName,
        message: "出勤を記録しました。",
        stampModal: {
          time: displayStampTime(action.at),
          actionLabel: "出勤",
          variant: "clockIn",
          employeeName: clockInEmployeeName,
        },
      };

    case "goOut":
      if (state.employeeCode.length !== 7) return state;
      const goOutEmployeeName = action.employeeName ?? EMPLOYEE_NAME_PLACEHOLDER;
      return {
        ...state,
        records: upsertRecord(state.records, state.employeeCode, action.at, (record) => ({
          ...record,
          outings:
            record.outings.length >= 3
              ? record.outings
              : [...record.outings, { out: action.at.toISOString() }],
        }), goOutEmployeeName),
        employeeName: goOutEmployeeName,
        message: "外出を記録しました。",
        stampModal: {
          time: displayStampTime(action.at),
          actionLabel: "外出",
          variant: "outing",
          employeeName: goOutEmployeeName,
        },
      };

    case "returnBack":
      if (state.employeeCode.length !== 7) return state;
      const returnBackEmployeeName = action.employeeName ?? EMPLOYEE_NAME_PLACEHOLDER;
      return {
        ...state,
        records: upsertRecord(state.records, state.employeeCode, action.at, (record) => ({
          ...record,
          outings: record.outings.map((outing) =>
            outing.out && !outing.back
              ? { ...outing, back: outing.back ?? action.at.toISOString() }
              : outing,
          ),
        }), returnBackEmployeeName),
        employeeName: returnBackEmployeeName,
        message: "戻りを記録しました。",
        stampModal: {
          time: displayStampTime(action.at),
          actionLabel: "外出戻り",
          variant: "outing",
          employeeName: returnBackEmployeeName,
        },
      };

    case "clockOut":
      if (state.employeeCode.length !== 7) return state;
      const clockOutEmployeeName = action.employeeName ?? EMPLOYEE_NAME_PLACEHOLDER;
      return {
        ...state,
        records: upsertRecord(state.records, state.employeeCode, action.at, (record) => ({
          ...record,
          clockOut: record.clockOut ?? action.at.toISOString(),
        }), clockOutEmployeeName),
        employeeName: clockOutEmployeeName,
        message: "退勤を記録しました。",
        showTodayRecords: true,
        stampModal: {
          time: displayStampTime(action.at),
          actionLabel: "退勤",
          variant: "clockOut",
          employeeName: clockOutEmployeeName,
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
        employeeName: EMPLOYEE_NAME_PLACEHOLDER,
        isCodeSubmitted: false,
        viewMode: "clock",
        message: "",
        stampModal: null,
      };
  }
}
