// components/trip/ItineraryList.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  getSpots,
  addSpotToDB,
  deleteSpot,
  getTripData,
  updateTripDays,
  updateSpotNote,
  updateSpotCategory,
  updateSpotTime,
  deleteSpecificDay,
  updateSpotTransportMode,
  getTripMembers,
  addTripMember,
  deleteTripMember,
  updateSpotExpenseList,
  getExpenses,
  deleteExpense, // 👈 補上這一個！
} from "@/lib/actions/trip-actions";

import { useJsApiLoader } from "@react-google-maps/api";
import { toPng } from "html-to-image";

// ✨ 匯入拆分好的組件
import TripDetailHeader from "./TripDetailHeader";
import DayTabs from "./DayTabs";
import SpotItem from "./SpotItem";
import AddSpotForm from "./AddSpotForm";
import MapComponent from "./MapComponent";
import ChecklistModal from "./ChecklistModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import { ExportTemplate } from "./ExportTemplate";
import { ExpenseModal } from "./ExpenseModal"; // ✨ 匯入組件
import { TripSummaryModal } from "./TripSummaryModal";
const libraries: ("places" | "geometry")[] = ["places", "geometry"];
import { MemberManagementModal } from "./MemberManagementModal";
export default function ItineraryList({ tripId }: { tripId: string }) {
  // --- 狀態管理 ---
  const [spots, setSpots] = useState<any[]>([]);
  const [allSpots, setAllSpots] = useState<any[]>([]); // ✨ 新增這行，存全行程資料
  const [members, setMembers] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [allTripExpenses, setAllTripExpenses] = useState<any[]>([]);
  const [pendingLocation, setPendingLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isTripSummaryOpen, setIsTripSummaryOpen] = useState(false);
  const [focusedSpot, setFocusedSpot] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [days, setDays] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetDeleteDay, setTargetDeleteDay] = useState<number | null>(null);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("spot");
  const [newSpotTime, setNewSpotTime] = useState("09:00");
  const [durations, setDurations] = useState<{ [key: string]: any }>({});
  const [tripData, setTripData] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [expenseModalSpot, setExpenseModalSpot] = useState<any>(null);
  const scrollToMap = () => {
    // 偵測是否為行動裝置 (Tailwind 的 lg 是 1024px)
    if (window.innerWidth < 1024 && mapRef.current) {
      mapRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const exportRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // --- Google Maps Loader ---
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
    language: "zh-TW",
  });

  // 2. 修改 initLoad 函式
  const initLoad = async (resetFocus = true, showLoadingAnimation = false) => {
    if (resetFocus) setFocusedSpot(null);
    if (showLoadingAnimation) setIsLoading(true);

    try {
      const localMemberId = localStorage.getItem(`me_in_${tripId}`);

      // ✨ 這裡新增 getExpenses(tripId)
      // 注意：確認你的 trip-actions.ts 裡有這個匯出 (你上次貼的代碼裡有)
      const [tData, mData, sData, allSData, allEData] = await Promise.all([
        getTripData(tripId),
        getTripMembers(tripId, localMemberId || undefined),
        getSpots(tripId, selectedDay),
        getSpots(tripId),
        getExpenses(tripId), // 🚀 新增：抓取該行程所有費用 (包含雜項)
      ]);

      if (tData) {
        setTripData(tData);
        setDays(Array.from({ length: tData.days_count || 1 }, (_, i) => i + 1));
      }
      setMembers(mData || []);
      setSpots(
        (sData || []).sort((a: any, b: any) =>
          (a.time || "99:99").localeCompare(b.time || "99:99")
        )
      );
      setAllSpots(allSData || []);

      // ✨ 存入所有費用
      setAllTripExpenses(allEData || []);
    } catch (e) {
      console.error("初始化載入失敗:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initLoad(true, true);

    const channel = supabase
      .channel(`trip-${tripId}`)
      // ... 原有的 spots 和 members 監聽 ...
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `trip_id=eq.${tripId}`,
        },
        () => initLoad(false, false) // 🚀 費用變動時，無感刷新資料
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, selectedDay]);

  // --- 地點建議邏輯 ---
  useEffect(() => {
    if (!isLoaded || !inputValue || inputValue.length < 2) {
      setSuggestions([]);
      return;
    }
    const autocompleteService = new google.maps.places.AutocompleteService();
    const timeoutId = setTimeout(() => {
      autocompleteService.getPlacePredictions(
        {
          input: inputValue,
          language: "zh-TW",
          componentRestrictions: { country: tripData?.country_code || "JP" },
        },
        (predictions) => setSuggestions(predictions || [])
      );
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [inputValue, isLoaded, tripData?.country_code]);

  // --- 下載圖片邏輯 ---
  const handleDownload = async () => {
    if (!exportRef.current) return;
    const btn = document.getElementById("download-btn");
    if (btn) {
      btn.innerText = "生成中...";
      btn.style.pointerEvents = "none";
    }

    try {
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        skipFonts: true,
        fontEmbedCSS: "",
        style: { visibility: "visible" },
      });

      const link = document.createElement("a");
      link.download = `${tripData?.title || "Trip"}_Day${selectedDay}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert("圖片生成失敗");
    } finally {
      if (btn) {
        btn.innerText = "📥 下載";
        btn.style.pointerEvents = "auto";
      }
    }
  };

  // --- 處理地點新增 ---
  const handleAddSpot = async () => {
    if (!inputValue.trim()) return;
    setIsLoading(true);
    try {
      let lat = pendingLocation?.lat,
        lng = pendingLocation?.lng;
      if (!lat) {
        const prefix = tripData?.country_code === "JP" ? "日本 " : "";
        // @ts-ignore
        const { places } = await google.maps.places.Place.searchByText({
          textQuery: `${prefix}${inputValue}`,
          fields: ["location"],
          language: "zh-TW",
        });
        lat = places?.[0]?.location?.lat();
        lng = places?.[0]?.location?.lng();
      }
      if (lat && lng) {
        await addSpotToDB(
          tripId,
          inputValue,
          selectedDay,
          lat,
          lng,
          selectedCategory,
          newSpotTime
        );
        setInputValue("");
        setPendingLocation(null);
        initLoad(false);
      } else {
        alert("找不到地點座標");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNoteChange = (id: string, note: string) => {
    setSpots((prev) => prev.map((s) => (s.id === id ? { ...s, note } : s)));
    if (saveTimerRef.current[id]) clearTimeout(saveTimerRef.current[id]);
    saveTimerRef.current[id] = setTimeout(() => updateSpotNote(id, note), 800);
  };

  // --- 結算邏輯 (修正版) ---
  const settlement = useMemo(() => {
    const balances: any = {};
    // 1. 初始化每個成員的餘額
    members.forEach((m) => (balances[m.id] = { JPY: 0, TWD: 0 }));

    // 2. 改用 allTripExpenses 來計算，這樣才包含「雜項」
    allTripExpenses.forEach((exp: any) => {
      const amount = Number(exp.amount) || 0;
      const inv = exp.involved_members || [];
      const curr = exp.currency || "JPY";
      const payerId = exp.payer_id;
      const breakdown = exp.cost_breakdown || {};

      if (amount > 0 && inv.length > 0) {
        // A. 參與人扣款
        inv.forEach((mId: string) => {
          if (balances[mId]) {
            const memberCost =
              breakdown[mId] !== undefined
                ? Number(breakdown[mId])
                : amount / inv.length;
            balances[mId][curr] -= memberCost;
          }
        });

        // B. 墊付人加回
        if (payerId && balances[payerId]) {
          balances[payerId][curr] += amount;
        }
      }
    });

    return members.map((m) => ({ ...m, balances: balances[m.id] }));
  }, [allTripExpenses, members]); // 🚀 依賴項改為 allTripExpenses

  return (
    <div className="w-full pb-20 bg-slate-50/50 min-h-screen">
      {/* 隱藏的下載模板 */}
      <ExportTemplate
        ref={exportRef}
        day={selectedDay}
        title={tripData?.title}
        spots={spots}
        startDate={tripData?.start_date}
      />

      {/* ✨ 頂部導覽列：含日期顯示 ✨ */}
      <TripDetailHeader
        title={tripData?.title}
        startDate={tripData?.start_date}
        selectedDay={selectedDay}
        onBack={() => window.history.back()}
        onOpenChecklist={() => setIsChecklistOpen(true)}
      />

      <div className="max-w-[1600px] mx-auto px-4">
        {/* ✨ 天數切換區：含日期小標籤 ✨ */}
        <DayTabs
          days={days}
          selectedDay={selectedDay}
          startDate={tripData?.start_date}
          onSelectDay={setSelectedDay}
          onAddDay={async () => {
            const nextCount = days.length + 1;
            setDays(Array.from({ length: nextCount }, (_, i) => i + 1));
            setTripData((prev: any) => ({ ...prev, days_count: nextCount }));
            try {
              await updateTripDays(tripId, nextCount);
            } catch (error) {
              // 失敗才滾回去
              const prevCount = days.length;
              setDays(Array.from({ length: prevCount }, (_, i) => i + 1));
              setTripData((prev: any) => ({ ...prev, days_count: prevCount }));
              alert("新增天數失敗");
            }
          }}
          onDeleteClick={(day) => {
            setTargetDeleteDay(day);
            setIsModalOpen(true);
          }}
        />

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左側：行程清單 */}
          <div className="flex-1">
            <div className="bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-[40px] shadow-xl border border-white">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-800">今日計畫</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsMemberModalOpen(true)}
                    className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black hover:bg-emerald-100 transition-colors"
                  >
                    👥 成員
                  </button>
                  <button
                    id="download-btn"
                    onClick={handleDownload}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-200 transition-colors"
                  >
                    📥 下載
                  </button>
                  <button
                    onClick={() => setIsTripSummaryOpen(true)} // 🚀 點擊開啟全行程報表
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black hover:bg-indigo-100 transition-colors"
                  >
                    📊 分帳總計
                  </button>
                </div>
              </div>

              <div className="space-y-0">
                {isLoading ? (
                  <div className="py-10 text-center text-slate-400 font-bold animate-pulse">
                    載入中...
                  </div>
                ) : spots.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-orange-100 rounded-[30px] text-orange-300 font-bold italic">
                    還沒有行程，快加入地點！
                  </div>
                ) : (
                  spots.map((spot, idx) => (
                    <div key={spot.id} className="relative">
                      {/* 交通連接線邏輯 */}
                      {idx > 0 && (
                        <div className="flex items-center ml-10 my-0.5 h-7 relative">
                          <div className="absolute left-[18px] top-[-10px] bottom-[-10px] w-[2px] bg-slate-100 -z-0"></div>
                          <button
                            onClick={() =>
                              updateSpotTransportMode(
                                spot.id,
                                spot.transport_mode === "TRANSIT"
                                  ? "WALKING"
                                  : "TRANSIT"
                              ).then(() => initLoad(false))
                            }
                            className="relative z-10 bg-white border border-slate-200 px-3 py-0.5 rounded-full text-[10px] font-black shadow-sm hover:border-orange-300 flex items-center gap-1.5 transition-all active:scale-95"
                          >
                            <span>
                              {spot.transport_mode === "TRANSIT" ? "🚇" : "🚶"}
                            </span>
                            <span className="text-slate-800 font-bold">
                              {spot.transport_mode === "TRANSIT"
                                ? "搭地鐵"
                                : "走路"}
                            </span>
                            {durations[spot.id] && (
                              <span className="ml-1 pl-1.5 border-l border-slate-100 text-slate-600 ">
                                {durations[spot.id].time || durations[spot.id]}
                              </span>
                            )}
                          </button>
                        </div>
                      )}

                      <SpotItem
                        spot={spot}
                        members={members}
                        onSelect={() => {
                          setFocusedSpot(spot);
                          scrollToMap();
                        }}
                        onDelete={(id: string) =>
                          // 刪除通常需要重新載入，因為順序會變，但我們可以先過濾掉
                          deleteSpot(tripId, id).then(() => {
                            setSpots((prev) => prev.filter((s) => s.id !== id));
                          })
                        }
                        onNoteChange={handleNoteChange} // 這個妳已經寫好本地更新了，很棒！
                        onCategoryChange={(id, cat) => {
                          // 1. 先改本地狀態
                          setSpots((prev) =>
                            prev.map((s) =>
                              s.id === id ? { ...s, category: cat } : s
                            )
                          );
                          // 2. 悄悄存檔，不跑 .then(() => initLoad(false))
                          updateSpotCategory(id, cat);
                        }}
                        onOpenExpenseModal={(s) => setExpenseModalSpot(s)} // ✨ 開啟彈窗
                        onTimeChange={(id, t) => {
                          // 1. 先改本地狀態並重新排序（時間變了排序會動）
                          setSpots((prev) => {
                            const newSpots = prev.map((s) =>
                              s.id === id ? { ...s, time: t } : s
                            );
                            return [...newSpots].sort((a, b) =>
                              (a.time || "99:99").localeCompare(
                                b.time || "99:99"
                              )
                            );
                          });
                          // 2. 悄悄存檔
                          updateSpotTime(id, t);
                        }}
                        onAttachmentChange={() => {
                          // 附件比較特殊（涉及檔案網址），建議還是 reload 一下，
                          // 但可以把 initLoad 裡面的 setIsLoading(true) 關掉，就不會閃
                          initLoad(false);
                        }}
                      />
                    </div>
                  ))
                )}
              </div>

              {/* 新增地點表單 */}
              <AddSpotForm
                inputValue={inputValue}
                setInputValue={setInputValue}
                suggestions={suggestions}
                onSelectSuggestion={(id, desc) => {
                  setSuggestions([]);
                  setIsLoading(true);
                  // @ts-ignore
                  const place = new google.maps.places.Place({ id });
                  place
                    .fetchFields({ fields: ["displayName", "location"] })
                    .then(() => {
                      if (place.location) {
                        setInputValue(place.displayName || desc);
                        setPendingLocation({
                          lat: place.location.lat(),
                          lng: place.location.lng(),
                        });
                      }
                      setIsLoading(false);
                    });
                }}
                pendingLocation={pendingLocation}
                setPendingLocation={setPendingLocation}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                newSpotTime={newSpotTime}
                setNewSpotTime={setNewSpotTime}
                onAddSpot={handleAddSpot}
              />
            </div>
          </div>

          {/* 右側：地圖 */}
          <div className="lg:w-[500px]">
            <div
              ref={mapRef}
              className="sticky top-24 h-[400px] lg:h-[600px] bg-white p-2 rounded-[40px] shadow-2xl border-4 border-white overflow-hidden scroll-mt-24"
            >
              <MapComponent
                spots={spots}
                isLoaded={isLoaded}
                focusedSpot={focusedSpot}
                countryCode={tripData?.country_code}
                onDurationsChange={setDurations}
                onMapClick={(lat, lng) => {
                  setPendingLocation({ lat, lng });
                  if (!inputValue) setInputValue("地圖標記點");
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 各種彈窗 */}

      <DeleteConfirmModal
        isOpen={isModalOpen}
        day={targetDeleteDay}
        onClose={() => setIsModalOpen(false)}
        onConfirm={async () => {
          await deleteSpecificDay(tripId, targetDeleteDay!, days.length);
          setIsModalOpen(false);
          initLoad();
        }}
      />

      <ChecklistModal
        tripId={tripId}
        isOpen={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
      />
      {/* ✨ 這裡是新加入的費用管理彈窗 ✨ */}
      {expenseModalSpot && (
        <ExpenseModal
          isOpen={!!expenseModalSpot}
          spot={expenseModalSpot}
          members={members}
          onClose={() => setExpenseModalSpot(null)}
          onSave={(id: string, list: any[]) => {
            // 傳入 tripId, spotId (id), list
            updateSpotExpenseList(tripId, id, list)
              .then(() => initLoad(false, false))
              .catch((e) => alert("儲存失敗：" + e.message));
          }}
        />
      )}
      {/* ✨ 全行程總計彈窗 */}
      <TripSummaryModal
        isOpen={isTripSummaryOpen}
        onClose={() => setIsTripSummaryOpen(false)}
        allSpots={allSpots}
        members={members}
        settlement={settlement}
        tripId={tripId}
        daysCount={days.length}
        onRefresh={() => initLoad(false, false)}
        allTripExpenses={allTripExpenses} // 🚀 傳入這個新抓到的所有費用陣列
        deleteExpense={deleteExpense} // 🚀 記得傳入刪除 function
      />
      {/* 成員管理 */}
      <MemberManagementModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        tripId={tripId}
        members={members}
        onRefresh={() => initLoad(false, false)} // 這裡用你原本寫好的 initLoad
      />
    </div>
  );
}
