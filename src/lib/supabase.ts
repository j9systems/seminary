import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Null-safe Supabase browser client.
 *
 * Returns `null` when the env vars aren't set (e.g. before Vercel env is
 * populated, or local dev without a project). The app treats a null client
 * as "demo mode" and falls back to a seeded localStorage store, so the UI
 * runs end-to-end without a backend.
 */
export const supabase: SupabaseClient<Database> | null =
  url && anon ? createClient<Database>(url, anon) : null;

export const isSupabaseConfigured = !!supabase;
