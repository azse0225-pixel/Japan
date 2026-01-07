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
  getTripMembers,
  addTripMember,
  deleteTripMember,
  updateSpotSplit,
} from "@/lib/actions/trip-actions";

import { useJsApiLoader } from "@react-google-maps/api";
import MapComponent from "./MapComponent";
import ChecklistModal from "./ChecklistModal";
import TripDetailHeader from "./TripDetailHeader";
import AddSpotForm from "./AddSpotForm";
import SpotItem from "./SpotItem";

export const CATEGORIES = [
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

export default function ItineraryList({ tripId }: { tripId: string }) {
  const [spots, setSpots] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [pendingLocation, setPendingLocation] = useState<any>(null);
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
  const saveTimerRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places", "geometry"],
    language: "zh-TW",
  });

  const initLoad = async (resetFocus = true) => {
    if (resetFocus) setFocusedSpot(null);
    setIsLoading(true);
    try {
      const localId = localStorage.getItem(`me_in_${tripId}`);
      const [trip, memberList] = await Promise.all([
        getTripData(tripId),
        getTripMembers(tripId, localId || undefined),
      ]);
      if (trip) {
        setTripData(trip);
        setDays(Array.from({ length: trip.days_count || 1 }, (_, i) => i + 1));
      }
      setMembers(memberList || []);
      const spotList = await getSpots(tripId, selectedDay);
      setSpots(
        (spotList || []).sort((a: any, b: any) => a.time.localeCompare(b.time))
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
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, selectedDay]);

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
        alert("找不到地點");
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
    <div className="w-full pb-20">
      <TripDetailHeader
        title={tripData?.title}
        onOpenChecklist={() => setIsChecklistOpen(true)}
      />

      <div className="max-w-7xl mx-auto -mt-6 px-4">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-6">
          {days.map((day) => (
            <div key={day} className="relative flex-shrink-0">
              <button
                onClick={() => setSelectedDay(day)}
                className={`px-6 py-3 rounded-2xl font-black border-2 ${
                  selectedDay === day
                    ? "bg-orange-500 text-white border-orange-500 shadow-xl"
                    : "bg-white text-orange-400 border-orange-100"
                }`}
              >
                DAY {day}
              </button>
              <button
                onClick={() => {
                  setTargetDeleteDay(day);
                  setIsModalOpen(true);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-slate-200 text-white rounded-full text-[10px]"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={async () => {
              const n = days.length + 1;
              await updateTripDays(tripId, n);
              initLoad(false);
            }}
            className="px-8 py-3 rounded-2xl border-2 border-dashed border-orange-200 text-orange-400 font-black"
          >
            + DAY
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="bg-white/80 p-6 sm:p-8 rounded-[40px] shadow-xl border border-white">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black">今日計畫</h2>
                <button
                  onClick={() => setIsMemberModalOpen(true)}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black"
                >
                  📊 分帳成員
                </button>
              </div>

              <div className="space-y-0">
                {isLoading ? (
                  <p className="text-center py-10">載入中...</p>
                ) : spots.length === 0 ? (
                  <p className="py-12 text-center text-orange-300 font-bold border-2 border-dashed border-orange-100 rounded-3xl">
                    還沒有行程！
                  </p>
                ) : (
                  spots.map((spot, idx) => (
                    <div key={spot.id}>
                      {idx > 0 && (
                        <div className="flex items-center py-3 pl-10 h-14 relative">
                          <button
                            onClick={() =>
                              updateSpotTransportMode(
                                spot.id,
                                spot.transport_mode === "TRANSIT"
                                  ? "WALKING"
                                  : "TRANSIT"
                              ).then(() => initLoad(false))
                            }
                            className="px-3 py-1 rounded-full text-xs font-bold border bg-white shadow-sm -ml-4"
                          >
                            {spot.transport_mode === "TRANSIT"
                              ? "🚇 搭地鐵"
                              : "🚶 走路"}
                          </button>
                          {durations[spot.id] && (
                            <span className="ml-3 text-[10px] font-black text-slate-400">
                              ⏱️ {durations[spot.id].time || durations[spot.id]}
                            </span>
                          )}
                        </div>
                      )}
                      <SpotItem
                        spot={spot}
                        members={members}
                        onSelect={() => setFocusedSpot(spot)}
                        onDelete={(id: string) =>
                          deleteSpot(tripId, id).then(() => initLoad(false))
                        }
                        onNoteChange={handleNoteChange}
                        onCategoryChange={(id: any, cat: any) =>
                          updateSpotCategory(id, cat).then(() =>
                            initLoad(false)
                          )
                        }
                        onTimeChange={(id: any, t: any) =>
                          updateSpotTime(id, t).then(() => initLoad(false))
                        }
                        onCostChange={(id: any, est: any, act: any) =>
                          updateSpotCost(id, est, act).then(() =>
                            initLoad(false)
                          )
                        }
                        onSplitChange={(id: any, p: any, inv: any) =>
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

              <AddSpotForm
                inputValue={inputValue}
                setInputValue={setInputValue}
                suggestions={suggestions}
                onSelectSuggestion={handleSelectSuggestion}
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

          <div className="lg:w-[380px]">
            <div className="sticky top-6 h-[400px] lg:h-[600px] bg-white p-2 rounded-[40px] shadow-2xl border-4 border-white overflow-hidden">
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

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-orange-900/40 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-white rounded-[40px] p-10 w-full max-w-sm shadow-2xl text-center">
            <h3 className="text-2xl font-black mb-2">確定刪除嗎？</h3>
            <div className="flex flex-col gap-3 mt-8">
              <button
                onClick={async () => {
                  await deleteSpecificDay(
                    tripId,
                    targetDeleteDay!,
                    days.length
                  );
                  setIsModalOpen(false);
                  initLoad();
                }}
                className="py-4 bg-orange-500 text-white rounded-2xl font-black"
              >
                確認刪除
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="py-4 bg-slate-100 text-slate-500 rounded-2xl font-black"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {isMemberModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsMemberModalOpen(false)}
          />
          <div className="relative bg-white rounded-[40px] p-8 w-full max-w-md shadow-2xl h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black">📊 成員與分帳</h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="bg-slate-50 p-4 rounded-3xl flex justify-between items-center"
                >
                  <span className="font-black">{m.name}</span>
                  {!m.isOwner && (
                    <button
                      onClick={() =>
                        deleteTripMember(m.id, tripId).then(() => initLoad())
                      }
                      className="text-slate-400 text-xs"
                    >
                      ✕ 移除
                    </button>
                  )}
                </div>
              ))}
              <div className="mt-6 p-4 bg-orange-50 rounded-3xl border-2 border-dashed border-orange-200 flex gap-2">
                <input
                  type="text"
                  placeholder="成員名稱"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="bg-white rounded-2xl px-4 py-3 text-sm flex-1 font-bold"
                />
                <button
                  onClick={async () => {
                    if (newMemberName) {
                      const newM = await addTripMember(tripId, newMemberName);
                      if (!localStorage.getItem(`me_in_${tripId}`))
                        localStorage.setItem(`me_in_${tripId}`, newM.id);
                      initLoad();
                      setNewMemberName("");
                    }
                  }}
                  className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black"
                >
                  +
                </button>
              </div>
            </div>
            <div className="mt-6 bg-slate-900 rounded-[32px] p-6 text-white overflow-y-auto max-h-[40%]">
              <h4 className="text-xs font-black text-slate-400 uppercase mb-4 text-center">
                📊 Settlement
              </h4>
              {settlement.map((m) => (
                <div
                  key={m.id}
                  className="flex justify-between items-center bg-white/10 p-3 rounded-2xl mb-2"
                >
                  <span className="font-bold text-sm">{m.name}</span>
                  <span
                    className={`font-mono font-bold ${
                      m.balance >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {m.balance >= 0 ? "+" : ""}¥
                    {Math.round(m.balance).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ChecklistModal
        tripId={tripId}
        isOpen={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
      />
    </div>
  );
}
