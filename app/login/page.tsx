"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState(""); // ✨ 新增：暱稱狀態
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // 切換登入/註冊模式
  const [msg, setMsg] = useState("");

  // 1. Google 登入
  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: "select_account",
          access_type: "offline",
        },
      },
    });
    if (error) setMsg(error.message);
  };

  // 2. Email 登入
  const handleEmailLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setMsg(error.message);
      setLoading(false);
    } else {
      router.push("/");
    }
  };

  // 3. Email 註冊 (含暱稱邏輯)
  const handleSignUp = async () => {
    if (!nickname && isSignUp) {
      setMsg("請填寫暱稱，讓旅伴認識你！");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      // ✨ 將暱稱存入 user_metadata
      options: {
        data: {
          full_name: nickname,
        },
      },
    });

    if (error) {
      setMsg(error.message);
    } else {
      setMsg("🎉 註冊成功！請去信箱收驗證信！");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-[40px] shadow-2xl border-4 border-white animate-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="text-6xl mb-2">🍊</div>
          <h1 className="text-3xl font-black text-slate-800">
            {isSignUp ? "加入金笨幫" : "歡迎回來"}
          </h1>
          <p className="text-slate-400 font-bold text-sm mt-1">
            開始規劃你的下一趟旅程
          </p>
        </div>

        {msg && (
          <div className="mb-4 p-3 bg-orange-100 text-orange-600 rounded-xl text-sm font-bold text-center animate-pulse">
            {msg}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 bg-white border-2 border-slate-100 hover:border-orange-200 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            使用 Google 繼續
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink-0 mx-4 text-slate-300 text-xs font-bold uppercase">
              Or
            </span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          <div className="space-y-3">
            {/* ✨ 新增：只有註冊模式才顯示暱稱欄位 */}
            {isSignUp && (
              <input
                type="text"
                placeholder="想要大家怎麼稱呼你？"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-5 py-3 bg-orange-50/50 border-2 border-orange-100 rounded-xl text-slate-700 font-bold focus:ring-2 focus:ring-orange-300 outline-none transition-all animate-in slide-in-from-top-2"
              />
            )}

            <input
              type="email"
              placeholder="信箱 Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl text-slate-700 font-bold focus:ring-2 focus:ring-orange-300 outline-none transition-all"
            />
            <input
              type="password"
              placeholder="密碼 Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl text-slate-700 font-bold focus:ring-2 focus:ring-orange-300 outline-none transition-all"
            />
          </div>

          {isSignUp ? (
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "處理中..." : "註冊帳號"}
            </button>
          ) : (
            <button
              onClick={handleEmailLogin}
              disabled={loading}
              className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "登入中..." : "馬上出發 →"}
            </button>
          )}

          <div className="text-center mt-4">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMsg("");
              }}
              className="text-slate-400 text-xs font-bold hover:text-orange-500 transition-colors"
            >
              {isSignUp ? "已經有帳號了？點此登入" : "還沒有帳號？免費註冊"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
