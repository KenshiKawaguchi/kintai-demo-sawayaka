import { NextResponse } from "next/server";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export class AdminAuthError extends Error {
  constructor() {
    super("管理者ログインが必要です。");
    this.name = "AdminAuthError";
  }
}

export async function requireAdminUser(request?: Request) {
  const authHeader = request?.headers.get("authorization");
  const token = authHeader?.match(/^Bearer (.+)$/i)?.[1];
  if (token) {
    const {
      data: { user },
      error,
    } = await createSupabaseAdminClient().auth.getUser(token);

    if (error || !user) {
      throw new AdminAuthError();
    }

    return user;
  }

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
