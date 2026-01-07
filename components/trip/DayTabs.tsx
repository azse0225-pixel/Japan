// components/trip/DayTabs.tsx
import { addDays, format } from "date-fns";

interface Props {
  days: number[];
  selectedDay: number;
  startDate: string;
  onSelectDay: (day: number) => void;
  onAddDay: () => void;
  onDeleteClick: (day: number) => void;
}

export default function DayTabs({
  days,
  selectedDay,
  startDate,
  onSelectDay,
  onAddDay,
  onDeleteClick,
}: Props) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-6">
      {days.map((day, i) => {
        const tabDate = startDate
          ? format(addDays(new Date(startDate), i), "MM/dd")
          : "";

        return (
          <div key={day} className="relative flex-shrink-0">
            <button
              onClick={() => onSelectDay(day)}
              className={`flex flex-col items-center min-w-[80px] py-3 rounded-[24px] border-2 transition-all ${
                selectedDay === day
                  ? "bg-orange-500 text-white border-orange-500 shadow-lg scale-105"
                  : "bg-white text-slate-400 border-orange-50 shadow-sm hover:border-orange-200"
              }`}
            >
              <span className="text-[10px] font-black uppercase opacity-60">
                Day
              </span>
              <span className="text-xl font-black leading-none">{day}</span>
              {tabDate && (
                <span
                  className={`text-[9px] font-bold mt-1 ${
                    selectedDay === day ? "text-orange-100" : "text-slate-300"
                  }`}
                >
                  {tabDate}
                </span>
              )}
            </button>
            <button
              onClick={() => onDeleteClick(day)}
              className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-slate-100 text-slate-400 rounded-full text-[8px] hover:bg-red-500 hover:text-white transition-colors border-2 border-white"
            >
              ✕
            </button>
          </div>
        );
      })}
      <button
        onClick={onAddDay}
        className="h-[72px] px-6 rounded-[24px] border-2 border-dashed border-orange-200 text-orange-400 font-black hover:bg-orange-50 transition-colors flex flex-col items-center justify-center"
      >
        <span className="text-xl">+</span>
        <span className="text-[8px] uppercase">Add Day</span>
      </button>
    </div>
  );
}
