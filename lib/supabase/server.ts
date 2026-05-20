import { createClient } from "@supabase/supabase-js";

function readServerEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function createSupabaseAdminClient() {
  return createClient(
    readServerEnv("NEXT_PUBLIC_SUPABASE_URL"),
    readServerEnv("SUPABASE_SECRET_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
