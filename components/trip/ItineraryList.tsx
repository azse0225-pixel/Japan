"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
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
  updateSpotBatchOrder,
  uploadSpotAttachment,
  deleteSpotAttachment,
  getTripMembers, // ✨ 新增
  addTripMember, // ✨ 新增
  deleteTripMember, // ✨ 新增
  updateSpotSplit, // ✨ 新增
} from "@/lib/actions/trip-actions";

import { useJsApiLoader } from "@react-google-maps/api";
import MapComponent from "./MapComponent";
import ChecklistModal from "./ChecklistModal";
import { toPng } from "html-to-image";

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

const CATEGORIES = [
  {
    id: "spot",
    label: "景點",
    icon: "⛩️",
    color: "bg-orange-50 text-orange-600",
  },
  {
    id: "activity",
    label: "活動",
    icon: "🎡",
    color: "bg-amber-50 text-amber-600",
  },
  { id: "food", label: "美食", icon: "🍜", color: "bg-red-50 text-red-600" },
  { id: "stay", label: "住宿", icon: "🏨", color: "bg-blue-50 text-blue-600" },
  {
    id: "trans",
    label: "交通",
    icon: "🚄",
    color: "bg-green-50 text-green-600",
  },
  {
    id: "shopping",
    label: "購物",
    icon: "🛍️",
    color: "bg-pink-50 text-pink-600",
  },
];

const formatMoney = (yen: number, rate: number) => {
  if (!yen) return null;
  const twd = Math.floor(yen * rate);
  return (
    <span className="font-mono">
      <span className="text-slate-600">¥{yen.toLocaleString()}</span>
      <span className="text-emerald-600 text-[0.9em] ml-1 font-bold">
        (NT${twd.toLocaleString()})
      </span>
    </span>
  );
};

