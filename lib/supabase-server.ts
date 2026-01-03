import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 這是給「後端 (Server Actions)」用的
export async function createSupabaseServerClient() {
	const cookieStore = await cookies()

	return createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return cookieStore.getAll()
				},
				setAll(cookiesToSet) {
					try {
						cookiesToSet.forEach(({ name, value, options }) =>
							cookieStore.set(name, value, options)
						)
					} catch {
						// Server Actions 有時不需要設定 cookie，忽略錯誤
					}
				},
			},
		}
	)
}