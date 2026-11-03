import type {Role} from "../../types";
export interface AuthPayload {email:string;password:string;role:Role}
export async function mockSignIn(payload:AuthPayload){return {user:{id:"demo-user",email:payload.email,role:payload.role},message:"Demo sign-in only; connect backend authentication for production."};}
