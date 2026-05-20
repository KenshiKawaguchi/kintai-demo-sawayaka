import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AttendanceRepositoryError,
  getAttendanceSnapshot,
  punchAttendance,
} from "@/lib/attendance-repository";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const snapshotRequestSchema = z.object({
  employeeCode: z.string().regex(/^[0-9]{7}$/),
  date: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
});

const punchRequestSchema = z.object({
  employeeCode: z.string().regex(/^[0-9]{7}$/),
  punchType: z.enum(["clock_in", "go_out", "return_back", "clock_out"]),
  occurredAt: z.string().datetime().optional(),
});

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = snapshotRequestSchema.safeParse({
    employeeCode: url.searchParams.get("employeeCode"),
    date: url.searchParams.get("date"),
  });

  if (!parsed.success) {
    return jsonError("従業員コードを7桁で入力してください。", 400);
  }

  try {
    const result = await getAttendanceSnapshot(createSupabaseAdminClient(), {
      employeeCode: parsed.data.employeeCode,
      workDate: parsed.data.date,
    });

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof AttendanceRepositoryError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("打刻状況の取得に失敗しました。", 500);
  }
}

export async function POST(request: Request) {
  const parsed = punchRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("リクエスト内容が不正です。", 400);
  }

  try {
    const result = await punchAttendance(createSupabaseAdminClient(), {
      employeeCode: parsed.data.employeeCode,
      punchType: parsed.data.punchType,
      at: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
    });

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof AttendanceRepositoryError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("打刻処理に失敗しました。", 500);
  }
}
