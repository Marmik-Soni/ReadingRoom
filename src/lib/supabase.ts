import { cookies, headers } from "next/headers";
import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";

const { SUPABASE_URL } = process.env;
const { SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fail fast in development if env is missing.
  // Do not throw in production runtime to avoid breaking static paths.
  if (process.env.NODE_ENV !== "production") {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.");
  }
}

const cookieOptions: CookieOptions = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

export const createSupabaseBrowserClient = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase env vars are not configured.");
  }

  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions,
  });
};

export const createSupabaseServerClient = async () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase env vars are not configured.");
  }

  const cookieStore = await Promise.resolve(cookies());

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options ?? cookieOptions);
        });
      },
    },
    headers,
    cookieOptions,
  });
};
