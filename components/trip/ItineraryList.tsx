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
  updateSpotCost,
  getTripMembers,
  addTripMember,
  deleteTripMember,
  updateSpotSplit,
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
import MemberModal from "./MemberModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import { ExportTemplate } from "./ExportTemplate";

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

export default function ItineraryList({ tripId }: { tripId: string }) {
  // --- 狀態管理 ---
  const [spots, setSpots] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [pendingLocation, setPendingLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [focusedSpot, setFocusedSpot] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [days, setDays] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetDeleteDay, setTargetDeleteDay] = useState<number | null>(null);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("spot");
  const [newSpotTime, setNewSpotTime] = useState("09:00");
  const [durations, setDurations] = useState<{ [key: string]: any }>({});
  const [tripData, setTripData] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);

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

  // --- 資料初始化與實時同步 ---
  const initLoad = async (resetFocus = true) => {
    if (resetFocus) setFocusedSpot(null);
    setIsLoading(true);
    try {
      const localMemberId = localStorage.getItem(`me_in_${tripId}`);
      const [tData, mData] = await Promise.all([
        getTripData(tripId),
        getTripMembers(tripId, localMemberId || undefined),
      ]);

      if (tData) {
        setTripData(tData);
        setDays(Array.from({ length: tData.days_count || 1 }, (_, i) => i + 1));
      }
      setMembers(mData || []);

      const sData = await getSpots(tripId, selectedDay);
      setSpots(
        (sData || []).sort((a: any, b: any) =>
          (a.time || "99:99").localeCompare(b.time || "99:99")
        )
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initLoad();
    const channel = supabase
      .channel(`trip-${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "spots",
          filter: `trip_id=eq.${tripId}`,
        },
        () => initLoad(false)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_members",
          filter: `trip_id=eq.${tripId}`,
        },
        () => initLoad(false)
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

  // --- 結算邏輯 ---
  const settlement = useMemo(() => {
    const b: any = {};
    members.forEach((m) => (b[m.id] = 0));
    spots.forEach((s) => {
      const c = Number(s.actual_cost || 0);
      const inv = s.involved_members || [];
      if (c > 0 && inv.length > 0) {
        inv.forEach((mId: string) => {
          if (b[mId] !== undefined) b[mId] -= c / inv.length;
        });
        if (s.payer_id && b[s.payer_id] !== undefined) b[s.payer_id] += c;
      }
    });
    return members.map((m) => ({ ...m, balance: b[m.id] || 0 }));
  }, [spots, members]);

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
            await updateTripDays(tripId, days.length + 1);
            initLoad(false);
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
                    id="download-btn"
                    onClick={handleDownload}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-200 transition-colors"
                  >
                    📥 下載
                  </button>
                  <button
                    onClick={() => setIsMemberModalOpen(true)}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black hover:bg-indigo-100 transition-colors"
                  >
                    📊 分帳
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
                          setFocusedSpot(spot); // 原本的聚焦邏輯
                          scrollToMap(); // ✨ 新增的捲動邏輯
                        }}
                        onDelete={(id: string) =>
                          deleteSpot(tripId, id).then(() => initLoad(false))
                        }
                        onNoteChange={handleNoteChange}
                        onCategoryChange={(id, cat) =>
                          updateSpotCategory(id, cat).then(() =>
                            initLoad(false)
                          )
                        }
                        onTimeChange={(id, t) =>
                          updateSpotTime(id, t).then(() => initLoad(false))
                        }
                        onCostChange={(id, est, act) =>
                          updateSpotCost(id, est, act).then(() =>
                            initLoad(false)
                          )
                        }
                        onSplitChange={(id, p, inv) =>
                          updateSpotSplit(id, p, inv).then(() =>
                            initLoad(false)
                          )
                        }
                        onAttachmentChange={() => initLoad(false)}
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
      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        members={members}
        settlement={settlement}
        newMemberName={newMemberName}
        setNewMemberName={setNewMemberName}
        onAddMember={async () => {
          if (newMemberName) {
            await addTripMember(tripId, newMemberName);
            initLoad();
            setNewMemberName("");
          }
        }}
        onDeleteMember={(id) =>
          deleteTripMember(id, tripId).then(() => initLoad())
        }
      />

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
    </div>
  );
}
