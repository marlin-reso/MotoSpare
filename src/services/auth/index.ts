import { requireSupabase } from "../../lib/supabase";
import type { Role } from "../../types";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: "buyer" | "seller";
  phone?: string;
}

export async function signUp(payload: RegisterPayload) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: { name: payload.name, role: payload.role, phone: payload.phone ?? "" },
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getMyProfile() {
  const client = requireSupabase();
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await client.from("profiles").select("*").eq("id", user.id).single();
  if (error) throw error;
  return data as { id: string; name: string; email: string; phone: string; role: Role; status: string };
}
