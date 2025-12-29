// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// 這會從你的 .env.local 讀取剛剛貼上去的 URL 和 Key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);