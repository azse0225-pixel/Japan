// components/trip/ExportTemplate.tsx
import { forwardRef } from "react";
import { CATEGORIES } from "./constants";

interface ExportProps {
  day: number;
  title: string;
  spots: any[];
}

export const ExportTemplate = forwardRef<HTMLDivElement, ExportProps>(
  ({ day, title, spots }, ref) => {
    const totalActual = spots.reduce(
      (sum, s) => sum + (Number(s.actual_cost) || 0),
      0
    );

    // 強力描邊樣式
    const strongOutlineStyle = {
      textShadow: "0px 1px 2px rgba(0,0,0,0.6)",
    };

    return (
      <div className="fixed left-[-9999px]">
        {/* ✨ 推薦總高度：800px (長型手帳比例) */}
        <div
          ref={ref}
          className="w-[500px] h-[800px] bg-[#fdfdfd] p-0 overflow-hidden flex flex-col"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* ✨ Header：維持窄版 100px 與粉色背景圖 */}
          <div
            className="relative flex-shrink-0 flex flex-col justify-end overflow-hidden"
            style={{ height: "100px" }}
          >
            <img
              src="/images/header.jpg"
              alt="Header Background"
              className="absolute inset-0 w-full h-full object-cover z-0 brightness-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-pink-200/30 to-transparent z-10"></div>

            <div
              className="relative z-20 text-white flex justify-between items-end p-5 pb-2"
              style={strongOutlineStyle}
            >
              <div>
                <div className="text-pink-100 font-black text-[8px] uppercase tracking-[3px] mb-0.5 italic opacity-95">
                  Day {day} Itinerary
                </div>
                <h1 className="text-xl font-black italic tracking-tighter leading-none">
                  {title || "My Adventure"}
                </h1>
              </div>
              <div className="text-right">
                <div className="text-[7px] font-bold text-pink-100 uppercase mb-0.5">
                  Expenses
                </div>
                <div className="text-base font-black font-mono leading-none">
                  ¥{totalActual.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* ✨ 內容區塊：h-full 配合外層固定高度 */}
          <div className="flex-1 p-5 pt-4 space-y-2 relative z-10 -mt-1 overflow-hidden">
            {spots.map((s) => {
              const cat =
                CATEGORIES.find((c) => c.id === s.category) || CATEGORIES[0];
              return (
                <div
                  key={s.id}
                  className="bg-white p-3 px-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4 items-center"
                >
                  {/* ✨ 時間標籤：恢復原始橘色 (bg-orange-500) */}
                  <div className="bg-orange-500 text-white font-black px-3 py-1.5 rounded-xl text-base min-w-[70px] text-center shadow-sm">
                    {s.time || "00:00"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-700 truncate">
                        {s.name}
                      </span>
                      {/* ✨ 選項標籤：恢復原始定義顏色 */}
                      <span
                        className={`px-1.5 py-0.5 rounded-lg text-[8px] font-black whitespace-nowrap ${cat.color} opacity-90`}
                      >
                        {cat.icon} {cat.label}
                      </span>
                    </div>
                    {s.note && (
                      <div className="text-slate-400 text-[10px] mt-0.5 font-medium truncate">
                        {s.note}
                      </div>
                    )}
                  </div>

                  {/* ✨ 金額：恢復原始綠色調 */}
                  {s.actual_cost > 0 && (
                    <div className="text-emerald-600 font-bold text-xs pr-1">
                      ¥{s.actual_cost.toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 底部裝飾 */}
          <div className="py-6 text-center mt-auto bg-gradient-to-t from-white to-transparent">
            <div className="text-[7px] font-black text-slate-300 uppercase tracking-[5px] opacity-70">
              JAPAN TRIP PLANNER
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ExportTemplate.displayName = "ExportTemplate";
