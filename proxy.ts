import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

const validatedSupabaseUrl = supabaseUrl;
const validatedSupabaseAnonKey = supabaseAnonKey;

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet, headers) {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      cookiesToSet.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options),
      );
      Object.entries(headers).forEach(([key, value]) =>
        response.headers.set(key, value),
      );
    },
  };

  const supabase = createServerClient(
    validatedSupabaseUrl,
    validatedSupabaseAnonKey,
    {
      cookies: cookieMethods,
    },
  );

  if (request.nextUrl.pathname === "/doctor/login") {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/doctor/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/doctor/:path*"],
};