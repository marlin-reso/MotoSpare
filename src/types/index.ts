export type Role="buyer"|"seller"|"admin";
export type ProductCondition="New OEM"|"New aftermarket"|"Used"|"Refurbished";
export type ProductStatus="Draft"|"Pending approval"|"Active"|"Rejected"|"Out of stock";
export interface Bike {id:string;manufacturer:string;model:string;variant:string;year:number;cc:number}
export interface Product {id:string;name:string;brand:string;category:string;oem:string;description:string;price:number;mrp:number;stock:number;condition:ProductCondition;seller:string;sellerVerified:boolean;rating:number;compatible:string[];image:string;status:ProductStatus;createdAt:string}
export interface CartLine {product:Product;quantity:number}
export interface User {id:string;name:string;email:string;phone:string;role:Role;status:"active"|"suspended"}
export interface Order {id:string;buyer:string;seller:string;items:string;amount:number;status:"Pending"|"Confirmed"|"Processing"|"Shipped"|"Delivered"|"Cancelled"|"Returned"}
