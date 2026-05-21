import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AdminAuthError,
  adminAuthErrorResponse,
  requireAdminUser,
} from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const employeeCreateSchema = z.object({
  storeId: z.string().uuid(),
  employeeCode: z.string().regex(/^[0-9]{7}$/),
  name: z.string().trim().min(1).max(80),
});

const employeeUpdateSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  employeeCode: z.string().regex(/^[0-9]{7}$/),
  name: z.string().trim().min(1).max(80),
  active: z.boolean(),
});

const employeeDeleteSchema = z.object({
  id: z.string().uuid(),
});

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

function employeeSelect() {
  return `
    id,
    store_id,
    employee_code,
    name,
    active,
    created_at,
    updated_at,
    stores (
      id,
      store_code,
      name
    )
  `;
}

export async function GET(request: Request) {
  try {
    await requireAdminUser(request);
    const { data, error } = await createSupabaseAdminClient()
      .from("employees")
      .select(employeeSelect())
      .order("employee_code", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (error) {
    if (error instanceof AdminAuthError) return adminAuthErrorResponse();
    console.error(error);
    return jsonError("従業員一覧の取得に失敗しました。", 500);
  }
}

export async function POST(request: Request) {
  const parsed = employeeCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("従業員コード、氏名、所属店舗を正しく入力してください。", 400);
  }

  try {
    await requireAdminUser(request);
    const now = new Date().toISOString();
    const { data, error } = await createSupabaseAdminClient()
      .from("employees")
      .insert({
        store_id: parsed.data.storeId,
        employee_code: parsed.data.employeeCode,
        name: parsed.data.name,
        active: true,
        updated_at: now,
      })
      .select(employeeSelect())
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof AdminAuthError) return adminAuthErrorResponse();
    console.error(error);
    return jsonError("従業員の追加に失敗しました。", 500);
  }
}

export async function PATCH(request: Request) {
  const parsed = employeeUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("従業員情報を正しく入力してください。", 400);
  }

  try {
    await requireAdminUser(request);
    const now = new Date().toISOString();
    const { data, error } = await createSupabaseAdminClient()
      .from("employees")
      .update({
        store_id: parsed.data.storeId,
        employee_code: parsed.data.employeeCode,
        name: parsed.data.name,
        active: parsed.data.active,
        updated_at: now,
      })
      .eq("id", parsed.data.id)
      .select(employeeSelect())
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof AdminAuthError) return adminAuthErrorResponse();
    console.error(error);
    return jsonError("従業員の更新に失敗しました。", 500);
  }
}

export async function DELETE(request: Request) {
  const parsed = employeeDeleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("削除する従業員を正しく指定してください。", 400);
  }

  try {
    await requireAdminUser(request);
    const supabase = createSupabaseAdminClient();
    const { count, error: countError } = await supabase
      .from("attendance_records")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", parsed.data.id);

    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      return jsonError(
        "打刻履歴がある従業員は削除できません。無効にしてください。",
        409,
      );
    }

    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("id", parsed.data.id);

    if (error) throw error;

    return NextResponse.json({ ok: true, data: { id: parsed.data.id } });
  } catch (error) {
    if (error instanceof AdminAuthError) return adminAuthErrorResponse();
    console.error(error);
    return jsonError("従業員の削除に失敗しました。", 500);
  }
}
