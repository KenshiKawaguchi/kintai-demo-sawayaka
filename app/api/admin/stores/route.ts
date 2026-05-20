import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AdminAuthError,
  adminAuthErrorResponse,
  requireAdminUser,
} from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const storeSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function GET(request: Request) {
  try {
    await requireAdminUser(request);
    const { data, error } = await createSupabaseAdminClient()
      .from("stores")
      .select("id, name, created_at, updated_at")
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (error) {
    if (error instanceof AdminAuthError) return adminAuthErrorResponse();
    console.error(error);
    return jsonError("店舗一覧の取得に失敗しました。", 500);
  }
}

export async function POST(request: Request) {
  const parsed = storeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("店舗名を入力してください。", 400);
  }

  try {
    await requireAdminUser(request);
    const now = new Date().toISOString();
    const { data, error } = await createSupabaseAdminClient()
      .from("stores")
      .insert({
        name: parsed.data.name,
        updated_at: now,
      })
      .select("id, name, created_at, updated_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof AdminAuthError) return adminAuthErrorResponse();
    console.error(error);
    return jsonError("店舗の追加に失敗しました。", 500);
  }
}
