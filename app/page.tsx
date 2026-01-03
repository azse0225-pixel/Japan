import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server"; // ⬅️ 改用 Server Client
import TripHeader from "@/components/home/TripHeader";
import { redirect } from "next/navigation";

export default async function HomePage() {
  // 1. 檢查登入狀態
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. 如果沒登入，強制跳轉到登入頁
  if (!user) {
    redirect("/login");
  }

  // 3. 只抓取「屬於我的」行程 (owner_id 等於目前登入的 user.id)
  // 或是抓取「還沒有主人」的行程 (方便您認領舊行程)
  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    // .or(`owner_id.eq.${user.id},owner_id.is.null`) // ✨ 關鍵：抓我的或無主的
    .order("created_at", { ascending: false });

  // 預設圖片
  const defaultImg =
    "https://img.freepik.com/free-vector/tokyo-landmark-skyline-illustration_23-2148902094.jpg";

  return (
    <main className="min-h-screen bg-[#FFF7ED] p-8 md:p-16 text-slate-800">
      <div className="max-w-6xl mx-auto">
        {/* 登出按鈕 (加在標題旁邊方便測試) */}
        <div className="flex justify-end mb-4">
          <form
            action={async () => {
              "use server";
              const sb = await createSupabaseServerClient();
              await sb.auth.signOut();
              redirect("/login");
            }}
          >
            <button className="text-xs font-bold text-orange-400 hover:text-orange-600">
              登出帳號 ({user.email})
            </button>
          </form>
        </div>

        <TripHeader />

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
                    {trip.location || "未知地點"}
                  </span>
                </div>
                <h2 className="text-3xl font-black text-white mb-2 drop-shadow-md">
                  {trip.title || trip.id}
                </h2>
                <p className="text-white/80 font-bold text-sm">
                  {trip.start_date || "尚未設定日期"}
                </p>
                {/* 如果是還沒認領的，顯示一個小標籤 */}
                {!trip.owner_id && (
                  <span className="mt-2 inline-block text-[10px] bg-yellow-400 text-black px-2 py-0.5 rounded font-bold">
                    尚未歸戶 (點擊進入認領)
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
