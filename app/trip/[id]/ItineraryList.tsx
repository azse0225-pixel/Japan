"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getSpots,
  addSpotToDB,
  deleteSpot,
  updateSpotsOrder,
  deleteSpecificDay,
  swapDays,
  getTripData,
  updateTripDays,
} from "./actions";

import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import MapComponent from "./MapComponent";

const libraries: "places"[] = ["places"];

// --- 子元件 A：天數標籤 ---
function SortableDayTab({ day, isSelected, onClick, onDelete }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `day-${day}` });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group flex-shrink-0"
    >
      <button
        onClick={onClick}
        {...attributes}
        {...listeners}
        className={`pl-6 pr-12 py-3 rounded-2xl font-black transition-all border-2 cursor-grab active:cursor-grabbing whitespace-nowrap ${
          isSelected
            ? "bg-orange-500 text-white border-orange-500 shadow-xl scale-105"
            : "bg-white text-orange-300 border-orange-100 hover:bg-orange-50"
        }`}
      >
        DAY {day}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(day);
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-black/5 group-hover:bg-black/20 text-white rounded-full transition-all text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}

// --- 子元件 B：景點項目 ---
function SortableSpot({
  spot,
  onDelete,
}: {
  spot: any;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: spot.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-4 bg-white rounded-[24px] border mb-3 transition-all ${
        isDragging
          ? "shadow-2xl border-orange-300 scale-105"
          : "shadow-sm border-slate-100"
      } group`}
    >
      <div className="flex items-center gap-4">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab text-slate-300 hover:text-orange-400 p-2 active:cursor-grabbing"
        >
          ⠿
        </div>
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-400 text-lg flex-shrink-0">
          📍
        </div>
        <div className="flex flex-col">
          <span className="font-black text-slate-700 leading-tight tracking-tight">
            {spot.name}
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
            Adventure Spot
          </span>
        </div>
      </div>
      <button
        onClick={() => onDelete(spot.id)}
        className="opacity-0 group-hover:opacity-100 p-2 text-slate-200 hover:text-red-500 transition-all"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

// --- 主元件 ---
export default function ItineraryList({ tripId }: { tripId: string }) {
  const [spots, setSpots] = useState<any[]>([]);
  const [newSpotName, setNewSpotName] = useState("");
  const [selectedDay, setSelectedDay] = useState(1);
  const [days, setDays] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetDeleteDay, setTargetDeleteDay] = useState<number | null>(null);

  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const [tempCoords, setTempCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
    language: "zh-TW",
    region: "TW",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const initLoad = async () => {
    setIsLoading(true);
    // 1. 取得旅程天數
    const tripData = await getTripData(tripId);
    if (tripData?.days_count) {
      const dayArray = Array.from(
        { length: tripData.days_count },
        (_, i) => i + 1
      );
      setDays(dayArray);
    } else {
      setDays([1, 2, 3]);
    }

    // 2. 取得目前選中天數的景點
    const spotData = await getSpots(tripId, selectedDay);
    setSpots(spotData);
    setIsLoading(false);
  };

  useEffect(() => {
    initLoad();
  }, [tripId, selectedDay]);

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      const location = place.geometry?.location;
      if (location) {
        setNewSpotName(place.name || "");
        setTempCoords({ lat: location.lat(), lng: location.lng() });
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
      tempCoords?.lng
    );
    initLoad();
    setNewSpotName("");
    setTempCoords(null);
  };

  const handleAddDay = async () => {
    const newTotal = days.length + 1;
    await updateTripDays(tripId, newTotal);
    setDays([...days, newTotal]);
  };

  const handleDayDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldDay = parseInt((active.id as string).replace("day-", ""));
      const newDay = parseInt((over.id as string).replace("day-", ""));
      setIsLoading(true);
      await swapDays(tripId, oldDay, newDay);
      initLoad();
    }
  };

  const handleSpotDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = spots.findIndex((s) => s.id === active.id);
      const newIndex = spots.findIndex((s) => s.id === over.id);
      const newOrder = arrayMove(spots, oldIndex, newIndex);
      setSpots(newOrder);
      await updateSpotsOrder(tripId, newOrder, selectedDay);
    }
  };

  const confirmDeleteDay = async () => {
    if (targetDeleteDay === null) return;
    setIsModalOpen(false);
    setIsLoading(true);
    await deleteSpecificDay(tripId, targetDeleteDay, days.length);
    setSelectedDay(1);
    initLoad();
    setTargetDeleteDay(null);
  };

  return (
    <div className="w-full">
      {/* 確認彈窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-orange-900/20 backdrop-blur-md"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-white rounded-[40px] p-10 max-w-sm w-full shadow-2xl border-4 border-white animate-in zoom-in duration-300">
            <div className="text-center">
              <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                🍊
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">
                確定刪除嗎？
              </h3>
              <p className="text-slate-500 font-bold mb-8 text-sm leading-relaxed">
                Day {targetDeleteDay} 的內容會消失，這項變動會永久儲存喔！
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmDeleteDay}
                  className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black shadow-lg"
                >
                  確認刪除
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black"
                >
                  先不要
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 頂部 Banner */}
      <div className="relative h-[220px] w-full bg-[#FFEDD5] rounded-t-[40px] overflow-hidden border-b-4 border-white">
        <img
          src="https://img.freepik.com/free-vector/travel-concept-with-landmarks_23-2149153250.jpg"
          className="h-full w-full object-contain opacity-40 mix-blend-multiply"
          alt="Banner"
        />
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12">
          <Link
            href="/"
            className="text-orange-800/60 font-black text-xs mb-2 tracking-widest uppercase italic"
          >
            ← Back to trips
          </Link>
          <h1 className="text-4xl md:text-6xl font-black text-orange-900 uppercase tracking-tighter italic drop-shadow-sm">
            {tripId.replace(/-/g, " ")}
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto -mt-10 relative z-10 px-4 pb-20">
        {/* 天數標籤列 */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDayDragEnd}
        >
          <SortableContext
            items={days.map((d) => `day-${d}`)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex items-center gap-3 mb-10 overflow-x-auto pb-4 no-scrollbar">
              {days.map((day) => (
                <SortableDayTab
                  key={day}
                  day={day}
                  isSelected={selectedDay === day}
                  onClick={() => setSelectedDay(day)}
                  onDelete={(d: any) => {
                    setTargetDeleteDay(d);
                    setIsModalOpen(true);
                  }}
                />
              ))}
              <button
                onClick={handleAddDay}
                className="px-8 py-3 rounded-2xl bg-orange-50 text-orange-500 font-black border-2 border-dashed border-orange-200 hover:bg-orange-100 transition-all flex-shrink-0"
              >
                + ADD DAY
              </button>
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 lg:w-[60%]">
            <div className="bg-white/90 backdrop-blur-xl p-8 md:p-10 rounded-[48px] shadow-2xl shadow-orange-200/40 border border-orange-50">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                  Day {selectedDay}{" "}
                  <span className="text-orange-400 font-normal italic ml-1">
                    Plan
                  </span>
                </h2>
                <span className="bg-orange-50 text-orange-500 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                  {spots.length} Spots
                </span>
              </div>

              {isLoading ? (
                <div className="text-center py-20 text-slate-300 italic animate-pulse">
                  Loading adventure...
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleSpotDragEnd}
                >
                  <SortableContext
                    items={spots.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="min-h-[120px]">
                      {spots.length === 0 ? (
                        <div className="text-center py-16 border-2 border-dashed border-orange-100 rounded-[32px] text-orange-300 bg-orange-50/20 font-bold italic">
                          這天還沒有行程，搜尋地點來填滿它吧！
                        </div>
                      ) : (
                        spots.map((spot) => (
                          <SortableSpot
                            key={spot.id}
                            spot={spot}
                            onDelete={(id) =>
                              deleteSpot(tripId, id).then(initLoad)
                            }
                          />
                        ))
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              <div className="mt-10 flex gap-3 p-2 bg-orange-50 rounded-[28px]">
                {isLoaded ? (
                  <Autocomplete
                    onLoad={(auto) => setAutocomplete(auto)}
                    onPlaceChanged={onPlaceChanged}
                    className="flex-1"
                  >
                    <input
                      type="text"
                      value={newSpotName}
                      onChange={(e) => setNewSpotName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSpot()}
                      placeholder="🔍 搜尋地點 (例如: 台北101)..."
                      className="w-full px-6 py-4 rounded-[22px] bg-white border-none outline-none focus:ring-2 focus:ring-orange-400 text-slate-700 font-bold shadow-sm"
                    />
                  </Autocomplete>
                ) : (
                  <div className="flex-1 bg-white px-6 py-4 rounded-[22px] text-slate-300">
                    Loading Map...
                  </div>
                )}
                <button
                  onClick={handleAddSpot}
                  className="bg-orange-500 text-white px-10 py-4 rounded-[22px] font-black shadow-lg shadow-orange-100"
                >
                  ADD
                </button>
              </div>
            </div>
          </div>

          <div className="lg:w-[40%]">
            <div className="sticky top-24">
              <div className="bg-white p-3 rounded-[48px] shadow-2xl border-4 border-white h-[500px] overflow-hidden group">
                <MapComponent spots={spots} />
              </div>
              <p className="mt-4 text-center text-orange-900/40 text-[10px] font-black tracking-widest uppercase">
                Adventure Guide . Day {selectedDay}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
