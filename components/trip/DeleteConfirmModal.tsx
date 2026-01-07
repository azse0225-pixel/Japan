// components/trip/DeleteConfirmModal.tsx
interface Props {
  isOpen: boolean;
  day: number | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmModal({
  isOpen,
  day,
  onClose,
  onConfirm,
}: Props) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-orange-900/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-[40px] p-10 w-full max-w-sm shadow-2xl text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          ⚠️
        </div>
        <h3 className="text-xl font-black mb-2 text-slate-800">
          確定刪除 Day {day} 嗎？
        </h3>
        <p className="text-slate-400 mb-8 text-sm font-medium">
          刪除後該天的行程將無法恢復喔！
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className="py-4 bg-orange-500 text-white rounded-2xl font-black shadow-lg shadow-orange-100"
          >
            確認刪除
          </button>
          <button
            onClick={onClose}
            className="py-4 bg-slate-50 text-slate-400 rounded-2xl font-black"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
