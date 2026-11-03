import {products} from "../../data/products"; import type {Product} from "../../types";
export async function listProducts():Promise<Product[]>{return products;}
export async function getProduct(id:string):Promise<Product|undefined>{return products.find(p=>p.id===id);}
