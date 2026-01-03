import { createBrowserClient } from '@supabase/ssr'

// 這是給「前端 (Client Component)」用的
export const supabase = createBrowserClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)