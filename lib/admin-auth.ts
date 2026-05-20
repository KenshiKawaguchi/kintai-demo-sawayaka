import { NextResponse } from "next/server";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export class AdminAuthError extends Error {
  constructor() {
    super("管理者ログインが必要です。");
    this.name = "AdminAuthError";
  }
}

export async function requireAdminUser() {
  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AdminAuthError();
  }

  return user;
}

export function adminAuthErrorResponse() {
  return NextResponse.json(
    { ok: false, message: "管理者ログインが必要です。" },
    { status: 401 },
  );
}
