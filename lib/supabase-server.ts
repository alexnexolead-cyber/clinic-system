import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

const validatedSupabaseUrl = supabaseUrl;
const validatedSupabaseAnonKey = supabaseAnonKey;

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const cookieMethods: CookieMethodsServer = {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Cookie writes are handled by proxy during server-rendered requests.
        }
      },
  };

  return createServerClient(validatedSupabaseUrl, validatedSupabaseAnonKey, {
    cookies: cookieMethods,
  });
}