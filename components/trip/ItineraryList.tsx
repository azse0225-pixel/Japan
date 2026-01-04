// components/trip/ItineraryList.tsx
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
  getTripMembers,
  addTripMember,
  deleteTripMember,
  updateSpotSplit,
  updateUserNickname,
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

// --- SpotSkeleton 骨架元件 ---
function SpotSkeleton() {
  return (
    <div className="flex gap-4 items-start bg-white/50 p-5 rounded-[28px] border border-slate-100 mb-6 animate-pulse">
      <div className="w-16 h-10 bg-slate-200 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="h-5 bg-slate-200 rounded-lg w-1/3" />
        <div className="flex gap-2">
          <div className="w-8 h-8 bg-slate-100 rounded-lg" />
          <div className="w-8 h-8 bg-slate-100 rounded-lg" />
          <div className="h-8 bg-slate-50 rounded-lg flex-1" />
        </div>
      </div>
    </div>
  );
}

// --- SpotItem 元件 ---
function SpotItem({
  spot,
  members,
  onDelete,
  onNoteChange,
  onCategoryChange,
  onTimeChange,
  onSelect,
  onCostChange,
  onSplitChange,
  onAttachmentChange,
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
  const payerName =
    members.find((m: any) => m.id === spot.payer_id)?.name || "有人";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    try {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("file", file);
      const publicUrl = await uploadSpotAttachment(spot.id, formData);
      if (publicUrl) {
        const newAttachments = [...(spot.attachments || []), publicUrl];
        onAttachmentChange(spot.id, newAttachments);
      }
    } catch (err) {
      console.error("上傳失敗", err);
      alert("上傳失敗");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (url: string) => {
    if (!confirm("確定要刪除這張附件嗎？")) return;
    const newAttachments = (spot.attachments || []).filter(
      (u: string) => u !== url
    );
    onAttachmentChange(spot.id, newAttachments);
    await deleteSpotAttachment(spot.id, url);
  };

  const handlePayerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSplitChange(spot.id, e.target.value, spot.involved_members || []);
  };

  const handleInvolvedChange = (memberId: string, isChecked: boolean) => {
    let currentInvolved = spot.involved_members || [];
    if (Array.isArray(currentInvolved)) {
      if (isChecked) {
        currentInvolved = [...currentInvolved, memberId];
      } else {
        currentInvolved = currentInvolved.filter(
          (id: string) => id !== memberId
        );
      }
    } else {
      const newDetails = { ...currentInvolved };
      if (isChecked) {
        newDetails[memberId] =
          spot.actual_cost / (Object.keys(newDetails).length + 1);
      } else {
        delete newDetails[memberId];
      }
      currentInvolved = newDetails;
    }
    onSplitChange(spot.id, spot.payer_id, currentInvolved);
  };

  const handleMemberAmountChange = (memberId: string, amount: number) => {
    const currentInvolved = spot.involved_members || [];
    const totalCost = spot.actual_cost || 0;
    let newDetails: Record<string, number> = {};
    const involvedIds = Array.isArray(currentInvolved)
      ? currentInvolved
      : Object.keys(currentInvolved);

    if (involvedIds.length <= 1) {
      newDetails[memberId] = totalCost;
    } else {
      newDetails[memberId] = amount;
      const remainingAmount = totalCost - amount;
      const otherMemberIds = involvedIds.filter((id) => id !== memberId);
      const splitRemaining = remainingAmount / otherMemberIds.length;
      otherMemberIds.forEach((id) => {
        newDetails[id] = splitRemaining;
      });
    }
    onSplitChange(spot.id, spot.payer_id, newDetails);
  };

  return (
    <div
      onClick={onSelect}
      className="relative flex flex-col p-3 bg-white rounded-2xl border border-slate-100 mb-2 shadow-sm hover:border-orange-100 transition-all group z-10 cursor-pointer hover:scale-[1.005]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0 z-10">
            <input
              type="time"
              value={spot.time || ""}
              onFocus={(e) => e.target.select()}
              onChange={(e) => onTimeChange(spot.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="bg-orange-500 text-white font-black px-2 py-1 rounded-lg border-none focus:ring-4 focus:ring-orange-200 text-xs outline-none transition-all cursor-pointer shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <span className="font-bold text-slate-800 leading-tight tracking-tight text-base">
              {spot.name}
            </span>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCatMenu(!showCatMenu);
                }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-transform active:scale-95 ${currentCat.color}`}
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
                  <div className="absolute left-0 mt-1 w-32 bg-white border border-slate-100 rounded-2xl shadow-xl z-[70] p-2 animate-in fade-in zoom-in duration-100">
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
          className="p-1.5 text-slate-300 hover:text-red-500 transition-all active:scale-90"
        >
          <svg
            width="18"
            height="18"
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

      <div className="mt-1 flex gap-2 items-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowCost(!showCost);
            setShowTickets(false);
          }}
          className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-black transition-all ${
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
          className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-black transition-all relative ${
            spot.attachments?.length > 0
              ? "bg-blue-100 text-blue-600"
              : "bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-500"
          }`}
        >
          📎
          {spot.attachments?.length > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center">
              {spot.attachments.length}
            </span>
          )}
        </button>

        <div className="flex-1 flex flex-row items-center gap-2 min-h-[24px]">
          <input
            type="text"
            value={spot.note || ""}
            onChange={(e) => onNoteChange(spot.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="備註..."
            className="flex-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-orange-300 text-xs text-slate-500 placeholder:text-slate-300 outline-none transition-colors py-0.5"
          />
          {spot.actual_cost > 0 && (
            <div className="bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] text-emerald-600 font-bold border border-emerald-100 flex items-center gap-1 shrink-0">
              <span>¥{spot.actual_cost.toLocaleString()}</span>
              {spot.payer_id && (
                <span className="text-[8px] bg-white px-1 rounded text-emerald-400 whitespace-nowrap">
                  ({payerName})
                </span>
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
          <div className="bg-slate-50 rounded-xl p-2 flex flex-col relative border border-slate-100">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                預算
              </label>
              <span className="text-[9px] text-slate-500 font-bold bg-white px-1 rounded shadow-sm">
                NT$ {twdEst.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-slate-400 text-xs mr-1 font-medium">¥</span>
              <input
                type="number"
                value={spot.estimated_cost || 0}
                onFocus={(e) => e.target.select()}
                onChange={(e) =>
                  onCostChange(
                    spot.id,
                    Number(e.target.value),
                    spot.actual_cost
                  )
                }
                className="bg-transparent w-full text-base font-black text-slate-700 outline-none"
                placeholder="0"
              />
            </div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-2 flex flex-col relative border border-emerald-100">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[9px] text-emerald-600/70 font-bold uppercase tracking-wider">
                實支
              </label>
              <span className="text-[9px] text-emerald-600 font-bold bg-white px-1 rounded shadow-sm">
                NT$ {twdAct.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-emerald-500 text-xs mr-1 font-medium">
                ¥
              </span>
              <input
                type="number"
                value={spot.actual_cost || 0}
                onFocus={(e) => e.target.select()}
                onChange={(e) =>
                  onCostChange(
                    spot.id,
                    spot.estimated_cost,
                    Number(e.target.value)
                  )
                }
                className="bg-transparent w-full text-base font-black text-emerald-700 outline-none"
                placeholder="0"
              />
            </div>
          </div>
          {spot.actual_cost > 0 && members.length > 0 && (
            <div className="col-span-2 bg-indigo-50 rounded-xl p-2 border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-[9px] text-indigo-500 font-bold uppercase">
                  誰先墊錢?
                </label>
                <select
                  value={spot.payer_id || ""}
                  onChange={handlePayerChange}
                  className="text-xs bg-white border border-indigo-200 rounded px-2 py-0.5 outline-none text-indigo-700 font-bold"
                >
                  <option value="">(選擇成員)</option>
                  {members.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                {members.map((m: any) => {
                  const isInvolved = Array.isArray(spot.involved_members)
                    ? spot.involved_members.includes(m.id)
                    : !!spot.involved_members?.[m.id];
                  const amount = Array.isArray(spot.involved_members)
                    ? spot.actual_cost /
                      Math.max(1, spot.involved_members.length)
                    : spot.involved_members?.[m.id] || 0;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between bg-white/50 p-1.5 rounded-lg border border-indigo-100/50"
                    >
                      <label
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] cursor-pointer transition-colors ${
                          isInvolved
                            ? "bg-indigo-500 text-white"
                            : "bg-white text-indigo-400 border border-indigo-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={isInvolved}
                          onChange={(e) =>
                            handleInvolvedChange(m.id, e.target.checked)
                          }
                        />
                        {m.name}
                      </label>
                      {isInvolved && (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-indigo-400">¥</span>
                          <input
                            type="number"
                            value={Math.round(amount)}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                              handleMemberAmountChange(
                                m.id,
                                Number(e.target.value)
                              )
                            }
                            className="w-14 bg-white border border-indigo-100 rounded px-1 py-0.5 text-[10px] text-indigo-700 font-bold outline-none text-right"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {showTickets && (
        <div
          className="mt-2 bg-blue-50 rounded-xl p-3 animate-in slide-in-from-top-2 fade-in duration-200 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-wider">
              🎫 票券與附件
            </h4>
            <label className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors shadow-sm">
              {isUploading ? "上傳中..." : "+ 上傳"}
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
            <div className="text-center py-4 text-blue-300 text-[10px] font-bold border-2 border-dashed border-blue-200 rounded-lg">
              無附件
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {spot.attachments.map((url: string, idx: number) => (
                <div
                  key={idx}
                  className="relative group/img aspect-square bg-white rounded-lg overflow-hidden border border-blue-100 shadow-sm"
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
                    className="absolute top-0.5 right-0.5 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover/img:opacity-100 transition-opacity shadow-md"
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
  const [durations, setDurations] = useState<{ [key: string]: string }>({});
  const [weather, setWeather] = useState<string>("🌤️ 晴時多雲 24°C");
  const [exchangeRate, setExchangeRate] = useState(0.22);
  const [user, setUser] = useState<any>(null);
  const [tripData, setTripData] = useState<any>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const exportRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const latestRequestId = useRef(0);
  const loadTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
    language: "zh-TW",
    region: "JP",
    version: "weekly",
  });

  useEffect(() => {
    fetch("https://api.exchangerate-api.com/v4/latest/JPY")
      .then((res) => res.json())
      .then((data) => {
        if (data?.rates?.TWD) setExchangeRate(data.rates.TWD);
      })
      .catch((err) => console.error("匯率抓取失敗", err));
  }, []);

  useEffect(() => {
    if (!isLoaded || inputValue.length < 2 || pendingLocation) {
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
              includedRegionCodes: tripData?.country_code
                ? [tripData.country_code.toLowerCase()]
                : undefined,
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
    }, 100);
    return () => clearTimeout(timer);
  }, [inputValue, isLoaded, tripData, pendingLocation]);

  const initLoad = async (resetFocus = true, requestId?: number) => {
    if (requestId !== undefined && requestId !== latestRequestId.current)
      return;
    if (resetFocus) setFocusedSpot(null);
    setIsLoading(true);
    setSpots([]);

    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser(authUser);
      const [tripDataRaw, memberData] = await Promise.all([
        getTripData(tripId),
        getTripMembers(tripId),
      ]);
      const tripInfo = tripDataRaw as any;
      if (tripInfo) {
        setTripData(tripInfo);
        const totalDays = tripInfo.days_count || 1;
        const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);
        setDays(daysArray);
        if (selectedDay > totalDays) setSelectedDay(totalDays);
      }
      const processedMembers = (memberData || []).map((m: any) => {
        const isThisRowMe =
          authUser?.email &&
          m.user_email?.toLowerCase().trim() ===
            authUser.email.toLowerCase().trim();
        const isThisRowOwner =
          tripInfo &&
          m.user_email?.toLowerCase().trim() ===
            tripInfo.owner_email?.toLowerCase().trim();
        return {
          ...m,
          name: isThisRowMe
            ? authUser?.user_metadata?.full_name ||
              m.name ||
              m.user_email?.split("@")[0]
            : m.name || m.user_email?.split("@")[0],
          isOwner: isThisRowOwner,
          isMe: isThisRowMe,
        };
      });
      setMembers(processedMembers);

      const spotData = await getSpots(tripId, selectedDay);
      if (requestId !== undefined && requestId !== latestRequestId.current)
        return;

      const sortedSpots = [...(spotData || [])].sort((a, b) =>
        (a.time || "99:99").localeCompare(b.time || "99:99")
      );
      setSpots(sortedSpots);
      const weathers = [
        "🌤️ 晴朗 22°C",
        "☁️ 多雲 20°C",
        "🌧️ 小雨 18°C",
        "☀️ 艷陽 28°C",
      ];
      setWeather(weathers[(selectedDay - 1) % weathers.length]);
    } catch (error) {
      console.error("❌ initLoad 執行失敗:", error);
    } finally {
      if (requestId === undefined || requestId === latestRequestId.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    setIsLoading(true);
    setSpots([]);
    const currentId = ++latestRequestId.current;
    loadTimerRef.current = setTimeout(() => {
      initLoad(true, currentId);
    }, 100);
    return () => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  }, [tripId, selectedDay]);

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
  }, [tripId]);

  const handleDownload = async () => {
    if (!exportRef.current) return;
    const btn = document.getElementById("download-btn");
    if (btn) btn.innerText = "生成中...";
    try {
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        backgroundColor: "#fff7ed",
        pixelRatio: 2,
        filter: (node) =>
          !(
            node.tagName === "LINK" &&
            node.getAttribute("href")?.includes("fonts.googleapis.com")
          ),
        skipFonts: true,
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
        const prefix =
          tripData?.country_code === "JP"
            ? "日本 "
            : tripData?.country_code === "TW"
            ? "台灣 "
            : "";
        // @ts-ignore
        const { places } = await google.maps.places.Place.searchByText({
          textQuery: `${prefix}${inputValue}`,
          fields: ["location"],
          language: "zh-TW",
        });
        if (places?.[0]?.location) {
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

  const handleSplitChange = async (
    spotId: string,
    payerId: string | null,
    involved: any
  ) => {
    setSpots((prev) =>
      prev.map((s) =>
        s.id === spotId
          ? { ...s, payer_id: payerId, involved_members: involved }
          : s
      )
    );
    await updateSpotSplit(spotId, payerId, involved);
  };

  const handleAttachmentChange = (spotId: string, newAttachments: string[]) => {
    setSpots((prev) =>
      prev.map((s) =>
        s.id === spotId ? { ...s, attachments: newAttachments } : s
      )
    );
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
    const sorted: any[] = [unsorted.shift()];
    while (unsorted.length > 0) {
      const current = sorted[sorted.length - 1];
      let nearestIndex = -1;
      let minDist = Infinity;
      const getLoc = (s: any) =>
        s.lat && s.lng
          ? { lat: Number(s.lat), lng: Number(s.lng) }
          : Array.isArray(s.coordinates)
          ? { lat: Number(s.coordinates[1]), lng: Number(s.coordinates[0]) }
          : null;
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
      } else sorted.push(unsorted.shift());
    }
    const timeSlots = spots.map((s) => s.time).sort();
    const updatedSpots = sorted.map((s, i) => ({
      ...s,
      time: timeSlots[i] || "10:00",
    }));
    setSpots(updatedSpots);
    await updateSpotBatchOrder(
      updatedSpots.map((s) => ({ id: s.id, time: s.time }))
    );
    setIsLoading(false);
  };

  const settlement = useMemo(() => {
    if (members.length === 0) return [];
    const balances: Record<string, number> = {};
    members.forEach((m) => (balances[m.id] = 0));
    spots.forEach((spot) => {
      const cost = Number(spot.actual_cost || 0);
      if (cost <= 0) return;
      const payerId = spot.payer_id;
      const isDetailed =
        spot.involved_members && !Array.isArray(spot.involved_members);
      if (isDetailed) {
        const details = spot.involved_members as Record<string, number>;
        Object.entries(details).forEach(([mId, amount]) => {
          if (balances[mId] !== undefined) balances[mId] -= amount;
        });
      } else {
        const involved = (spot.involved_members as string[]) || [];
        if (involved.length > 0) {
          const splitAmount = cost / involved.length;
          involved.forEach((mId) => {
            if (balances[mId] !== undefined) balances[mId] -= splitAmount;
          });
        }
      }
      if (payerId && balances[payerId] !== undefined) balances[payerId] += cost;
    });
    return members
      .map((m) => ({ id: m.id, name: m.name, balance: balances[m.id] || 0 }))
      .sort((a, b) => b.balance - a.balance);
  }, [spots, members]);

  const totalBudget = spots.reduce(
    (sum, s) => sum + (s.estimated_cost || 0),
    0
  );
  const totalActual = spots.reduce((sum, s) => sum + (s.actual_cost || 0), 0);

  return (
    <div className="w-full pb-20">
      {/* 導出圖層 (隱藏) */}
      <div className="fixed left-[-9999px]">
        <div
          ref={exportRef}
          className="w-[800px] bg-orange-50 p-10 min-h-screen font-sans"
        >
          <h1 className="text-4xl font-black mb-4 text-orange-600">
            Day {selectedDay} 行程表
          </h1>
          <div className="flex justify-between mb-6 text-slate-500 font-bold text-lg border-b-2 border-orange-200 pb-4">
            <span>{tripData?.title || tripId}</span>
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
                        <div className="text-sm text-slate-500 font-medium">
                          預: ¥{spot.estimated_cost.toLocaleString()} (NT$
                          {Math.floor(
                            spot.estimated_cost * exchangeRate
                          ).toLocaleString()}
                          )
                        </div>
                      )}
                      {spot.actual_cost > 0 && (
                        <div className="text-sm text-orange-600 font-bold">
                          實: ¥{spot.actual_cost.toLocaleString()} (NT$
                          {Math.floor(
                            spot.actual_cost * exchangeRate
                          ).toLocaleString()}
                          )
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

      {/* 刪除彈窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div
            className="absolute inset-0 bg-orange-900/40 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-white rounded-t-[40px] sm:rounded-[40px] p-10 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom sm:zoom-in duration-300 text-center">
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
      )}

      {/* 成員分帳彈窗 */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsMemberModalOpen(false)}
          />
          <div className="relative bg-white rounded-t-[40px] sm:rounded-[40px] p-8 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom sm:zoom-in duration-300 h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-800">
                📊 成員與共享
              </h3>
              <button
                onClick={() => setIsMemberModalOpen(false)}
                className="bg-slate-100 p-2 rounded-full"
              >
                ✕
              </button>
            </div>
            <div className="mb-6 overflow-y-auto pr-2 flex-1">
              <div className="space-y-4">
                {members.map((m) => {
                  const iAmTripOwner =
                    user?.id && String(tripData?.owner_id) === String(user.id);
                  const isThisRowOwner =
                    m.isOwner === true ||
                    (m.user_email && m.user_email === tripData?.owner_email);
                  const isThisRowMe =
                    user?.email &&
                    m.user_email?.toLowerCase().trim() ===
                      user.email.toLowerCase().trim();
                  return (
                    <div
                      key={m.id}
                      className="bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-sm"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-black text-slate-800 flex items-center gap-2">
                          {isThisRowOwner ? "👑" : "👤"}
                          {isThisRowMe ? (
                            isEditingName ? (
                              <input
                                autoFocus
                                type="text"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                onBlur={async () => {
                                  setIsEditingName(false);
                                  if (tempName && tempName !== m.name) {
                                    await updateUserNickname(tempName, tripId);
                                    initLoad(false);
                                  }
                                }}
                                className="bg-orange-50 border-b-2 border-orange-500 outline-none px-1 w-32 font-black"
                              />
                            ) : (
                              <span
                                onClick={() => {
                                  setTempName(m.name);
                                  setIsEditingName(true);
                                }}
                                className="cursor-pointer hover:text-orange-500 flex items-center gap-1 group"
                              >
                                {m.name} (我)
                                <svg
                                  className="w-3 h-3 opacity-0 group-hover:opacity-100 text-orange-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2.5"
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                  />
                                </svg>
                              </span>
                            )
                          ) : (
                            <span>{m.name}</span>
                          )}
                          {isThisRowOwner && (
                            <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full border border-orange-200">
                              持有者
                            </span>
                          )}
                        </span>
                        {!isThisRowOwner && (iAmTripOwner || isThisRowMe) && (
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `確定要${
                                    iAmTripOwner ? "剔除此成員" : "退出此行程"
                                  }嗎？`
                                )
                              )
                                deleteTripMember(m.id, tripId).then(() =>
                                  initLoad()
                                );
                            }}
                            className="text-slate-400 hover:text-red-500 p-1 text-xs font-bold bg-white px-2 py-1 rounded-lg shadow-sm"
                          >
                            {iAmTripOwner ? "✕ 剔除" : "🚪 退出"}
                          </button>
                        )}
                      </div>
                      {!isThisRowOwner && (iAmTripOwner || isThisRowMe) && (
                        <input
                          type="email"
                          placeholder="填入 Email 以共享行程"
                          defaultValue={m.user_email || ""}
                          className="w-full text-xs bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none font-bold text-slate-600"
                          onBlur={async (e) => {
                            const newEmail = e.target.value
                              .toLowerCase()
                              .trim();
                            if (newEmail !== m.user_email) {
                              await supabase
                                .from("trip_members")
                                .update({ user_email: newEmail })
                                .eq("id", m.id);
                              initLoad(false);
                            }
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 p-4 bg-orange-50 rounded-3xl border-2 border-dashed border-orange-200">
                <h5 className="text-xs font-black text-orange-400 mb-3 text-center uppercase">
                  加入成員
                </h5>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="例如: 金笨"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="bg-white border-none rounded-2xl px-4 py-3 text-sm flex-1 font-bold shadow-sm"
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
                    className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-orange-100 active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-auto bg-slate-900 rounded-[32px] p-6 text-white overflow-y-auto max-h-[40%]">
              <h4 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest text-center">
                📊 Settlement Report
              </h4>
              {members.length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-4">
                  請先新增成員
                </div>
              ) : (
                <div className="space-y-3">
                  {settlement.map((m) => (
                    <div
                      key={m.id}
                      className="flex justify-between items-center bg-white/10 p-3 rounded-2xl"
                    >
                      <span className="font-bold text-sm">{m.name}</span>
                      <div
                        className={`font-mono font-bold text-sm ${
                          m.balance >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {m.balance >= 0
                          ? `+ ¥${m.balance.toLocaleString()}`
                          : `- ¥${Math.abs(m.balance).toLocaleString()}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 標題區域 */}
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
            {tripData?.title || tripId.replace(/-/g, " ")}
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

      {/* 天數選擇區域 */}
      <div className="max-w-7xl mx-auto -mt-6 px-4">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-6 pl-2 pr-4 relative">
          {isLoading && (
            <div className="absolute inset-0 z-50 cursor-wait bg-white/40 backdrop-blur-[1px] rounded-2xl flex items-center justify-center animate-in fade-in duration-300">
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {days.map((day) => (
            <div key={day} className="relative flex-shrink-0 z-10">
              <button
                disabled={isLoading}
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
            className="px-8 py-3 rounded-2xl border-2 border-dashed border-orange-200 text-orange-400 font-black hover:bg-orange-50 hover:border-orange-300"
          >
            + DAY
          </button>
        </div>

        {/* 行程內容與地圖 */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-[40px] shadow-xl border border-white">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-black">今日計畫</h2>
                  <div
                    className="flex flex-col gap-1 mt-2 text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => setIsMemberModalOpen(true)}
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
                      📊 查看詳細分帳 / 管理成員
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 self-start mt-2 sm:mt-0">
                  <button
                    id="download-btn"
                    onClick={handleDownload}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-200 flex items-center gap-1 active:scale-95 transition-all"
                  >
                    📥 下載
                  </button>
                  <button
                    onClick={handleSmartSort}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black hover:bg-indigo-100 flex items-center gap-1 active:scale-95 transition-all"
                  >
                    ⚡ 智慧排序
                  </button>
                  <span className="text-xs font-black text-orange-500 bg-orange-50 px-3 py-2 rounded-xl flex items-center">
                    {spots.length} 個景點
                  </span>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <SpotSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="space-y-0">
                  {spots.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-orange-100 rounded-[30px] text-orange-300 font-bold">
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
                              {spot.transport_mode === "TRANSIT"
                                ? "🚇 搭地鐵"
                                : "🚶 走路"}
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
                          members={members}
                          onSelect={() => setFocusedSpot(spot)}
                          onDelete={(id: string) =>
                            deleteSpot(tripId, id).then(() => initLoad())
                          }
                          onNoteChange={handleNoteChange}
                          onTimeChange={handleTimeChange}
                          onCategoryChange={handleCategoryChange}
                          onCostChange={handleCostChange}
                          onSplitChange={handleSplitChange}
                          onAttachmentChange={handleAttachmentChange}
                          exchangeRate={exchangeRate}
                        />
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 加入新地點區塊 */}
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
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSpot()}
                      placeholder={`搜尋想去的${
                        tripData?.country_code === "JP" ? "日本" : "地點"
                      }景點...`}
                      className="w-full h-[56px] px-5 rounded-2xl bg-white border-none outline-none focus:ring-2 focus:ring-orange-400 font-bold shadow-sm"
                    />
                    {suggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-[60px] bg-white border border-slate-100 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2">
                        {suggestions.map((s) => (
                          <button
                            key={s.place_id}
                            onClick={() =>
                              handleSelectSuggestion(s.place_id, s.description)
                            }
                            className="w-full px-5 py-4 text-left hover:bg-orange-50 text-sm font-bold border-b border-slate-50 last:border-none flex items-center gap-3"
                          >
                            <span className="text-orange-400">📍</span>
                            <span className="truncate">{s.description}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {pendingLocation && (
                      <div className="absolute -bottom-6 left-0 flex items-center gap-1.5 px-2 py-0.5 bg-orange-500 text-white rounded-md text-[9px] font-black shadow-sm animate-bounce">
                        📍 座標鎖定: {pendingLocation.lat.toFixed(4)},{" "}
                        {pendingLocation.lng.toFixed(4)}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingLocation(null);
                          }}
                          className="ml-1 hover:text-orange-200"
                        >
                          ✕
                        </button>
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
                countryCode={tripData?.country_code}
                onMapClick={(lat, lng) => {
                  setPendingLocation({ lat, lng });
                  if (!inputValue) setInputValue("地圖標記點");
                }}
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
