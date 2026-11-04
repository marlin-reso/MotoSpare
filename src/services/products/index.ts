import { products as demoProducts } from "../../data/products";
import type { Product } from "../../types";
import { isSupabaseConfigured, requireSupabase } from "../../lib/supabase";

type DbProduct = {
  id: string; name: string; brand: string; category: string; oem_number: string | null;
  description: string; price: number; mrp: number; stock: number; condition: Product["condition"] | "new_oem" | "new_aftermarket" | "used" | "refurbished";
  seller_id: string; seller_name?: string; seller_verified?: boolean; rating: number;
  compatible_bikes: string[]; image_url: string | null; status: Product["status"] | "draft" | "pending_approval" | "active" | "rejected" | "out_of_stock"; created_at: string;
};

function mapProduct(row: DbProduct): Product {
  return {
    id: row.id, name: row.name, brand: row.brand, category: row.category,
    oem: row.oem_number ?? "", description: row.description, price: Number(row.price),
    mrp: Number(row.mrp), stock: row.stock, condition: (({new_oem:"New OEM",new_aftermarket:"New aftermarket",used:"Used",refurbished:"Refurbished"} as Record<string, Product["condition"]>)[row.condition] ?? row.condition) as Product["condition"],
    seller: row.seller_name ?? "MotoSpare Seller", sellerVerified: Boolean(row.seller_verified),
    rating: Number(row.rating ?? 0), compatible: row.compatible_bikes ?? [],
    image: row.image_url ?? "", status: (({draft:"Draft",pending_approval:"Pending approval",active:"Active",rejected:"Rejected",out_of_stock:"Out of stock"} as Record<string, Product["status"]>)[row.status] ?? row.status) as Product["status"], createdAt: row.created_at,
  };
}


async function addSellerDetails(rows: any[]): Promise<Product[]> {
  if (!rows.length) return [];
  const client = requireSupabase();
  const sellerIds = [...new Set(rows.map((row) => row.seller_id as string))];
  const { data: sellers, error } = await client.from("seller_profiles")
    .select("user_id, store_name, is_verified").in("user_id", sellerIds);
  if (error) throw error;
  const sellerById = new Map((sellers ?? []).map((seller: any) => [seller.user_id, seller]));
  return rows.map((row) => {
    const seller: any = sellerById.get(row.seller_id);
    return mapProduct({ ...row, seller_name: seller?.store_name, seller_verified: seller?.is_verified });
  });
}
export async function listProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured) return demoProducts;
  const client = requireSupabase();
  const { data, error } = await client.from("products")
    .select("*")
    .eq("status", "active").order("created_at", { ascending: false });
  if (error) throw error;
  return addSellerDetails(data ?? []);
}

export async function getProduct(id: string): Promise<Product | undefined> {
  if (!isSupabaseConfigured) return demoProducts.find(p => p.id === id);
  const client = requireSupabase();
  const { data, error } = await client.from("products")
    .select("*")
    .eq("id", id).eq("status", "active").maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  return (await addSellerDetails([data]))[0];
}

export async function createSellerProduct(input: {
  name: string; brand: string; category: string; oem_number?: string;
  description: string; price: number; mrp: number; stock: number;
  condition: Product["condition"] | "new_oem" | "new_aftermarket" | "used" | "refurbished"; compatible_bikes: string[]; image_url?: string;
}) {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("Please sign in as a seller.");
  const { data, error } = await client.from("products").insert({
    ...input, condition: toDbCondition(input.condition), seller_id: userData.user.id, status: "pending_approval",
  }).select().single();
  if (error) throw error;
  return data;
}


const toDbCondition = (condition: Product["condition"]) => ({
  "New OEM": "new_oem", "New aftermarket": "new_aftermarket", Used: "used", Refurbished: "refurbished",
}[condition]);

export async function listMySellerProducts(): Promise<Product[]> {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Please sign in as a seller.");
  const { data, error } = await client.from("products")
    .select("*")
    .eq("seller_id", authData.user.id).order("created_at", { ascending: false });
  if (error) throw error;
  return addSellerDetails(data ?? []);
}

export async function updateSellerProduct(id: string, input: {
  name: string; brand: string; category: string; oem_number?: string;
  description: string; price: number; mrp: number; stock: number;
  condition: Product["condition"]; compatible_bikes: string[]; image_url?: string;
}) {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Please sign in as a seller.");
  const { data, error } = await client.from("products").update({
    ...input, condition: toDbCondition(input.condition),
  }).eq("id", id).eq("seller_id", authData.user.id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSellerProduct(id: string) {
  const client = requireSupabase();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Please sign in as a seller.");
  const { error } = await client.from("products").delete().eq("id", id).eq("seller_id", authData.user.id);
  if (error) throw error;
}
