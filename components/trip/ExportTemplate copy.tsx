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
    // 計算當日總計
    const totalBudget = spots.reduce(
      (sum, s) => sum + (Number(s.estimated_cost) || 0),
      0
    );
    const totalActual = spots.reduce(
      (sum, s) => sum + (Number(s.actual_cost) || 0),
      0
    );

    return (
      <div className="fixed left-[-9999px]">
        <div
          ref={ref}
          className="w-[600px] bg-slate-50 p-0 overflow-hidden"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* ✨ 頂部橘色漸層 Header */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-10 text-white">
            <div className="flex justify-between items-end">
              <div>
                <div className="text-orange-200 font-black text-xs uppercase tracking-widest mb-1 italic">
                  Day {day} Itinerary
                </div>
                <h1 className="text-4xl font-black italic tracking-tighter drop-shadow-md">
                  {title || "My Adventure"}
                </h1>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-orange-200 uppercase">
                  Total Expenses
                </div>
                <div className="text-2xl font-black font-mono">
                  ¥{totalActual.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* ✨ 內容區 */}
          <div className="p-8 space-y-6">
            {/* 預算統計小卡 */}
            <div className="flex gap-4 mb-8">
              <div className="flex-1 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <div className="text-[10px] font-black text-slate-400 uppercase">
                  Estimated
                </div>
                <div className="text-lg font-bold text-slate-700">
                  ¥{totalBudget.toLocaleString()}
                </div>
              </div>
              <div className="flex-1 bg-emerald-50 p-4 rounded-3xl border border-emerald-100 shadow-sm">
                <div className="text-[10px] font-black text-emerald-600 uppercase">
                  Actual Spend
                </div>
                <div className="text-lg font-bold text-emerald-700">
                  ¥{totalActual.toLocaleString()}
                </div>
              </div>
            </div>

            {/* 景點清單 */}
            <div className="space-y-4">
              {spots.length === 0 ? (
                <div className="text-center py-10 text-slate-300 font-bold italic">
                  No spots planned for this day.
                </div>
              ) : (
                spots.map((s) => {
                  const cat =
                    CATEGORIES.find((c) => c.id === s.category) ||
                    CATEGORIES[0];
                  return (
                    <div
                      key={s.id}
                      className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex gap-5 items-center"
                    >
                      {/* 時間標籤 */}
                      <div className="bg-orange-500 text-white font-black px-4 py-2 rounded-2xl text-xl min-w-[90px] text-center shadow-orange-100 shadow-lg">
                        {s.time || "00:00"}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-slate-800">
                            {s.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${cat.color}`}
                          >
                            {cat.icon} {cat.label}
                          </span>
                        </div>
                        {s.note && (
                          <div className="text-slate-400 text-sm mt-1 font-medium">
                            <span className="text-orange-400 mr-1">●</span>{" "}
                            {s.note}
                          </div>
                        )}
                      </div>

                      {/* 該項支出 */}
                      {s.actual_cost > 0 && (
                        <div className="text-right">
                          <div className="text-emerald-600 font-black text-sm">
                            ¥{s.actual_cost.toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* 底部簽名 */}
            <div className="pt-10 text-center">
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-[4px]">
                Generated by Your Travel App
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ExportTemplate.displayName = "ExportTemplate";