// --- SpotItem 元件 (新增分帳功能) ---
function SpotItem({
  spot,
  members, // ✨ 傳入成員名單
  onDelete,
  onNoteChange,
  onCategoryChange,
  onTimeChange,
  onSelect,
  onCostChange,
  onSplitChange, // ✨ 處理分帳變更
  exchangeRate,
}: any) {
  const [showCatMenu, setShowCatMenu] = useState(false);
  const [showCost, setShowCost] = useState(false);
  const [showTickets, setShowTickets] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const currentCat =
    CATEGORIES.find((c) => c.id === spot.category) || CATEGORIES[0];
  const twdEst = Math.floor((spot.estimated_cost || 0) * exchangeRate);
  const twdAct = Math.floor((spot.actual_cost || 0) * exchangeRate);

  // 取得目前「誰付錢」的名字
  const payerName =
    members.find((m: any) => m.id === spot.payer_id)?.name || "有人";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    try {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("file", file);
      await uploadSpotAttachment(spot.id, formData);
    } catch (err) {
      console.error("上傳失敗", err);
      alert("上傳失敗");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (url: string) => {
    if (!confirm("確定要刪除這張附件嗎？")) return;
    await deleteSpotAttachment(spot.id, url);
  };

  // 處理分帳變更
  const handlePayerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSplitChange(spot.id, e.target.value, spot.involved_members || []);
  };

  const handleInvolvedChange = (memberId: string, isChecked: boolean) => {
    let currentInvolved = spot.involved_members || [];
    if (isChecked) {
      currentInvolved = [...currentInvolved, memberId];
    } else {
      currentInvolved = currentInvolved.filter((id: string) => id !== memberId);
    }
    onSplitChange(spot.id, spot.payer_id, currentInvolved);
  };

  return (
    <div
      onClick={onSelect}
      className="relative flex flex-col p-5 bg-white rounded-[28px] border border-slate-100 mb-6 shadow-sm hover:border-orange-100 transition-all group z-10 cursor-pointer hover:scale-[1.01]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex-shrink-0 z-10">
            <input
              type="time"
              value={spot.time || ""}
              onChange={(e) => onTimeChange(spot.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="bg-orange-500 text-white font-black px-3 py-2 rounded-xl border-none focus:ring-4 focus:ring-orange-200 text-sm outline-none transition-all cursor-pointer shadow-sm"
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap flex-1">
            <span className="font-black text-slate-800 leading-tight tracking-tight text-lg">
              {spot.name}
            </span>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCatMenu(!showCatMenu);
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-black transition-transform active:scale-95 ${currentCat.color}`}
              >
                {currentCat.icon} {currentCat.label}
              </button>
              {showCatMenu && (
                <>
                  <div
                    className="fixed inset-0 z-[60]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCatMenu(false);
                    }}
                  />
                  <div className="absolute left-0 mt-2 w-32 bg-white border border-slate-100 rounded-2xl shadow-xl z-[70] p-2 animate-in fade-in zoom-in duration-100">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCategoryChange(spot.id, c.id);
                          setShowCatMenu(false);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 text-left"
                      >
                        {c.icon} {c.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(spot.id);
          }}
          className="p-2 text-slate-300 hover:text-red-500 transition-all active:scale-90"
        >
          <svg
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="mt-3 flex gap-2 items-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowCost(!showCost);
            setShowTickets(false);
          }}
          className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-black transition-all ${
            spot.estimated_cost > 0 || spot.actual_cost > 0
              ? "bg-emerald-100 text-emerald-600"
              : "bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500"
          }`}
        >
          $
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowTickets(!showTickets);
            setShowCost(false);
          }}
          className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-black transition-all relative ${
            spot.attachments?.length > 0
              ? "bg-blue-100 text-blue-600"
              : "bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-500"
          }`}
        >
          📎
          {spot.attachments?.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">
              {spot.attachments.length}
            </span>
          )}
        </button>

        <div className="flex-1 flex flex-col justify-center min-h-[40px]">
          <label className="text-[10px] text-slate-400 font-bold mb-0.5 ml-1">
            備註 Note
          </label>
          <input
            type="text"
            value={spot.note || ""}
            onChange={(e) => onNoteChange(spot.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="輸入備註 (例如: 必吃鬆餅...)"
            className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-orange-300 text-sm text-slate-700 placeholder:text-slate-300 outline-none transition-colors py-1 pl-1"
          />
          {(spot.estimated_cost > 0 || spot.actual_cost > 0) && (
            <div className="flex gap-3 text-[10px] mt-1 pl-1">
              {spot.estimated_cost > 0 && (
                <div className="bg-slate-50 px-2 py-0.5 rounded text-slate-500">
                  預: {formatMoney(spot.estimated_cost, exchangeRate)}
                </div>
              )}
              {spot.actual_cost > 0 && (
                <div className="bg-emerald-50 px-2 py-0.5 rounded text-emerald-600 font-bold border border-emerald-100 flex items-center gap-1">
                  <span>實: {formatMoney(spot.actual_cost, exchangeRate)}</span>
                  {spot.payer_id && (
                    <span className="text-[9px] bg-white px-1 rounded text-emerald-400">
                      ({payerName})
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showCost && (
        <div
          className="mt-3 grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 fade-in duration-200 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-slate-50 rounded-xl p-3 flex flex-col relative border border-slate-100">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                預算
              </label>
              <span className="text-[11px] text-slate-500 font-bold bg-white px-1.5 rounded shadow-sm border border-slate-100">
                NT$ {twdEst.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-slate-400 text-sm mr-1 font-medium">¥</span>
              <input
                type="number"
                value={spot.estimated_cost || 0}
                onChange={(e) =>
                  onCostChange(
                    spot.id,
                    Number(e.target.value),
                    spot.actual_cost
                  )
                }
                className="bg-transparent w-full text-lg font-black text-slate-700 outline-none"
                placeholder="0"
              />
            </div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 flex flex-col relative border border-emerald-100">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-emerald-600/70 font-bold uppercase tracking-wider">
                實支
              </label>
              <span className="text-[11px] text-emerald-600 font-bold bg-white px-1.5 rounded shadow-sm border border-emerald-100">
                NT$ {twdAct.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-emerald-500 text-sm mr-1 font-medium">
                ¥
              </span>
              <input
                type="number"
                value={spot.actual_cost || 0}
                onChange={(e) =>
                  onCostChange(
                    spot.id,
                    spot.estimated_cost,
                    Number(e.target.value)
                  )
                }
                className="bg-transparent w-full text-lg font-black text-emerald-700 outline-none"
                placeholder="0"
              />
            </div>
          </div>

          {/* ✨ 分帳區塊：只有當有「實支」且有「成員」時才顯示 */}
          {spot.actual_cost > 0 && members.length > 0 && (
            <div className="col-span-2 bg-indigo-50 rounded-xl p-3 border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-[10px] text-indigo-500 font-bold uppercase">
                  誰先墊錢?
                </label>
                <select
                  value={spot.payer_id || ""}
                  onChange={handlePayerChange}
                  className="text-xs bg-white border border-indigo-200 rounded px-2 py-1 outline-none text-indigo-700 font-bold"
                >
                  <option value="">(選擇成員)</option>
                  {members.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-indigo-500 font-bold uppercase mb-1">
                  分給誰? (沒選=平分)
                </label>
                <div className="flex gap-2 flex-wrap">
                  {members.map((m: any) => {
                    const isChecked = (spot.involved_members || []).includes(
                      m.id
                    );
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-indigo-500 text-white"
                            : "bg-white text-indigo-400 border border-indigo-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isChecked}
                          onChange={(e) =>
                            handleInvolvedChange(m.id, e.target.checked)
                          }
                        />
                        {m.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showTickets && (
        <div
          className="mt-3 bg-blue-50 rounded-2xl p-4 animate-in slide-in-from-top-2 fade-in duration-200 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-black text-blue-500 uppercase tracking-wider">
              🎫 票券與附件
            </h4>
            <label className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-1">
              {isUploading ? "上傳中..." : "+ 上傳檔案"}
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          </div>

          {!spot.attachments || spot.attachments.length === 0 ? (
            <div className="text-center py-6 text-blue-300 text-xs font-bold border-2 border-dashed border-blue-200 rounded-xl">
              這裡空空的，把門票或憑證丟進來吧！
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {spot.attachments.map((url: string, idx: number) => (
                <div
                  key={idx}
                  className="relative group/img aspect-square bg-white rounded-xl overflow-hidden border border-blue-100 shadow-sm"
                >
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full h-full"
                  >
                    <img
                      src={url}
                      alt="ticket"
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                    />
                  </a>
                  <button
                    onClick={() => handleDeleteAttachment(url)}
                    className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover/img:opacity-100 transition-opacity shadow-md"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- 主要元件 ---
export default function ItineraryList({ tripId }: { tripId: string }) {
  const [spots, setSpots] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]); // ✨ 成員狀態
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

  // ✨ 新增：成員管理 Modal
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("spot");
  const [newSpotTime, setNewSpotTime] = useState("09:00");

  const [durations, setDurations] = useState<{ [key: string]: string }>({});
  const [weather, setWeather] = useState<string>("🌤️ 晴時多雲 24°C");
  const [exchangeRate, setExchangeRate] = useState(0.22);

  const exportRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
    language: "zh-TW",
    region: "JP",
    version: "weekly",
  });

  // 1. 抓取匯率
  useEffect(() => {
    fetch("https://api.exchangerate-api.com/v4/latest/JPY")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rates && data.rates.TWD)
          setExchangeRate(data.rates.TWD);
      })
      .catch((err) => console.error("匯率抓取失敗", err));
  }, []);

  // 2. Autocomplete
  useEffect(() => {
    if (!isLoaded || inputValue.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        // @ts-ignore
        const { suggestions } =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
            {
              input: inputValue,
              includedPrimaryTypes: ["establishment", "geocode"],
              includedRegionCodes: ["jp"],
              language: "zh-TW",
            }
          );
        const formatted = (suggestions || []).map((s: any) => ({
          place_id: s.placePrediction.placeId,
          description: s.placePrediction.text.text,
        }));
        setSuggestions(formatted);
      } catch (e) {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, isLoaded]);

  // 3. 初始化載入 (包含成員)
  const initLoad = async (resetFocus = true) => {
    if (resetFocus) setFocusedSpot(null);
    setIsLoading(true);

    // 平行載入基本資料
    const [tripData, memberData] = await Promise.all([
      getTripData(tripId),
      getTripMembers(tripId),
    ]);

    setMembers(memberData || []);

    let currentDayCount = 1;
    if (tripData?.days_count) {
      currentDayCount = tripData.days_count;
      setDays(Array.from({ length: tripData.days_count }, (_, i) => i + 1));
      if (selectedDay > currentDayCount) {
        setSelectedDay(currentDayCount);
        setIsLoading(false);
        return;
      }
    } else {
      setDays([1]);
    }

    const spotData = await getSpots(tripId, selectedDay);
    setSpots(
      [...spotData].sort((a, b) =>
        (a.time || "99:99").localeCompare(b.time || "99:99")
      )
    );
    setIsLoading(false);

    const weathers = [
      "🌤️ 晴朗 22°C",
      "☁️ 多雲 20°C",
      "🌧️ 小雨 18°C",
      "☀️ 艷陽 28°C",
    ];
    setWeather(weathers[(selectedDay - 1) % weathers.length]);
  };

  useEffect(() => {
    initLoad(true);
  }, [tripId, selectedDay]);

  // 4. Realtime (監聽 spots 和 trip_members)
  useEffect(() => {
    const channel = supabase
      .channel("realtime updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "spots",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          setTimeout(() => initLoad(false), 500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_members",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          setTimeout(() => initLoad(false), 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, selectedDay]);

  // 處理下載
  const handleDownload = async () => {
    if (!exportRef.current) return;
    const btn = document.getElementById("download-btn");
    if (btn) btn.innerText = "生成中...";
    try {
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        backgroundColor: "#fff7ed",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `Trip_Day${selectedDay}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("截圖失敗", err);
      alert("截圖失敗");
    } finally {
      if (btn) btn.innerText = "📥 下載";
    }
  };

  const handleSelectSuggestion = async (
    placeId: string,
    description: string
  ) => {
    setSuggestions([]);
    setIsLoading(true);
    try {
      // @ts-ignore
      const place = new google.maps.places.Place({ id: placeId });
      await place.fetchFields({ fields: ["displayName", "location"] });
      if (place.location) {
        setInputValue(place.displayName || description);
        setPendingLocation({
          lat: place.location.lat(),
          lng: place.location.lng(),
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSpot = async () => {
    if (!inputValue.trim()) return;
    setIsLoading(true);
    try {
      let finalLat, finalLng;
      if (pendingLocation) {
        finalLat = pendingLocation.lat;
        finalLng = pendingLocation.lng;
      } else {
        // @ts-ignore
        const { places } = await google.maps.places.Place.searchByText({
          textQuery: inputValue,
          fields: ["location"],
          language: "zh-TW",
        });
        if (places && places[0]?.location) {
          finalLat = places[0].location.lat();
          finalLng = places[0].location.lng();
        } else {
          alert("找不到地點座標");
          setIsLoading(false);
          return;
        }
      }
      await addSpotToDB(
        tripId,
        inputValue,
        selectedDay,
        finalLat,
        finalLng,
        selectedCategory,
        newSpotTime
      );
      setInputValue("");
      setPendingLocation(null);
      await initLoad(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers
  const handleCostChange = (spotId: string, est: number, act: number) => {
    setSpots((prev) =>
      prev.map((s) =>
        s.id === spotId ? { ...s, estimated_cost: est, actual_cost: act } : s
      )
    );
    if (saveTimerRef.current[`${spotId}-cost`])
      clearTimeout(saveTimerRef.current[`${spotId}-cost`]);
    saveTimerRef.current[`${spotId}-cost`] = setTimeout(
      () => updateSpotCost(spotId, est, act),
      800
    );
  };

  // ✨ 分帳 Handler
  const handleSplitChange = async (
    spotId: string,
    payerId: string | null,
    involved: string[]
  ) => {
    // 先更新 UI
    setSpots((prev) =>
      prev.map((s) =>
        s.id === spotId
          ? { ...s, payer_id: payerId, involved_members: involved }
          : s
      )
    );
    // 寫入後端
    await updateSpotSplit(spotId, payerId, involved);
  };

  const handleNoteChange = (spotId: string, newNote: string) => {
    setSpots((prev) =>
      prev.map((s) => (s.id === spotId ? { ...s, note: newNote } : s))
    );
    if (saveTimerRef.current[spotId])
      clearTimeout(saveTimerRef.current[spotId]);
    saveTimerRef.current[spotId] = setTimeout(
      () => updateSpotNote(spotId, newNote),
      800
    );
  };

  const handleTimeChange = (spotId: string, newTime: string) => {
    setSpots((prev) => {
      const updated = prev.map((s) =>
        s.id === spotId ? { ...s, time: newTime } : s
      );
      return [...updated].sort((a, b) =>
        (a.time || "99:99").localeCompare(b.time || "99:99")
      );
    });
    if (saveTimerRef.current[`${spotId}-time`])
      clearTimeout(saveTimerRef.current[`${spotId}-time`]);
    saveTimerRef.current[`${spotId}-time`] = setTimeout(
      () => updateSpotTime(spotId, newTime),
      800
    );
  };

  const handleCategoryChange = async (spotId: string, newCat: string) => {
    setSpots((prev) =>
      prev.map((s) => (s.id === spotId ? { ...s, category: newCat } : s))
    );
    await updateSpotCategory(spotId, newCat);
  };

  const handleTransportChange = async (spotId: string, currentMode: string) => {
    const newMode = currentMode === "TRANSIT" ? "WALKING" : "TRANSIT";
    setSpots((prev) =>
      prev.map((s) => (s.id === spotId ? { ...s, transport_mode: newMode } : s))
    );
    await updateSpotTransportMode(spotId, newMode as "WALKING" | "TRANSIT");
  };

  const handleSmartSort = async () => {
    if (spots.length < 3) return alert("地點太少，不需要排序啦！");
    setIsLoading(true);
    const unsorted = [...spots];
    const sorted = [unsorted.shift()];
    while (unsorted.length > 0) {
      const current = sorted[sorted.length - 1];
      let nearestIndex = -1;
      let minDist = Infinity;
      const getLoc = (s: any) => {
        if (s.lat && s.lng) return { lat: Number(s.lat), lng: Number(s.lng) };
        if (Array.isArray(s.coordinates))
          return {
            lat: Number(s.coordinates[1]),
            lng: Number(s.coordinates[0]),
          };
        return null;
      };
      const currentLoc = getLoc(current);
      if (!currentLoc) {
        sorted.push(unsorted.shift());
        continue;
      }
      unsorted.forEach((candidate, index) => {
        const cLoc = getLoc(candidate);
        if (cLoc) {
          const dist = Math.sqrt(
            Math.pow(cLoc.lat - currentLoc.lat, 2) +
              Math.pow(cLoc.lng - currentLoc.lng, 2)
          );
          if (dist < minDist) {
            minDist = dist;
            nearestIndex = index;
          }
        }
      });
      if (nearestIndex !== -1) {
        sorted.push(unsorted[nearestIndex]);
        unsorted.splice(nearestIndex, 1);
      } else {
        sorted.push(unsorted.shift());
      }
    }
    const timeSlots = spots.map((s) => s.time).sort();
    const updatedSpots = sorted.map((s, i) => ({
      ...s,
      time: timeSlots[i] || "10:00",
    }));
    setSpots(updatedSpots);
    const updates = updatedSpots.map((s) => ({ id: s.id, time: s.time }));
    await updateSpotBatchOrder(updates);
    setIsLoading(false);
  };

  // ✨ 結算邏輯
  const settlement = useMemo(() => {
    if (members.length === 0) return [];

    // 1. 初始化每個人的餘額 (正: 別人欠我, 負: 我欠別人)
    const balances: { [key: string]: number } = {};
    members.forEach((m) => (balances[m.id] = 0));

    spots.forEach((spot) => {
      const cost = spot.actual_cost || 0;
      if (cost === 0 || !spot.payer_id) return;

      // 誰付的錢
      balances[spot.payer_id] = (balances[spot.payer_id] || 0) + cost;

      // 誰要分攤
      const involved =
        spot.involved_members && spot.involved_members.length > 0
          ? spot.involved_members
          : members.map((m) => m.id); // 沒選就全分

      const splitAmount = cost / involved.length;
      involved.forEach((uid: string) => {
        balances[uid] = (balances[uid] || 0) - splitAmount;
      });
    });

    // 2. 轉換成易讀格式
    return members
      .map((m) => ({
        id: m.id,
        name: m.name,
        balance: balances[m.id] || 0,
      }))
      .sort((a, b) => b.balance - a.balance);
  }, [spots, members]);

  const totalBudget = spots.reduce(
    (sum, s) => sum + (s.estimated_cost || 0),
    0
  );
  const totalActual = spots.reduce((sum, s) => sum + (s.actual_cost || 0), 0);

  return (
    <div className="w-full pb-20">
      <div className="fixed left-[-9999px]">
        <div
          ref={exportRef}
          className="w-[800px] bg-orange-50 p-10 min-h-screen font-sans"
        >
          <h1 className="text-4xl font-black mb-4 text-orange-600">
            Day {selectedDay} 行程表
          </h1>
          <div className="flex justify-between mb-6 text-slate-500 font-bold text-lg border-b-2 border-orange-200 pb-4">
            <span>{tripId}</span>
            <div className="flex gap-6">
              <div className="flex flex-col items-end">
                <span className="text-xs text-slate-400 uppercase">總預算</span>
                <span>{formatMoney(totalBudget, exchangeRate)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-orange-400 uppercase">
                  總實際支出
                </span>
                <span className="text-orange-600">
                  {formatMoney(totalActual, exchangeRate)}
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {spots.map((spot) => (
              <div
                key={spot.id}
                className="flex gap-4 items-start bg-white p-5 rounded-3xl border-2 border-orange-100 shadow-sm"
              >
                <div className="bg-orange-500 text-white font-black px-4 py-2 rounded-2xl text-xl min-w-[100px] text-center mt-1">
                  {spot.time}
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-black text-slate-800 mb-1">
                    {spot.name}
                  </div>
                  {spot.note && (
                    <div className="text-slate-500 text-base mb-3">
                      📝 {spot.note}
                    </div>
                  )}
                  {(spot.estimated_cost > 0 || spot.actual_cost > 0) && (
                    <div className="flex flex-col gap-1 mt-2 p-3 bg-slate-50 rounded-xl w-fit">
                      {spot.estimated_cost > 0 && (
                        <div className="flex items-center text-sm font-medium text-slate-500">
                          <span className="bg-white px-2 py-0.5 rounded text-xs border border-slate-100 mr-2 shadow-sm">
                            預算
                          </span>
                          <span>¥{spot.estimated_cost.toLocaleString()}</span>
                          <span className="text-slate-400 ml-2 text-xs">
                            (NT$
                            {Math.floor(
                              spot.estimated_cost * exchangeRate
                            ).toLocaleString()}
                            )
                          </span>
                        </div>
                      )}
                      {spot.actual_cost > 0 && (
                        <div className="flex items-center text-sm font-bold text-orange-600">
                          <span className="bg-orange-100 px-2 py-0.5 rounded text-xs mr-2 shadow-sm">
                            實支
                          </span>
                          <span>¥{spot.actual_cost.toLocaleString()}</span>
                          <span className="text-orange-400 ml-2 text-xs">
                            (NT$
                            {Math.floor(
                              spot.actual_cost * exchangeRate
                            ).toLocaleString()}
                            )
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center text-slate-400 font-bold text-sm">
            金笨旅遊幫
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div
            className="absolute inset-0 bg-orange-900/40 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-white rounded-t-[40px] sm:rounded-[40px] p-10 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom sm:zoom-in duration-300">
            <div className="text-center">
              <div className="text-4xl mb-4">🍊</div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">
                確定刪除嗎？
              </h3>
              <p className="text-slate-500 mb-8">
                Day {targetDeleteDay} 的行程會清空喔
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => {
                    setIsModalOpen(false);
                    setIsLoading(true);
                    await deleteSpecificDay(
                      tripId,
                      targetDeleteDay!,
                      days.length
                    );
                    initLoad();
                  }}
                  className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black shadow-lg"
                >
                  確認刪除
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✨ 成員管理與結算 Modal */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsMemberModalOpen(false)}
          />
          <div className="relative bg-white rounded-t-[40px] sm:rounded-[40px] p-8 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom sm:zoom-in duration-300 h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-800">
                📊 分帳助手
              </h3>
              <button
                onClick={() => setIsMemberModalOpen(false)}
                className="bg-slate-100 p-2 rounded-full"
              >
                ✕
              </button>
            </div>

            {/* 1. 成員管理 */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-400 uppercase mb-2">
                Trip Members
              </h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {members.map((m) => (
                  <span
                    key={m.id}
                    className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2"
                  >
                    {m.name}
                    <button
                      onClick={() => {
                        if (confirm("刪除此成員?"))
                          deleteTripMember(m.id, tripId).then(() => initLoad());
                      }}
                      className="text-slate-400 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="輸入名字 (例如: 金笨)"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm flex-1"
                />
                <button
                  onClick={() => {
                    if (newMemberName) {
                      addTripMember(tripId, newMemberName).then(() =>
                        initLoad()
                      );
                      setNewMemberName("");
                    }
                  }}
                  className="bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold text-sm"
                >
                  + 新增
                </button>
              </div>
            </div>

            {/* 2. 結算報表 */}
            <div className="flex-1 overflow-y-auto bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <h4 className="text-sm font-bold text-slate-400 uppercase mb-3">
                Settlement Report
              </h4>
              {members.length === 0 ? (
                <div className="text-center text-slate-400 text-xs mt-10">
                  請先新增成員
                </div>
              ) : (
                <div className="space-y-3">
                  {settlement.map((m) => (
                    <div
                      key={m.id}
                      className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm"
                    >
                      <span className="font-bold text-slate-700">{m.name}</span>
                      <div
                        className={`font-mono font-bold ${
                          m.balance >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {m.balance >= 0
                          ? `收回 ¥${m.balance.toLocaleString()}`
                          : `支付 ¥${Math.abs(m.balance).toLocaleString()}`}
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-xs text-slate-400 text-center">
                      * 負數代表需要拿出錢，正數代表應該收回錢
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative h-[220px] w-full bg-orange-100 rounded-t-[40px] overflow-hidden border-b-4 border-white">
        <img
          src="/images/header.jpg"
          className="h-full w-full object-cover opacity-60 mix-blend-multiply"
          alt="Banner"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-orange-900/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12">
          <Link
            href="/"
            className="text-white/80 font-black text-xs mb-2 tracking-widest uppercase italic drop-shadow-md"
          >
            ← Back to trips
          </Link>
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic drop-shadow-lg">
            {tripId.replace(/-/g, " ")}
          </h1>
        </div>
        <div className="absolute top-8 right-8 bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl text-white font-black text-sm border border-white/30 flex items-center gap-2 shadow-sm">
          {weather}
        </div>
        <button
          onClick={() => setIsChecklistOpen(true)}
          className="bg-white/20 backdrop-blur-md border border-white/50 text-white px-6 py-2 rounded-full font-black text-sm hover:bg-white hover:text-orange-600 transition-all flex items-center gap-2 mb-1 absolute bottom-8 right-8"
        >
          🎒 行前確認
        </button>
      </div>

      <div className="max-w-7xl mx-auto -mt-6 px-4">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-6 pl-2 pr-4">
          {days.map((day) => (
            <div key={day} className="relative flex-shrink-0 z-10">
              <button
                onClick={() => setSelectedDay(day)}
                className={`px-6 py-3 rounded-2xl font-black transition-all border-2 ${
                  selectedDay === day
                    ? "bg-orange-500 text-white border-orange-500 shadow-xl scale-105"
                    : "bg-white text-orange-400 border-orange-100 hover:bg-orange-50"
                }`}
              >
                DAY {day}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTargetDeleteDay(day);
                  setIsModalOpen(true);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-slate-200 hover:bg-red-400 text-white rounded-full transition-all text-[10px] z-20 border-2 border-white shadow-sm"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={async () => {
              const newTotal = days.length + 1;
              await updateTripDays(tripId, newTotal);
              setDays([...days, newTotal]);
            }}
            className="px-8 py-3 rounded-2xl border-2 border-dashed border-orange-200 text-orange-400 font-black hover:bg-orange-50 hover:border-orange-300 transition-all"
          >
            + DAY
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-[40px] shadow-xl border border-white">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-black">今日計畫</h2>
                  <div
                    className="flex flex-col gap-1 mt-2 text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => setIsMemberModalOpen(true)} // ✨ 點擊開啟分帳面板
                  >
                    <div className="flex justify-between w-full sm:w-64">
                      <span>💰 總預算:</span>
                      <span>
                        {formatMoney(totalBudget, exchangeRate) || "¥0"}
                      </span>
                    </div>
                    <div className="flex justify-between w-full sm:w-64 text-emerald-600">
                      <span>💸 總實際支出:</span>
                      <span>
                        {formatMoney(totalActual, exchangeRate) || "¥0"}
                      </span>
                    </div>
                    <div className="mt-1 pt-1 border-t border-slate-200 text-center text-indigo-400">
                      📊 點擊查看分帳 / 管理成員
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 self-start mt-2 sm:mt-0">
                  <button
                    id="download-btn"
                    onClick={handleDownload}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-200 transition-colors flex items-center gap-1 active:scale-95"
                  >
                    📥 下載
                  </button>
                  <button
                    onClick={handleSmartSort}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black hover:bg-indigo-100 transition-colors flex items-center gap-1 active:scale-95"
                  >
                    ⚡ 行程自動排序
                  </button>
                  <span className="text-xs font-black text-orange-500 bg-orange-50 px-3 py-2 rounded-xl flex items-center">
                    {spots.length} 個景點
                  </span>
                </div>
              </div>

              {isLoading ? (
                <div className="py-20 text-center text-slate-400 animate-pulse">
                  尋找行程中...
                </div>
              ) : (
                <div className="space-y-0">
                  {spots.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-orange-100 rounded-[30px] text-orange-300">
                      這天還沒有行程，快加入新地點吧！
                    </div>
                  ) : (
                    spots.map((spot, index) => (
                      <div key={spot.id}>
                        {index > 0 && (
                          <div className="flex justify-start items-center py-3 relative h-14 pl-10">
                            <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-slate-300 left-[42px] z-0" />
                            <button
                              onClick={() =>
                                handleTransportChange(
                                  spot.id,
                                  spot.transport_mode
                                )
                              }
                              className={`relative z-10 -ml-4 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer hover:scale-105 active:scale-95 bg-white shadow-sm ${
                                spot.transport_mode === "TRANSIT"
                                  ? "text-blue-600 border-blue-200"
                                  : "text-slate-500 border-slate-200"
                              }`}
                            >
                              {spot.transport_mode === "TRANSIT" ? (
                                <>🚇 搭地鐵</>
                              ) : (
                                <>🚶 走路</>
                              )}
                            </button>
                            {durations[spot.id] && (
                              <span className="ml-2 text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                                ⏱️ {durations[spot.id]}
                              </span>
                            )}
                          </div>
                        )}
                        <SpotItem
                          spot={spot}
                          members={members} // ✨ 傳遞成員
                          onSelect={() => {
                            console.log("Spot selected:", spot.name);
                            setFocusedSpot(spot);
                          }}
                          onDelete={(id: string) =>
                            deleteSpot(tripId, id).then(() => initLoad())
                          }
                          onNoteChange={handleNoteChange}
                          onTimeChange={handleTimeChange}
                          onCategoryChange={handleCategoryChange}
                          onCostChange={handleCostChange}
                          onSplitChange={handleSplitChange} // ✨ 傳遞分帳函式
                          exchangeRate={exchangeRate}
                        />
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="mt-8 p-5 bg-slate-50 rounded-[32px] relative">
                <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.id)}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                        selectedCategory === c.id
                          ? "bg-orange-500 text-white shadow-md"
                          : "bg-white text-slate-400"
                      }`}
                    >
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 relative">
                  <input
                    type="time"
                    value={newSpotTime}
                    onChange={(e) => setNewSpotTime(e.target.value)}
                    className="h-[56px] px-4 rounded-2xl bg-white border-none outline-none focus:ring-2 focus:ring-orange-400 font-black text-slate-600 shadow-sm w-full sm:w-auto"
                  />
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        if (pendingLocation) setPendingLocation(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSpot()}
                      placeholder="搜尋想去的日本景點..."
                      className="w-full h-[56px] px-5 rounded-2xl bg-white border-none outline-none focus:ring-2 focus:ring-orange-400 font-bold shadow-sm"
                    />
                    {suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-[60px] bg-white border border-slate-100 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {suggestions.map((s) => (
                          <button
                            key={s.place_id}
                            onClick={() =>
                              handleSelectSuggestion(s.place_id, s.description)
                            }
                            className="w-full px-5 py-4 text-left hover:bg-orange-50 text-sm font-bold border-b border-slate-50 last:border-none transition-colors flex items-center gap-3"
                          >
                            <span className="text-orange-400">📍</span>
                            <span className="truncate">{s.description}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleAddSpot}
                    className="h-[56px] bg-orange-500 text-white px-8 rounded-2xl font-black active:scale-95 transition-all shadow-lg shadow-orange-200"
                  >
                    加入
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:w-[380px]">
            <div className="sticky top-6 h-[400px] lg:h-[600px] bg-white p-2 rounded-[40px] shadow-2xl border-4 border-white overflow-hidden">
              <MapComponent
                spots={spots}
                isLoaded={isLoaded}
                focusedSpot={focusedSpot}
                onDurationsChange={setDurations}
              />
            </div>
          </div>
        </div>
      </div>
      <ChecklistModal
        tripId={tripId}
        isOpen={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
      />
    </div>
  );
}
