// app/page.tsx
"use client"; // ✨ 必須改為 Client Component 才能讀取 localStorage

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import TripHeader from "@/components/home/TripHeader";
import EditButton from "@/components/home/EditButton";
import { getTripsByIds } from "@/lib/actions/trip-actions";

export default function HomePage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 預設圖片
  const defaultImg =
    "https://img.freepik.com/free-vector/tokyo-landmark-skyline-illustration_23-2148902094.jpg";

  useEffect(() => {
    const loadAllTrips = async () => {
      setLoading(true);
      try {
        // 1. 取得使用者狀態 (維持原樣)
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        setUser(authUser);

        // 2.  修改核心邏輯：不再只靠 localStorage
        // 直接去資料庫抓「所有」行程，或是你想展示的行程

        const { data, error } = await supabase
          .from("trips") //  這裡請確保是你的資料表正確名稱
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error(" Supabase 抓取失敗:", error.message);
        } else {
          setTrips(data || []);
        }
      } catch (error) {
        console.error(" 執行 loadAllTrips 發生錯誤:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAllTrips();
  }, []);
  return (
    <main className="min-h-screen bg-[#FFF7ED] p-8 md:p-16 text-slate-800">
      <div className="max-w-6xl mx-auto">
        {/* 右上角使用者資訊區塊 */}
        {/* <div className="flex justify-end mb-8">
          <div className="flex items-center gap-4 bg-white/50 px-5 py-2.5 rounded-2xl border border-orange-100 shadow-sm backdrop-blur-md">
            <div className="flex flex-col items-end">
              <span className="text-sm font-black text-slate-700">
                {user
                  ? user.user_metadata?.full_name || user.email?.split("@")[0]
                  : "訪客模式"}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {user ? user.email : "未登入 (行程儲存於此瀏覽器)"}
              </span>
            </div>

            <div className="w-[1px] h-6 bg-orange-100 mx-1" />

            {user ? (
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.reload();
                }}
                className="text-xs font-black text-orange-500 hover:text-orange-700 transition-colors uppercase tracking-widest"
              >
                登出
              </button>
            ) : (
              <Link
                href="/login"
                className="text-xs font-black text-blue-500 hover:text-blue-700 transition-colors uppercase tracking-widest"
              >
                登入 / 註冊
              </Link>
            )}
          </div>
        </div> */}

        {/* 頁面標題與功能按鈕 */}
        <TripHeader />

        {/* 旅程卡片網格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mt-10">
          {loading ? (
            // 載入中的骨架屏或簡單文字
            <div className="col-span-full text-center py-20 text-orange-300 font-bold">
              正在清點行程物品... 🎒
            </div>
          ) : trips.length > 0 ? (
            trips.map((trip: any) => (
              <div key={trip.id} className="relative group">
                {/* 卡片主體 */}
                <Link
                  href={`/trip/${trip.id}`}
                  className="group relative h-[450px] w-full overflow-hidden rounded-[48px] bg-white shadow-2xl shadow-orange-200/50 border-4 border-white transition-all hover:-translate-y-3 block"
                >
                  {/* 背景圖片 */}
                  <img
                    src={trip.image_url || defaultImg}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90"
                    alt={trip.title || "trip image"}
                  />

                  {/* 視覺遮罩 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />

                  {/* 卡片資訊內容 */}
                  <div className="absolute bottom-0 p-8 w-full z-20">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg text-2xl transform -rotate-12 group-hover:rotate-0 transition-transform">
                        ✈️
                      </span>
                      <span className="text-white font-black tracking-widest uppercase text-[10px] bg-orange-500 px-3 py-1 rounded-full">
                        {trip.location || "未知地點"}
                      </span>
                    </div>

                    <h2 className="text-3xl font-black text-white mb-2 drop-shadow-xl leading-tight">
                      {trip.title || "未命名行程"}
                    </h2>

                    <p className="text-white/80 font-bold text-sm">
                      {trip.start_date || "尚未設定日期"}
                    </p>
                  </div>
                </Link>

                {/* 快速編輯按鈕 */}
                <div className="absolute top-6 right-6 z-30">
                  <EditButton trip={trip} />
                </div>
              </div>
            ))
          ) : (
            /* 無行程狀態 */
            <div className="col-span-full text-center py-20 bg-white/50 rounded-[48px] border-4 border-dashed border-orange-100 mt-10">
              <p className="text-orange-300 font-black text-xl">
                目前還沒有行程喔，趕快建立一個吧！🍊
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
