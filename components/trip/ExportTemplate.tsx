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

    // 描邊樣式維持，在變暗的背景上會非常清楚
    const strongOutlineStyle = { textShadow: "0px 1px 3px rgba(0,0,0,0.6)" };

    return (
      <div className="fixed left-[-9999px]">
        <div
          ref={ref}
          className="w-[500px] h-[800px] bg-[#fdfdfd] p-0 overflow-hidden flex flex-col"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* ✨ Header：100px 高度 */}
          <div
            className="relative flex-shrink-0 flex flex-col justify-end overflow-hidden"
            style={{ height: "100px" }}
          >
            {/* ✨✨ 修改重點 1：圖片亮度大幅調低至 75% ✨✨ */}
            {/* brightness-[0.75] 讓整張圖變暗，提供足夠對比度 */}
            <img
              src="/images/header.jpg"
              alt="Header Background"
              className="absolute inset-0 w-full h-full object-cover z-0 brightness-[0.99]"
            />

            <div
              className="relative z-20 text-white flex justify-between items-end p-5 pb-2"
              style={strongOutlineStyle}
            >
              <div>
                <div className="text-white/90 font-black text-[8px] uppercase tracking-[3px] mb-0.5 italic">
                  Day {day} Itinerary
                </div>
                <h1 className="text-xl font-black italic tracking-tighter leading-none">
                  {title || "My Adventure"}
                </h1>
              </div>
              <div className="text-right">
                <div className="text-[7px] font-bold text-white/80 uppercase mb-0.5">
                  Expenses
                </div>
                <div className="text-base font-black font-mono leading-none">
                  ¥{totalActual.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* ... 下方內容區塊保持不變 (省略以節省篇幅) ... */}
          <div className="flex-1 p-5 pt-4 space-y-2 relative z-10 -mt-1 overflow-hidden">
            {spots.map((s) => {
              const cat =
                CATEGORIES.find((c) => c.id === s.category) || CATEGORIES[0];
              return (
                <div
                  key={s.id}
                  className="bg-white p-3 px-4 rounded-2xl border border-slate-50 shadow-sm flex gap-4 items-center"
                >
                  <div className="bg-orange-500 text-white font-black px-3 py-1.5 rounded-xl text-base min-w-[70px] text-center shadow-sm">
                    {s.time || "00:00"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-700 truncate">
                        {s.name}
                      </span>
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
                  {s.actual_cost > 0 && (
                    <div className="text-emerald-600 font-bold text-xs pr-1">
                      ¥{s.actual_cost.toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="py-6 text-center mt-auto">
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
