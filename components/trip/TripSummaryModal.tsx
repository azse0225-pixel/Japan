"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { addTripLevelExpense } from "@/lib/actions/trip-actions";

export function TripSummaryModal({
  isOpen,
  onClose,
  allSpots,
  members,
  settlement,
  tripId,
  daysCount,
  onRefresh,
  deleteExpense,
  allTripExpenses = [],
}: any) {
  // ---------------------------------------------------------
  // 1. 所有的 Hook 必須放在組件的最頂層 (Top Level)
  // ---------------------------------------------------------
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [newExp, setNewExp] = useState({
    description: "",
    amount: 0,
    currency: "JPY",
    day: 1,
    payer_id: members?.[0]?.id || "",
    involved_members: members?.map((m: any) => m.id) || [],
    cost_breakdown: {} as Record<string, number>,
  });

  // 整理所有費用的顯示格式
  const allExpenses = useMemo(() => {
    return allTripExpenses
      .map((exp: any) => {
        const spot = allSpots.find((s: any) => s.id === exp.spot_id);
        return {
          ...exp,
          description: exp.title || exp.description,
          spotName: spot?.name || "行程雜項",
          day: exp.day || spot?.day || 1,
          spotTime: spot?.time || "99:99",
        };
      })
      .sort((a: any, b: any) => {
        if (a.day !== b.day) return a.day - b.day;
        return a.spotTime.localeCompare(b.spotTime);
      });
  }, [allTripExpenses, allSpots]);

  // 計算總額
  const totals = useMemo(() => {
    return allExpenses.reduce(
      (acc: any, exp: any) => {
        const curr = exp.currency || "JPY";
        acc[curr] = (acc[curr] || 0) + (Number(exp.amount) || 0);
        return acc;
      },
      { JPY: 0, TWD: 0 }
    );
  }, [allExpenses]);

  // ---------------------------------------------------------
  // 2. Hook 宣告完後，才進行 Early Return
  // ---------------------------------------------------------
  if (!isOpen) return null;

  // ---------------------------------------------------------
  // 3. 邏輯 Function
  // ---------------------------------------------------------
  const toggleMember = (memberId: string) => {
    setNewExp((prev) => {
      const isRemoving = prev.involved_members.includes(memberId);
      const newInv = isRemoving
        ? prev.involved_members.filter((id: any) => id !== memberId)
        : [...prev.involved_members, memberId];

      const newBreakdown = { ...prev.cost_breakdown };
      if (isRemoving) delete newBreakdown[memberId];

      return {
        ...prev,
        involved_members: newInv,
        cost_breakdown: newBreakdown,
      };
    });
  };

  const handleMemberAmountChange = (memberId: string, value: string) => {
    const val = value === "" ? 0 : Number(value);
    setNewExp((prev) => {
      const newBreakdown = { ...prev.cost_breakdown, [memberId]: val };
      const newTotal = Object.values(newBreakdown).reduce(
        (sum, v) => sum + v,
        0
      );
      return { ...prev, cost_breakdown: newBreakdown, amount: newTotal };
    });
  };

  const handleQuickAdd = async () => {
    if (!newExp.description || newExp.amount <= 0) return;
    try {
      await addTripLevelExpense({
        trip_id: tripId,
        day: newExp.day,
        title: newExp.description,
        amount: newExp.amount,
        currency: newExp.currency,
        payer_id: newExp.payer_id,
        involved_members: newExp.involved_members,
        cost_breakdown: newExp.cost_breakdown,
      });
      setIsAdding(false);
      setNewExp({ ...newExp, description: "", amount: 0, cost_breakdown: {} });
      onRefresh();
    } catch (e) {
      alert("新增失敗");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteExpense(deleteTargetId, tripId);
      setDeleteTargetId(null);
      onRefresh();
    } catch (e) {
      alert("刪除失敗");
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white w-full max-w-6xl rounded-[30px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] relative">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-50 flex justify-between items-center bg-indigo-600 text-white shrink-0">
          <div className="flex flex-col">
            <h3 className="text-lg sm:text-xl font-black italic">
              Trip Financial Report
            </h3>
            <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">
              行程財務與分帳管理
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center font-bold hover:bg-white/40"
          >
            ✕
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
          {/* 🚀 快速記帳區 */}
          <div className="space-y-4">
            {!isAdding ? (
              <button
                onClick={() => setIsAdding(true)}
                className="w-full py-4 border-2 border-dashed border-indigo-200 rounded-[24px] text-indigo-500 font-black text-sm hover:bg-indigo-50 transition-all"
              >
                + 增加一筆全行程雜支 (支援個別分帳)
              </button>
            ) : (
              <div className="p-4 sm:p-6 bg-indigo-50 rounded-[28px] sm:rounded-[32px] space-y-4 sm:space-y-6 border border-indigo-100 animate-in fade-in slide-in-from-top-4">
                {/* 輸入欄位 Grid - 手機版優化 */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-indigo-400 ml-2">
                      日期
                    </label>
                    <select
                      value={newExp.day}
                      onChange={(e) =>
                        setNewExp({ ...newExp, day: Number(e.target.value) })
                      }
                      className="bg-white p-2.5 sm:p-3 rounded-2xl text-xs sm:text-sm font-bold shadow-sm outline-none"
                    >
                      {Array.from({ length: daysCount }, (_, i) => i + 1).map(
                        (d) => (
                          <option key={d} value={d}>
                            Day {d}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-indigo-400 ml-2">
                      幣別
                    </label>
                    <select
                      value={newExp.currency}
                      onChange={(e) =>
                        setNewExp({ ...newExp, currency: e.target.value })
                      }
                      className="bg-white p-2.5 sm:p-3 rounded-2xl text-xs sm:text-sm font-bold text-indigo-600 shadow-sm outline-none"
                    >
                      <option value="JPY">JPY (¥)</option>
                      <option value="TWD">TWD ($)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 col-span-2 md:col-span-2">
                    <label className="text-[10px] font-black text-indigo-400 ml-2">
                      項目描述
                    </label>
                    <input
                      type="text"
                      placeholder="描述內容..."
                      value={newExp.description}
                      onChange={(e) =>
                        setNewExp({ ...newExp, description: e.target.value })
                      }
                      className="bg-white p-2.5 sm:p-3 rounded-2xl text-xs sm:text-sm font-bold shadow-sm outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                    <label className="text-[10px] font-black text-indigo-400 ml-2">
                      總額 (自動加總)
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={newExp.amount}
                      className="bg-white/50 p-2.5 sm:p-3 rounded-2xl text-xs sm:text-sm font-black text-indigo-600 shadow-inner cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* 👥 成員分帳細項 */}
                <div className="bg-white/60 p-4 sm:p-5 rounded-[24px] sm:rounded-[28px] border border-indigo-100">
                  <p className="text-[10px] font-black text-slate-400 mb-3 sm:mb-4 ml-2 uppercase tracking-widest">
                    分帳明細設定
                  </p>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {members.map((m: any) => {
                      const isInv = newExp.involved_members.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          className={cn(
                            "flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-all",
                            isInv
                              ? "bg-white border-indigo-200 shadow-sm"
                              : "opacity-30"
                          )}
                        >
                          <button
                            onClick={() => toggleMember(m.id)}
                            className={cn(
                              "px-2 sm:px-3 py-1 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black",
                              isInv
                                ? "bg-indigo-500 text-white"
                                : "bg-slate-200 text-slate-500"
                            )}
                          >
                            {m.name}
                          </button>
                          {isInv && (
                            <div className="flex items-center gap-1 border-l pl-1.5 sm:pl-2 border-slate-100">
                              <span className="text-[9px] sm:text-[10px] font-black text-slate-400">
                                {newExp.currency === "JPY" ? "¥" : "$"}
                              </span>
                              <input
                                type="number"
                                placeholder="0"
                                value={newExp.cost_breakdown[m.id] || ""}
                                onChange={(e) =>
                                  handleMemberAmountChange(m.id, e.target.value)
                                }
                                className="w-12 sm:w-16 bg-transparent text-xs sm:text-sm font-black text-indigo-600 outline-none"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label className="text-[10px] font-black text-slate-400 shrink-0">
                      墊付人：
                    </label>
                    <select
                      value={newExp.payer_id}
                      onChange={(e) =>
                        setNewExp({ ...newExp, payer_id: e.target.value })
                      }
                      className="flex-1 sm:flex-none bg-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm outline-none"
                    >
                      {members.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setIsAdding(false)}
                      className="flex-1 sm:flex-none px-6 py-2 text-xs font-bold text-slate-400"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleQuickAdd}
                      className="flex-1 sm:flex-none px-8 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 transition-all active:scale-95"
                    >
                      儲存支出
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 💰 總覽卡片與結算 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {/* 總支出 */}
            <div className="p-6 sm:p-7 bg-slate-50 rounded-[30px] sm:rounded-[35px] border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                全行程總支出
              </span>
              <div className="mt-3 space-y-1">
                <p className="text-2xl sm:text-3xl font-black text-indigo-600">
                  ¥ {totals.JPY.toLocaleString()}
                </p>
                <p className="text-xs sm:text-sm font-bold text-slate-400">
                  $ {totals.TWD.toLocaleString()} TWD
                </p>
              </div>
            </div>

            {/* 個人結算 - 保持捲動但優化手機版寬度 */}
            <div className="col-span-1 md:col-span-2 p-6 sm:p-7 bg-slate-50 rounded-[30px] sm:rounded-[35px] border border-slate-100 overflow-x-auto scrollbar-hide">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                個人結算概況
              </span>
              <div className="mt-4 flex gap-6 sm:gap-8">
                {settlement.map((s: any) => (
                  <div
                    key={s.id}
                    className="min-w-[100px] sm:min-w-[120px] border-l-4 border-indigo-100 pl-4 sm:pl-5 shrink-0"
                  >
                    <p className="text-xs sm:text-sm font-black text-slate-800 mb-1">
                      {s.name}
                    </p>
                    <p
                      className={cn(
                        "text-[10px] sm:text-xs font-black",
                        s.balances.JPY >= 0
                          ? "text-emerald-500"
                          : "text-rose-400"
                      )}
                    >
                      {s.balances.JPY >= 0 ? "+" : ""}
                      {Math.round(s.balances.JPY).toLocaleString()} JPY
                    </p>
                    <p
                      className={cn(
                        "text-[9px] sm:text-[10px] font-bold opacity-80 mt-0.5",
                        s.balances.TWD >= 0
                          ? "text-emerald-500"
                          : "text-rose-400"
                      )}
                    >
                      {s.balances.TWD >= 0 ? "+" : ""}
                      {Math.round(s.balances.TWD).toLocaleString()} TWD
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 📋 費用清單 - 響應式切換 */}
          <div className="space-y-4">
            {/* 📱 手機版：卡片式清單 (md 以下顯示) */}
            <div className="flex md:hidden flex-col gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                費用明細 (卡片)
              </span>
              {allExpenses.length === 0 ? (
                <div className="py-10 text-center text-slate-300 font-bold italic text-sm">
                  目前尚無記錄
                </div>
              ) : (
                allExpenses.map((exp: any) => (
                  <div
                    key={exp.id}
                    className="bg-slate-50 rounded-3xl p-4 border border-slate-100 shadow-sm relative group overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-indigo-400 uppercase">
                          Day {exp.day} • {exp.spotName}
                        </span>
                        <h4 className="text-sm font-black text-slate-700">
                          {exp.description}
                        </h4>
                      </div>
                      <button
                        onClick={() => setDeleteTargetId(exp.id)}
                        className="text-slate-300 p-1 hover:text-rose-500 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200/50">
                      <span className="text-[10px] font-bold text-slate-400">
                        {members.find((m: any) => m.id === exp.payer_id)
                          ?.name || "系統"}{" "}
                        墊付
                      </span>
                      <p className="text-sm font-black text-indigo-600">
                        {exp.currency === "JPY" ? "¥" : "$"}{" "}
                        {Number(exp.amount).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 💻 桌機版：精緻表格 (md 以上顯示) */}
            <div className="hidden md:block rounded-[40px] border border-slate-100 overflow-hidden bg-white shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-5">日期 / 景點</th>
                    <th className="px-8 py-5">項目</th>
                    <th className="px-8 py-5">金額</th>
                    <th className="px-8 py-5">墊付人</th>
                    <th className="px-6 py-5 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {allExpenses.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-8 py-16 text-center text-slate-300 font-bold italic"
                      >
                        目前尚無任何花費記錄
                      </td>
                    </tr>
                  ) : (
                    allExpenses.map((exp: any) => (
                      <tr
                        key={exp.id}
                        className="group hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-8 py-5">
                          <span className="text-[10px] font-black text-indigo-400 block">
                            DAY {exp.day}
                          </span>
                          <span className="text-xs font-black text-slate-700">
                            {exp.spotName}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-xs font-bold text-slate-600">
                          {exp.description}
                        </td>
                        <td className="px-8 py-5 font-black text-indigo-600 text-sm">
                          {exp.currency === "JPY" ? "¥" : "$"}{" "}
                          {Number(exp.amount).toLocaleString()}
                        </td>
                        <td className="px-8 py-5">
                          <span className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[10px] font-black text-slate-500 shadow-sm">
                            {members.find((m: any) => m.id === exp.payer_id)
                              ?.name || "未設定"}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <button
                            onClick={() => setDeleteTargetId(exp.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 🚀 自定義美化版刪除確認視窗 (全尺寸通用) */}
        {deleteTargetId && (
          <div className="absolute inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white p-6 sm:p-8 rounded-[35px] shadow-2xl max-w-[320px] sm:max-w-sm w-full mx-4 text-center space-y-6 animate-in zoom-in-95">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-2xl mx-auto">
                ⚠️
              </div>
              <div className="space-y-2">
                <h4 className="text-base sm:text-lg font-black text-slate-800">
                  確定要刪除這筆費用？
                </h4>
                <p className="text-[11px] sm:text-sm text-slate-400 font-bold leading-relaxed">
                  刪除後將無法恢復，結算金額也會跟著自動重新計算喔！
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDeleteTargetId(null)}
                  className="py-3 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] sm:text-xs hover:bg-slate-200 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="py-3 bg-rose-500 text-white rounded-2xl font-black text-[10px] sm:text-xs shadow-lg shadow-rose-200 active:scale-95 transition-all"
                >
                  確定刪除
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer - 保持置底 */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-10 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-500 hover:bg-slate-100 transition-all shadow-sm"
          >
            關閉報表
          </button>
        </div>
      </div>
    </div>
  );
}
