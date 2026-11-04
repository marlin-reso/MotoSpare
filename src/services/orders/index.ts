import { requireSupabase } from "../../lib/supabase";

export async function createOrder(input: {
  shipping_name: string; shipping_phone: string; shipping_address: string;
  shipping_city: string; shipping_state: string; shipping_pin: string;
  items: Array<{ product_id: string; quantity: number }>;
}) {
  const client = requireSupabase();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("Sign in before placing an order.");
  if (!input.items.length) throw new Error("Order must contain at least one item.");
  if (input.items.some(item => !Number.isInteger(item.quantity) || item.quantity < 1)) {
    throw new Error("Each cart quantity must be a positive whole number.");
  }
  const { data, error } = await client.rpc("place_marketplace_order", {
    p_shipping_name: input.shipping_name.trim(),
    p_shipping_phone: input.shipping_phone.trim(),
    p_shipping_address: input.shipping_address.trim(),
    p_shipping_city: input.shipping_city.trim(),
    p_shipping_state: input.shipping_state.trim(),
    p_shipping_pin: input.shipping_pin.trim(),
    p_items: input.items,
  });
  if (error) throw error;
  return data as { id: string; total_amount: number; status: string };
}

export async function listMyOrders() {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("Please sign in.");
  const { data, error } = await client.from("orders")
    .select("*, order_items(*, products(name, image_url))")
    .eq("buyer_id", userData.user.id).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
