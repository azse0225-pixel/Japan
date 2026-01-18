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
  // 1. 所有的 Hook 必須放在組件的最頂層
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

  // 🚀 整理所有費用的顯示格式
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

  // 💰 計算總額
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
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-6xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative">
        {/* Header */}
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-indigo-600 text-white">
          <div className="flex flex-col">
            <h3 className="text-xl font-black italic">Trip Financial Report</h3>
            <p className="text-xs opacity-70 font-bold uppercase tracking-widest">
              行程財務與分帳管理
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold hover:bg-white/40"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* 🚀 快速記帳區 */}
          <div className="space-y-4">
            {!isAdding ? (
              <button
                onClick={() => setIsAdding(true)}
                className="w-full py-4 border-2 border-dashed border-indigo-200 rounded-[24px] text-indigo-500 font-black text-sm hover:bg-indigo-50"
              >
                + 增加一筆全行程雜支 (支援個別分帳)
              </button>
            ) : (
              <div className="p-6 bg-indigo-50 rounded-[32px] space-y-6 border border-indigo-100 animate-in fade-in slide-in-from-top-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-indigo-400 ml-2">
                      日期
                    </label>
                    <select
                      value={newExp.day}
                      onChange={(e) =>
                        setNewExp({ ...newExp, day: Number(e.target.value) })
                      }
                      className="bg-white p-3 rounded-2xl text-sm font-bold shadow-sm"
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
                      className="bg-white p-3 rounded-2xl text-sm font-bold text-indigo-600 shadow-sm"
                    >
                      <option value="JPY">JPY (¥)</option>
                      <option value="TWD">TWD ($)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 col-span-1 md:col-span-2">
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
                      className="bg-white p-3 rounded-2xl text-sm font-bold shadow-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-indigo-400 ml-2">
                      總額
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={newExp.amount}
                      className="bg-white/50 p-3 rounded-2xl text-sm font-black text-indigo-600 shadow-inner cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* 👥 成員分帳細項 (剛才被我不小心省略的區塊，補回來了！) */}
                <div className="bg-white/60 p-5 rounded-[28px] border border-indigo-100">
                  <p className="text-[10px] font-black text-slate-400 mb-4 ml-2 uppercase tracking-widest">
                    分帳明細設定
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {members.map((m: any) => {
                      const isInv = newExp.involved_members.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-2xl border transition-all",
                            isInv
                              ? "bg-white border-indigo-200 shadow-sm"
                              : "opacity-30"
                          )}
                        >
                          <button
                            onClick={() => toggleMember(m.id)}
                            className={cn(
                              "px-3 py-1 rounded-xl text-[10px] font-black",
                              isInv
                                ? "bg-indigo-500 text-white"
                                : "bg-slate-200 text-slate-500"
                            )}
                          >
                            {m.name}
                          </button>
                          {isInv && (
                            <div className="flex items-center gap-1 border-l pl-2 border-slate-100">
                              <span className="text-[10px] font-black text-slate-400">
                                {newExp.currency === "JPY" ? "¥" : "$"}
                              </span>
                              <input
                                type="number"
                                placeholder="0"
                                value={newExp.cost_breakdown[m.id] || ""}
                                onChange={(e) =>
                                  handleMemberAmountChange(m.id, e.target.value)
                                }
                                className="w-16 bg-transparent text-sm font-black text-indigo-600 outline-none"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between items-center px-2">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-black text-slate-400">
                      墊付人：
                    </label>
                    <select
                      value={newExp.payer_id}
                      onChange={(e) =>
                        setNewExp({ ...newExp, payer_id: e.target.value })
                      }
                      className="bg-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm border-none outline-none"
                    >
                      {members.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsAdding(false)}
                      className="px-6 py-2 text-xs font-bold text-slate-400"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleQuickAdd}
                      className="px-8 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100"
                    >
                      儲存支出
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 總覽卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-7 bg-slate-50 rounded-[35px] border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                全行程總支出
              </span>
              <div className="mt-3 space-y-1">
                <p className="text-3xl font-black text-indigo-600">
                  ¥ {totals.JPY.toLocaleString()}
                </p>
                <p className="text-sm font-bold text-slate-400">
                  $ {totals.TWD.toLocaleString()} TWD
                </p>
              </div>
            </div>
            {/* 個人結算概況 */}
            <div className="col-span-2 p-7 bg-slate-50 rounded-[35px] border border-slate-100 overflow-x-auto">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                個人結算概況
              </span>
              <div className="mt-4 flex gap-8">
                {settlement.map((s: any) => (
                  <div
                    key={s.id}
                    className="min-w-[120px] border-l-4 border-indigo-100 pl-5"
                  >
                    {/* 名字 */}
                    <p className="text-sm font-black text-slate-800 mb-1">
                      {s.name}
                    </p>

                    {/* 💴 日幣結算 */}
                    <p
                      className={cn(
                        "text-xs font-black",
                        s.balances.JPY >= 0
                          ? "text-emerald-500"
                          : "text-rose-400"
                      )}
                    >
                      {s.balances.JPY >= 0 ? "+" : ""}
                      {Math.round(s.balances.JPY).toLocaleString()} JPY
                    </p>

                    {/* 🚀 補上台幣結算 */}
                    <p
                      className={cn(
                        "text-[10px] font-bold opacity-80 mt-0.5", // 稍微小一點、細一點，看起來比較有層次
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

          {/* 表格清單 */}
          <div className="rounded-[40px] border border-slate-100 overflow-hidden bg-white shadow-sm">
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
                {allExpenses.map((exp: any) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 🚀 自定義美化版刪除確認視窗 */}
        {deleteTargetId && (
          <div className="absolute inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white p-8 rounded-[35px] shadow-2xl max-w-sm w-full mx-4 text-center space-y-6 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-2xl mx-auto">
                ⚠️
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-black text-slate-800">
                  確定要刪除這筆費用？
                </h4>
                <p className="text-sm text-slate-400 font-bold leading-relaxed">
                  刪除後將無法恢復，結算金額也會跟著自動重新計算喔！
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDeleteTargetId(null)}
                  className="py-3 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs hover:bg-slate-200"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="py-3 bg-rose-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-rose-200 active:scale-95"
                >
                  確定刪除
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-10 py-3 bg-white border border-slate-200 rounded-[20px] text-xs font-black text-slate-500 hover:bg-slate-100 transition-all shadow-sm"
          >
            關閉報表
          </button>
        </div>
      </div>
    </div>
  );
}
