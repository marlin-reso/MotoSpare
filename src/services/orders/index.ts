import { requireSupabase } from "../../lib/supabase";

export async function createOrder(input: {
  shipping_name: string; shipping_phone: string; shipping_address: string;
  shipping_city: string; shipping_state: string; shipping_pin: string;
  items: Array<{ product_id: string; seller_id: string; quantity: number; unit_price: number }>;
}) {
  const client = requireSupabase();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("Sign in before placing an order.");
  if (!input.items.length) throw new Error("Order must contain at least one item.");

  const total = input.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const { data: order, error: orderError } = await client.from("orders").insert({
    buyer_id: auth.user.id,
    shipping_name: input.shipping_name, shipping_phone: input.shipping_phone,
    shipping_address: input.shipping_address, shipping_city: input.shipping_city,
    shipping_state: input.shipping_state, shipping_pin: input.shipping_pin,
    total_amount: total, status: "pending",
  }).select().single();
  if (orderError) throw orderError;

  const rows = input.items.map(item => ({
    order_id: order.id, product_id: item.product_id, seller_id: item.seller_id,
    quantity: item.quantity, unit_price: item.unit_price,
  }));
  const { error: itemsError } = await client.from("order_items").insert(rows);
  if (itemsError) {
    // Preserve the order record for audit; surface the failure for recovery.
    throw new Error(`Order ${order.id} was created but its items could not be saved: ${itemsError.message}`);
  }
  return order;
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
