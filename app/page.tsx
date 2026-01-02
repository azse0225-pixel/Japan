// app/page.tsx
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import TripHeader from "@/components/home/TripHeader"; // 這裡把標題和按鈕抽出來處理

export default async function HomePage() {
  // 從 Supabase 抓取真正的旅程資料
  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .order("created_at", { ascending: false });

  // 預設圖片 (如果資料庫沒圖片就用這張)
  const defaultImg =
    "https://img.freepik.com/free-vector/tokyo-landmark-skyline-illustration_23-2148902094.jpg";

  return (
    <main className="min-h-screen bg-[#FFF7ED] p-8 md:p-16 text-slate-800">
      <div className="max-w-6xl mx-auto">
        {/* 標題與新增按鈕 (抽成 Client Component 才能有點擊反應) */}
        <TripHeader />

        {/* 旅程卡片網格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {trips?.map((trip) => (
            <Link
              key={trip.id}
              href={`/trip/${trip.id}`}
              className="group relative h-[450px] w-full overflow-hidden rounded-[48px] bg-white shadow-2xl shadow-orange-200/50 border-4 border-white transition-all hover:-translate-y-3"
            >
              <img
                src={trip.image_url || defaultImg}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80"
                alt=""
              />
              <div className="absolute inset-0 bg-gradient-to-t from-orange-900/80 via-transparent to-transparent" />

              <div className="absolute bottom-0 p-8 w-full">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg text-2xl transform -rotate-12 group-hover:rotate-0 transition-transform">
                    ✈️
                  </span>
                  <span className="text-white font-black tracking-widest uppercase text-xs bg-orange-500/80 px-3 py-1 rounded-full">
                    {trip.location}
                  </span>
                </div>
                <h2 className="text-3xl font-black text-white mb-2 drop-shadow-md">
                  {trip.title}
                </h2>
                <p className="text-white/80 font-bold text-sm">
                  {trip.start_date}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
