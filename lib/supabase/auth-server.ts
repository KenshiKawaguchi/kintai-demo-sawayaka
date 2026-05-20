import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function readServerEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export async function createSupabaseAuthServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    readServerEnv("NEXT_PUBLIC_SUPABASE_URL"),
    readServerEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always write cookies. Route Handlers can.
          }
        },
      },
    },
  );
}
