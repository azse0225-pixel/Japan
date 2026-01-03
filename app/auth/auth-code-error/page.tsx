"use client";

import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-[40px] shadow-2xl border-4 border-white text-center">
        <div className="text-6xl mb-4">🥲</div>
        <h1 className="text-2xl font-black text-slate-800 mb-2">
          登入驗證失敗
        </h1>
        <p className="text-slate-500 font-bold text-sm mb-8">
          哎呀！出事了 阿伯。
          <br />
        </p>

        <Link
          href="/login"
          className="block w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95"
        >
          回登入頁重試
        </Link>
      </div>
    </div>
  );
}
