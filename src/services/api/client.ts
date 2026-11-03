const base=import.meta.env.VITE_API_BASE_URL as string|undefined;
export async function apiRequest<T>(path:string,init:RequestInit={}):Promise<T>{
 if(!base) throw new Error("API base URL is not configured. Set VITE_API_BASE_URL in .env.");
 const response=await fetch(`${base}${path}`,{...init,headers:{"Content-Type":"application/json",...init.headers}});
 if(!response.ok) throw new Error(`API request failed (${response.status})`);
 return response.json() as Promise<T>;
}
