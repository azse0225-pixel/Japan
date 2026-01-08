// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// 這是妳以後的超級工具，名字通常叫 cn (Class Name 的縮寫)
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}