import type { AttendanceRecord } from "@/features/attendance/types";

export type PunchActionType = "clockIn" | "goOut" | "returnBack" | "clockOut";

type PunchAttendanceResponse = {
  ok: boolean;
  message?: string;
  data?: {
    employee: {
      id: string;
      employeeCode: string;
      name: string;
    };
    record: {
      id: string;
      employee_id: string;
      work_date: string;
      clock_in_at: string | null;
      clock_out_at: string | null;
    };
    outings: {
      id: string;
      attendance_record_id: string;
      outing_index: number;
      out_at: string | null;
      back_at: string | null;
    }[];
  };
};

type AttendanceSnapshotResponse = {
  ok: boolean;
  message?: string;
  data?: {
    employee: {
      id: string;
      employeeCode: string;
      name: string;
    };
    record: {
      id: string;
      employee_id: string;
      work_date: string;
      clock_in_at: string | null;
      clock_out_at: string | null;
    } | null;
    outings: {
      id: string;
      attendance_record_id: string;
      outing_index: number;
      out_at: string | null;
      back_at: string | null;
    }[];
  };
};

const punchTypeMap = {
  clockIn: "clock_in",
  goOut: "go_out",
  returnBack: "return_back",
  clockOut: "clock_out",
} as const;

export class AttendanceApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttendanceApiError";
  }
}

export async function punchAttendanceApi({
  employeeCode,
  actionType,
  at,
}: {
  employeeCode: string;
  actionType: PunchActionType;
  at: Date;
}) {
  const response = await fetch("/api/attendance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      employeeCode,
      punchType: punchTypeMap[actionType],
      occurredAt: at.toISOString(),
    }),
  });
  const body = (await response.json().catch(() => null)) as PunchAttendanceResponse | null;

  if (!response.ok || !body?.ok || !body.data) {
    throw new AttendanceApiError(body?.message ?? "打刻処理に失敗しました。");
  }

  return body.data;
}

export async function fetchAttendanceSnapshotApi({
  employeeCode,
  date,
}: {
  employeeCode: string;
  date: string;
}) {
  const params = new URLSearchParams({ employeeCode, date });
  const response = await fetch(`/api/attendance?${params.toString()}`);
  const body = (await response.json().catch(() => null)) as
    | AttendanceSnapshotResponse
    | null;

  if (!response.ok || !body?.ok || !body.data) {
    throw new AttendanceApiError(body?.message ?? "打刻状況の取得に失敗しました。");
  }

  return body.data;
}

export function toAttendanceRecord(data: {
  employee: {
    employeeCode: string;
    name: string;
  };
  record: NonNullable<AttendanceSnapshotResponse["data"]>["record"];
  outings: NonNullable<AttendanceSnapshotResponse["data"]>["outings"];
}): AttendanceRecord | undefined {
  if (!data.record) return undefined;

  return {
    id: `${data.record.work_date}-${data.employee.employeeCode}`,
    employeeCode: data.employee.employeeCode,
    employeeName: data.employee.name,
    date: data.record.work_date,
    clockIn: data.record.clock_in_at ?? undefined,
    outings: data.outings.map((outing) => ({
      out: outing.out_at ?? undefined,
      back: outing.back_at ?? undefined,
    })),
    clockOut: data.record.clock_out_at ?? undefined,
  };
}
