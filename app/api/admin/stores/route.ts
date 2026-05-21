import { NextResponse } from "next/server";
import {
  AdminAuthError,
  adminAuthErrorResponse,
  requireAdminUser,
} from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function GET(request: Request) {
  try {
    await requireAdminUser(request);
    const { data, error } = await createSupabaseAdminClient()
      .from("stores")
      .select("id, store_code, name, created_at, updated_at")
      .order("store_code", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (error) {
    if (error instanceof AdminAuthError) return adminAuthErrorResponse();
    console.error(error);
    return jsonError("店舗一覧の取得に失敗しました。", 500);
  }
}
