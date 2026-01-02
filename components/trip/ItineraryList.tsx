"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  getSpots,
  addSpotToDB,
  deleteSpot,
  getTripData,
  updateTripDays,
  updateSpotNote,
  updateSpotCategory,
  // @ts-ignore
  updateSpotTime,
  deleteSpecificDay,
} from "@/lib/actions/trip-actions";

import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import MapComponent from "./MapComponent";
import ChecklistModal from "./ChecklistModal"; // Ensure this path is correct based on your folder structure

const libraries: "places"[] = ["places"];

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

// --- Sub-component A: Spot Item (Display & Time Sorting) ---
function SpotItem({
  spot,
  onDelete,
  onNoteChange,
  onCategoryChange,
  onTimeChange,
}: any) {
  const [showCatMenu, setShowCatMenu] = useState(false);
  const currentCat =
    CATEGORIES.find((c) => c.id === spot.category) || CATEGORIES[0];

  return (
    <div className="relative flex flex-col p-5 bg-white rounded-[28px] border border-slate-100 mb-6 shadow-sm hover:border-orange-100 transition-all group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          {/* Time Selector: Core Sorting Basis */}
          <div className="flex-shrink-0 z-10">
            <input
              type="time"
              value={spot.time || ""}
              onChange={(e) => onTimeChange(spot.id, e.target.value)}
              className="bg-orange-500 text-white font-black px-3 py-2 rounded-xl border-none focus:ring-4 focus:ring-orange-200 text-sm outline-none transition-all cursor-pointer shadow-sm"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap flex-1">
            <span className="font-black text-slate-800 leading-tight tracking-tight text-lg">
              {spot.name}
            </span>

            {/* Category Button */}
            <div className="relative">
              <button
                onClick={() => setShowCatMenu(!showCatMenu)}
                className={`px-3 py-1 rounded-full text-[11px] font-black transition-transform active:scale-95 ${currentCat.color}`}
              >
                {currentCat.icon} {currentCat.label}
              </button>
              {showCatMenu && (
                <>
                  <div
                    className="fixed inset-0 z-[60]"
                    onClick={() => setShowCatMenu(false)}
                  />
                  <div className="absolute left-0 mt-2 w-32 bg-white border border-slate-100 rounded-2xl shadow-xl z-[70] p-2 animate-in fade-in zoom-in duration-100">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
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
          onClick={() => onDelete(spot.id)}
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

      <div className="mt-3 ml-2">
        <input
          type="text"
          value={spot.note || ""}
          onChange={(e) => onNoteChange(spot.id, e.target.value)}
          placeholder="✍️ 加入備註"
          className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-100 transition-all outline-none font-medium"
        />
      </div>
    </div>
  );
}

// --- Main Component ---
export default function ItineraryList({ tripId }: { tripId: string }) {
  const [spots, setSpots] = useState<any[]>([]);
  const [newSpotName, setNewSpotName] = useState("");
  const [selectedDay, setSelectedDay] = useState(1);
  const [days, setDays] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetDeleteDay, setTargetDeleteDay] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("spot");
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const [tempCoords, setTempCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const saveTimerRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
    language: "zh-TW",
    region: "JP",
  });

  // Sorting Logic: Spots with time first, then others
  const sortSpotsByTime = (data: any[]) => {
    return [...data].sort((a, b) => {
      const timeA = a.time || "99:99";
      const timeB = b.time || "99:99";
      return timeA.localeCompare(timeB);
    });
  };

  const initLoad = async () => {
    setIsLoading(true);
    const tripData = await getTripData(tripId);
    if (tripData?.days_count) {
      setDays(Array.from({ length: tripData.days_count }, (_, i) => i + 1));
    } else {
      setDays([1]);
    }
    const spotData = await getSpots(tripId, selectedDay);
    setSpots(sortSpotsByTime(spotData));
    setIsLoading(false);
  };

  useEffect(() => {
    initLoad();
  }, [tripId, selectedDay]);

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        setNewSpotName(place.name || "");
        setTempCoords({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
      }
    }
  };

  const handleAddSpot = async () => {
    if (!newSpotName.trim()) return;
    await addSpotToDB(
      tripId,
      newSpotName,
      selectedDay,
      tempCoords?.lat,
      tempCoords?.lng,
      selectedCategory
    );
    initLoad();
    setNewSpotName("");
    setTempCoords(null);
  };

  const handleTimeChange = (spotId: string, newTime: string) => {
    setSpots((prev) => {
      const updated = prev.map((s) =>
        s.id === spotId ? { ...s, time: newTime } : s
      );
      return sortSpotsByTime(updated);
    });

    if (saveTimerRef.current[`${spotId}-time`])
      clearTimeout(saveTimerRef.current[`${spotId}-time`]);
    saveTimerRef.current[`${spotId}-time`] = setTimeout(async () => {
      await updateSpotTime(spotId, newTime);
    }, 800);
  };

  const handleNoteChange = (spotId: string, newNote: string) => {
    setSpots((prev) =>
      prev.map((s) => (s.id === spotId ? { ...s, note: newNote } : s))
    );
    if (saveTimerRef.current[spotId])
      clearTimeout(saveTimerRef.current[spotId]);
    saveTimerRef.current[spotId] = setTimeout(async () => {
      await updateSpotNote(spotId, newNote);
    }, 800);
  };

  const handleCategoryChange = async (spotId: string, newCat: string) => {
    setSpots((prev) =>
      prev.map((s) => (s.id === spotId ? { ...s, category: newCat } : s))
    );
    await updateSpotCategory(spotId, newCat);
  };

  return (
    <div className="w-full pb-20">
      {/* Delete Confirmation Modal */}
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

      {/* Header */}
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
        <button
          onClick={() => setIsChecklistOpen(true)}
          className="bg-white/20 backdrop-blur-md border border-white/50 text-white px-6 py-2 rounded-full font-black text-sm hover:bg-white hover:text-orange-600 transition-all flex items-center gap-2 mb-1 absolute bottom-8 right-8"
        >
          🎒 行前確認
        </button>
      </div>

      <div className="max-w-7xl mx-auto -mt-6 px-4">
        {/* Day Tabs */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-6 pl-2 pr-4">
          {/* Day Buttons */}
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

          {/* + DAY Button */}
          <div className="flex-shrink-0 z-0">
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
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-[40px] shadow-xl border border-white">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black">今日計畫</h2>
                <span className="text-xs font-black text-orange-500 bg-orange-50 px-3 py-1 rounded-full">
                  {spots.length} 個地點
                </span>
              </div>

              {isLoading ? (
                <div className="py-20 text-center text-slate-400 animate-pulse">
                  尋找行程中...
                </div>
              ) : (
                <div className="space-y-2">
                  {spots.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-orange-100 rounded-[30px] text-orange-300">
                      這天還沒有行程，快加入新地點吧！
                    </div>
                  ) : (
                    spots.map((spot) => (
                      <SpotItem
                        key={spot.id}
                        spot={spot}
                        onDelete={(id: string) =>
                          deleteSpot(tripId, id).then(initLoad)
                        }
                        onNoteChange={handleNoteChange}
                        onTimeChange={handleTimeChange}
                        onCategoryChange={handleCategoryChange}
                      />
                    ))
                  )}
                </div>
              )}

              {/* Quick Add Area */}
              <div className="mt-8 p-5 bg-slate-50 rounded-[32px]">
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
                <div className="flex gap-2">
                  <div className="flex-1">
                    {isLoaded && (
                      <Autocomplete
                        onLoad={setAutocomplete}
                        onPlaceChanged={onPlaceChanged}
                      >
                        <input
                          type="text"
                          value={newSpotName}
                          onChange={(e) => setNewSpotName(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAddSpot()
                          }
                          placeholder="搜尋想去的日本景點..."
                          className="w-full px-5 py-4 rounded-2xl bg-white border-none outline-none focus:ring-2 focus:ring-orange-400 font-bold"
                        />
                      </Autocomplete>
                    )}
                  </div>
                  <button
                    onClick={handleAddSpot}
                    className="bg-orange-500 text-white px-6 py-4 rounded-2xl font-black active:scale-95 transition-all"
                  >
                    加
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:w-[380px]">
            <div className="sticky top-6 h-[400px] lg:h-[600px] bg-white p-2 rounded-[40px] shadow-2xl border-4 border-white overflow-hidden">
              <MapComponent spots={spots} isLoaded={isLoaded} />
            </div>
          </div>
        </div>
      </div>

      {/* Checklist Modal - MOVED INSIDE THE MAIN DIV */}
      <ChecklistModal
        tripId={tripId}
        isOpen={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
      />
    </div>
  );
}
