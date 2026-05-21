export type AttendanceStatus =
  | "before"
  | "workingBeforeOuting1"
  | "away1"
  | "workingBeforeOuting2"
  | "away2"
  | "workingBeforeOuting3"
  | "away3"
  | "workingAfterOuting3"
  | "finished";

export type Outing = {
  out?: string;
  back?: string;
};

export type AttendanceRecord = {
  id: string;
  employeeCode: string;
  employeeName: string;
  storeCode: string;
  storeName: string;
  date: string;
  clockIn?: string;
  outings: Outing[];
  clockOut?: string;
};

export type DailyStoreAttendanceRow = AttendanceRecord & {
  hasRecord: boolean;
};

export type StampModal = {
  time: string;
  actionLabel: "出勤" | "外出" | "外出戻り" | "退勤";
  variant: "clockIn" | "outing" | "clockOut";
  employeeName: string;
};

export type ViewMode = "clock" | "monthly" | "dailyStore";

export type State = {
  employeeCode: string;
  employeeName: string;
  isCodeSubmitted: boolean;
  records: AttendanceRecord[];
  message: string;
  stampModal: StampModal | null;
  viewMode: ViewMode;
  selectedMonth: string;
};

export type Action =
  | { type: "hydrate"; records: AttendanceRecord[] }
  | { type: "appendDigit"; digit: string }
  | { type: "backspace" }
  | { type: "clearCode" }
  | { type: "clearInput" }
  | { type: "setEmployeeCode"; value: string }
  | { type: "submitCode" }
  | {
      type: "submitEmployee";
      employeeCode: string;
      employeeName: string;
      record?: AttendanceRecord;
    }
  | { type: "clockIn"; at: Date; employeeName?: string }
  | { type: "clockOut"; at: Date; employeeName?: string }
  | { type: "goOut"; at: Date; employeeName?: string }
  | { type: "returnBack"; at: Date; employeeName?: string }
  | { type: "replaceRecord"; record: AttendanceRecord }
  | { type: "replaceRecords"; records: AttendanceRecord[] }
  | { type: "setMessage"; message: string }
  | { type: "openMonthly"; month: string }
  | { type: "closeMonthly" }
  | { type: "moveMonth"; direction: -1 | 1 }
  | { type: "openDailyStore" }
  | { type: "closeDailyStore" }
  | { type: "closeStampModal" };
