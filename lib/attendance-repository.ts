import type { SupabaseClient } from "@supabase/supabase-js";
import { dateKey } from "@/features/attendance/date";

export type AttendancePunchType =
  | "clock_in"
  | "go_out"
  | "return_back"
  | "clock_out";

type EmployeeRow = {
  id: string;
  employee_code: string;
  name: string;
  active: boolean;
};

type AttendanceRecordRow = {
  id: string;
  employee_id: string;
  work_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
};

type AttendanceOutingRow = {
  id: string;
  attendance_record_id: string;
  outing_index: number;
  out_at: string | null;
  back_at: string | null;
};

export type PunchAttendanceInput = {
  employeeCode: string;
  punchType: AttendancePunchType;
  at: Date;
};

export type PunchAttendanceResult = {
  employee: {
    id: string;
    employeeCode: string;
    name: string;
  };
  record: AttendanceRecordRow;
  outings: AttendanceOutingRow[];
  event: {
    eventType: AttendancePunchType;
    occurredAt: string;
  };
};

export class AttendanceRepositoryError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AttendanceRepositoryError";
  }
}

function toIsoDate(date: Date) {
  return dateKey(date);
}

function assertKnownEmployee(employee: EmployeeRow | null) {
  if (!employee || !employee.active) {
    throw new AttendanceRepositoryError("従業員コードが登録されていません。", 404);
  }
}

async function getCurrentOutings(
  supabase: SupabaseClient,
  attendanceRecordId: string,
) {
  const { data, error } = await supabase
    .from("attendance_outings")
    .select("*")
    .eq("attendance_record_id", attendanceRecordId)
    .order("outing_index", { ascending: true });

  if (error) throw error;
  return (data ?? []) as AttendanceOutingRow[];
}

async function createAttendanceEvent(
  supabase: SupabaseClient,
  attendanceRecordId: string,
  eventType: AttendancePunchType,
  occurredAt: string,
) {
  const { error } = await supabase.from("attendance_events").insert({
    attendance_record_id: attendanceRecordId,
    event_type: eventType,
    occurred_at: occurredAt,
  });

  if (error) throw error;
}

export async function punchAttendance(
  supabase: SupabaseClient,
  input: PunchAttendanceInput,
): Promise<PunchAttendanceResult> {
  const occurredAt = input.at.toISOString();
  const workDate = toIsoDate(input.at);

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id, employee_code, name, active")
    .eq("employee_code", input.employeeCode)
    .maybeSingle();

  if (employeeError) throw employeeError;
  assertKnownEmployee(employee as EmployeeRow | null);

  const typedEmployee = employee as EmployeeRow;
  const { data: upsertedRecord, error: upsertRecordError } = await supabase
    .from("attendance_records")
    .upsert(
      {
        employee_id: typedEmployee.id,
        work_date: workDate,
      },
      { onConflict: "employee_id,work_date" },
    )
    .select("*")
    .single();

  if (upsertRecordError) throw upsertRecordError;
  let record = upsertedRecord as AttendanceRecordRow;

  if (record.clock_out_at) {
    throw new AttendanceRepositoryError("本日の打刻は終了しています。", 409);
  }

  if (input.punchType === "clock_in") {
    if (record.clock_in_at) {
      throw new AttendanceRepositoryError("出勤はすでに記録されています。", 409);
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .update({ clock_in_at: occurredAt, updated_at: occurredAt })
      .eq("id", record.id)
      .is("clock_in_at", null)
      .select("*")
      .single();

    if (error) throw error;
    record = data as AttendanceRecordRow;
  }

  if (input.punchType === "go_out") {
    if (!record.clock_in_at) {
      throw new AttendanceRepositoryError("出勤後に外出できます。", 409);
    }

    const outings = await getCurrentOutings(supabase, record.id);
    if (outings.some((outing) => outing.out_at && !outing.back_at)) {
      throw new AttendanceRepositoryError("外出戻り後に次の外出ができます。", 409);
    }
    if (outings.length >= 3) {
      throw new AttendanceRepositoryError("外出は3回までです。", 409);
    }

    const nextIndex = outings.length + 1;
    const { error } = await supabase.from("attendance_outings").insert({
      attendance_record_id: record.id,
      outing_index: nextIndex,
      out_at: occurredAt,
      updated_at: occurredAt,
    });

    if (error) throw error;
  }

  if (input.punchType === "return_back") {
    const outings = await getCurrentOutings(supabase, record.id);
    const openOuting = outings.find((outing) => outing.out_at && !outing.back_at);
    if (!openOuting) {
      throw new AttendanceRepositoryError("外出中の打刻がありません。", 409);
    }

    const { error } = await supabase
      .from("attendance_outings")
      .update({ back_at: occurredAt, updated_at: occurredAt })
      .eq("id", openOuting.id)
      .is("back_at", null);

    if (error) throw error;
  }

  if (input.punchType === "clock_out") {
    if (!record.clock_in_at) {
      throw new AttendanceRepositoryError("出勤後に退勤できます。", 409);
    }

    const outings = await getCurrentOutings(supabase, record.id);
    if (outings.some((outing) => outing.out_at && !outing.back_at)) {
      throw new AttendanceRepositoryError("外出戻り後に退勤できます。", 409);
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .update({ clock_out_at: occurredAt, updated_at: occurredAt })
      .eq("id", record.id)
      .is("clock_out_at", null)
      .select("*")
      .single();

    if (error) throw error;
    record = data as AttendanceRecordRow;
  }

  await createAttendanceEvent(supabase, record.id, input.punchType, occurredAt);
  const outings = await getCurrentOutings(supabase, record.id);

  return {
    employee: {
      id: typedEmployee.id,
      employeeCode: typedEmployee.employee_code,
      name: typedEmployee.name,
    },
    record,
    outings,
    event: {
      eventType: input.punchType,
      occurredAt,
    },
  };
}
