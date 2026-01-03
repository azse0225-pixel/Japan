import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url)
	const code = searchParams.get('code')
	const next = searchParams.get('next') ?? '/'

	if (code) {
		const cookieStore = await cookies() // Next.js 15 建議要 await

		const supabase = createServerClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
			{
				cookies: {
					// ✨ 新寫法：一次取得所有 cookies
					getAll() {
						return cookieStore.getAll()
					},
					// ✨ 新寫法：一次設定或刪除多個 cookies
					setAll(cookiesToSet) {
						try {
							cookiesToSet.forEach(({ name, value, options }) =>
								cookieStore.set(name, value, options)
							)
						} catch {
							// 這裡通常是為了防止在 Server Component (唯讀環境) 被呼叫時報錯
							// 在 Route Handler 裡通常沒問題，但保留 try-catch 比較保險

						}
					},
				},
			}
		)

		const { error } = await supabase.auth.exchangeCodeForSession(code)

		if (!error) {
			const forwardedHost = request.headers.get('x-forwarded-host') // 考慮反向代理的情況
			const isLocalEnv = process.env.NODE_ENV === 'development'

			if (isLocalEnv) {
				// 本機開發環境
				return NextResponse.redirect(`${origin}${next}`)
			} else if (forwardedHost) {
				// Vercel 等正式環境
				return NextResponse.redirect(`https://${forwardedHost}${next}`)
			} else {
				return NextResponse.redirect(`${origin}${next}`)

			}
		} else {
			// 🚨 這裡是新增的：把錯誤印在 VS Code 的終端機！
			console.error("🔥 登入失敗原因:", error.message);
		}
	}

	// 登入失敗導向錯誤頁面
	return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}