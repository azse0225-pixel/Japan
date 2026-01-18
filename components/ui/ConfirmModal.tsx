"use client";

import { cn } from "@/lib/utils";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  type?: "danger" | "warning";
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "確定刪除",
  type = "danger",
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-[35px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 text-center space-y-4">
          {/* 警告圖示 */}
          <div
            className={cn(
              "w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl",
              type === "danger"
                ? "bg-rose-50 text-rose-500"
                : "bg-amber-50 text-amber-500"
            )}
          >
            {type === "danger" ? "⚠️" : "❓"}
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-800">{title}</h3>
            <p className="text-sm font-medium text-slate-400 leading-relaxed">
              {description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <button
              onClick={onClose}
              className="py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
            >
              取消
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={cn(
                "py-4 text-white rounded-2xl font-black text-sm shadow-lg transition-all active:scale-95",
                type === "danger"
                  ? "bg-rose-500 shadow-rose-200"
                  : "bg-indigo-600 shadow-indigo-200"
              )}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
