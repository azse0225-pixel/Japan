// app/page.tsx
import Link from "next/link";

// 模擬資料：換成 Q 版插畫網址
const MY_TRIPS = [
  {
    id: "tokyo-2025",
    title: "東京櫻花祭",
    date: "2025-03-28",
    location: "日本",
    emoji: "🌸",
    // 使用 Q 版東京插畫
    imageUrl:
      "https://img.freepik.com/free-vector/tokyo-landmark-skyline-illustration_23-2148902094.jpg",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#FFF7ED] p-8 md:p-16">
      <div className="max-w-6xl mx-auto">
        {/* 頁面標題區：使用暖色調與可愛字體感 */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-5xl font-black text-orange-900 tracking-tighter italic">
              MY ADVENTURES <span className="text-orange-400">.</span>
            </h1>
            <p className="text-orange-800/60 mt-3 font-bold tracking-widest uppercase text-sm">
              準備好開啟新的冒險了嗎？
            </p>
          </div>
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-[24px] font-black transition-all shadow-xl shadow-orange-200 active:scale-95 text-lg">
            + 開始新旅程
          </button>
        </header>

        {/* 旅程卡片網格：大圓角、暖色陰影 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {MY_TRIPS.map((trip) => (
            <Link
              key={trip.id}
              href={`/trip/${trip.id}`}
              className="group relative h-[450px] w-full overflow-hidden rounded-[48px] bg-white shadow-2xl shadow-orange-200/50 border-4 border-white transition-all hover:-translate-y-3"
            >
              {/* 背景圖片：Q 版插畫 */}
              <img
                src={trip.imageUrl}
                alt={trip.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80"
              />

              {/* 暖色漸層遮罩 */}
              <div className="absolute inset-0 bg-gradient-to-t from-orange-900/80 via-transparent to-transparent" />

              {/* 卡片內容區 */}
              <div className="absolute bottom-0 p-8 w-full">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg text-2xl transform -rotate-12 group-hover:rotate-0 transition-transform">
                    {trip.emoji}
                  </span>
                  <span className="text-white font-black tracking-widest uppercase text-xs bg-orange-500/80 px-3 py-1 rounded-full">
                    {trip.location}
                  </span>
                </div>

                <h2 className="text-3xl font-black text-white mb-2 drop-shadow-md">
                  {trip.title}
                </h2>

                <div className="flex justify-between items-center mt-6">
                  <p className="text-white/80 font-bold text-sm">{trip.date}</p>
                  <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-orange-500 shadow-lg translate-x-10 group-hover:translate-x-0 transition-transform duration-500 opacity-0 group-hover:opacity-100">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* 底部裝飾 */}
        <footer className="mt-24 text-center">
          <div className="inline-block p-4 bg-orange-100 rounded-full">
            <span className="text-orange-400 text-sm font-bold">
              🗺️ 收集全世界的足跡
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}
