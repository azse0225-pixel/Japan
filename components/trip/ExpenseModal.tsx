// components/trip/ExpenseModal.tsx
"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// 定義成員類型，解決 'any' 報錯問題
interface Member {
  id: string;
  name: string;
}

export function ExpenseModal({ isOpen, onClose, spot, members, onSave }: any) {
  const [localList, setLocalList] = useState<any[]>(spot.expense_list || []);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalList(spot.expense_list || []);
      setShowSummary(false);
    }
  }, [isOpen, spot.expense_list]);

  if (!isOpen) return null;

  const handleUpdate = (id: string, field: string, value: any) => {
    setLocalList((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp))
    );
  };

  // components/trip/ExpenseModal.tsx 內部

  const handleMemberAmountChange = (
    expId: string,
    memberId: string,
    value: string
  ) => {
    const memberAmount = value === "" ? 0 : Number(value);

    setLocalList((prev) =>
      prev.map((exp) => {
        if (exp.id === expId) {
          // 1. 先更新細分清單
          const newBreakdown = {
            ...(exp.cost_breakdown || {}),
            [memberId]: memberAmount,
          };

          // 2. 🚀 自動加總：將所有成員的細分金額加起來，變成這筆消費的總額
          const newTotalAmount = Object.values(newBreakdown).reduce(
            (sum: number, val: any) => sum + (Number(val) || 0),
            0
          );

          return {
            ...exp,
            amount: newTotalAmount, // 自動更新主金額
            cost_breakdown: newBreakdown,
          };
        }
        return exp;
      })
    );
  };

  const toggleMember = (expId: string, memberId: string) => {
    setLocalList((prev) =>
      prev.map((exp) => {
        if (exp.id === expId) {
          const inv = exp.involved_members || [];
          const isRemoving = inv.includes(memberId);
          const newInv = isRemoving
            ? inv.filter((i: string) => i !== memberId)
            : [...inv, memberId];

          const newBreakdown = { ...(exp.cost_breakdown || {}) };
          if (isRemoving) delete newBreakdown[memberId];

          return {
            ...exp,
            involved_members: newInv,
            cost_breakdown: newBreakdown,
          };
        }
        return exp;
      })
    );
  };

  // 🚀 計算單站結算邏輯
  const calculateSettlement = () => {
    const summary: any = {};
    members.forEach((m: Member) => (summary[m.id] = { JPY: 0, TWD: 0 }));

    localList.forEach((exp) => {
      const amount = Number(exp.amount) || 0;
      const inv = exp.involved_members || [];
      const curr = exp.currency || "JPY";
      const breakdown = exp.cost_breakdown || {};

      if (amount <= 0 || inv.length === 0) return;

      inv.forEach((mId: string) => {
        if (summary[mId]) {
          // 如果有手打金額則用手打的，否則平分
          const memberCost =
            breakdown[mId] !== undefined
              ? Number(breakdown[mId])
              : amount / inv.length;
          summary[mId][curr] -= memberCost;
        }
      });

      if (exp.payer_id && summary[exp.payer_id]) {
        summary[exp.payer_id][curr] += amount;
      }
    });
    return summary;
  };

  const settlement = calculateSettlement();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-indigo-50/30">
          <h3 className="text-xl font-black text-slate-800">
            費用明細：{spot.name}
          </h3>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-slate-400 hover:text-red-500"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!showSummary ? (
            <div className="min-w-[800px]">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-2">消費項目</th>
                    <th className="px-4 py-2 w-40">金額/幣別</th>
                    <th className="px-4 py-2 w-32">墊付人</th>
                    <th className="px-4 py-2">分帳細節</th>
                    <th className="px-4 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {localList.map((exp) => (
                    <tr
                      key={exp.id}
                      className="bg-slate-50/50 rounded-2xl align-top"
                    >
                      <td className="px-4 py-4 rounded-l-2xl">
                        <input
                          type="text"
                          value={exp.description || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdate(exp.id, "description", val);
                          }}
                          onFocus={(e) => e.target.select()}
                          className="bg-transparent border-none outline-none font-bold text-slate-700 w-full"
                          placeholder="描述..."
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {/* 1. 幣別切換選單 */}
                          <select
                            value={exp.currency || "JPY"}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdate(exp.id, "currency", val);
                            }}
                            className="bg-white border border-slate-200 rounded-lg px-1 py-1 text-[10px] font-black outline-none cursor-pointer shrink-0"
                          >
                            <option value="JPY">¥</option>
                            <option value="TWD">$</option>
                          </select>

                          {/* 2. 檢查邏輯與金額輸入 */}
                          {(() => {
                            const breakdownSum: number = (
                              Object.values(exp.cost_breakdown || {}) as (
                                | number
                                | string
                              )[]
                            ).reduce(
                              (acc: number, val: number | string) =>
                                acc + (Number(val) || 0),
                              0
                            );

                            // 🚀 2. 判定邏輯保持不變
                            const isUnbalanced =
                              exp.amount > 0 &&
                              Math.abs(breakdownSum - exp.amount) > 0.1;
                            return (
                              <div className="relative flex-1">
                                <input
                                  type="number"
                                  value={exp.amount === 0 ? "" : exp.amount}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const parsedValue =
                                      val === "" ? 0 : parseFloat(val);
                                    handleUpdate(
                                      exp.id,
                                      "amount",
                                      isNaN(parsedValue) ? 0 : parsedValue
                                    );
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  className={cn(
                                    "bg-transparent border-none outline-none font-black w-full transition-all duration-300",
                                    // 🚀 動態變色：不平衡時閃爍紅色，平衡時顯示靛藍色
                                    isUnbalanced
                                      ? "text-rose-500 animate-pulse"
                                      : "text-indigo-600"
                                  )}
                                />

                                {/* 🚀 提示標籤：僅在不平衡時浮現 */}
                                {isUnbalanced && (
                                  <div className="absolute -bottom-5 left-0 flex items-center gap-1 whitespace-nowrap animate-in fade-in slide-in-from-top-1">
                                    <span className="text-[8px] font-black bg-rose-100 text-rose-500 px-1.5 py-0.5 rounded-md shadow-sm">
                                      分配總和: {breakdownSum.toLocaleString()}{" "}
                                      (未對齊)
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={exp.payer_id}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdate(exp.id, "payer_id", val);
                          }}
                          className="bg-white border border-slate-100 rounded-lg px-2 py-1 text-xs font-bold text-slate-600 outline-none w-full"
                        >
                          <option value="">選擇...</option>
                          {members.map((m: Member) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {members.map((m: Member) => {
                            const isChecked = exp.involved_members?.includes(
                              m.id
                            );
                            const individualAmount = exp.cost_breakdown?.[m.id];
                            return (
                              <div
                                key={m.id}
                                className={cn(
                                  "flex items-center gap-2 p-1.5 rounded-xl border transition-all",
                                  isChecked
                                    ? "bg-white border-indigo-200 shadow-sm"
                                    : "opacity-30"
                                )}
                              >
                                <button
                                  onClick={() => toggleMember(exp.id, m.id)}
                                  className={cn(
                                    "px-2 py-1 rounded-lg text-[10px] font-black",
                                    isChecked
                                      ? "bg-indigo-500 text-white"
                                      : "bg-slate-200 text-slate-500"
                                  )}
                                >
                                  {m.name}
                                </button>
                                {isChecked && (
                                  <div className="flex items-center border-l border-slate-100 pl-2">
                                    <span className="text-[8px] text-slate-400 mr-1">
                                      {exp.currency === "JPY" ? "¥" : "$"}
                                    </span>
                                    <input
                                      type="number"
                                      value={
                                        individualAmount !== undefined
                                          ? individualAmount
                                          : ""
                                      }
                                      placeholder="平分"
                                      onChange={(e) =>
                                        handleMemberAmountChange(
                                          exp.id,
                                          m.id,
                                          e.target.value
                                        )
                                      }
                                      className="w-14 bg-transparent text-[10px] font-bold text-indigo-600 outline-none"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-4 rounded-r-2xl">
                        <button
                          onClick={() =>
                            setLocalList((prev) =>
                              prev.filter((e) => e.id !== exp.id)
                            )
                          }
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={() =>
                  setLocalList([
                    ...localList,
                    {
                      id: crypto.randomUUID(),
                      description: "",
                      amount: 0,
                      currency: "JPY",
                      payer_id: members[0]?.id || "",
                      involved_members: members.map((m: Member) => m.id),
                      cost_breakdown: {},
                    },
                  ])
                }
                className="w-full mt-4 py-4 border-2 border-dashed border-indigo-50 rounded-[24px] text-indigo-300 text-xs font-black"
              >
                + 新增明細
              </button>
            </div>
          ) : (
            /* 📊 總計畫面 */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
              {members.map((m: Member) => (
                <div
                  key={m.id}
                  className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex justify-between items-center"
                >
                  <span className="font-black text-slate-700">{m.name}</span>
                  <div className="text-right">
                    {["JPY", "TWD"].map((curr) => (
                      <div
                        key={curr}
                        className={cn(
                          "text-sm font-black",
                          settlement[m.id][curr] >= 0
                            ? "text-emerald-500"
                            : "text-rose-400"
                        )}
                      >
                        {settlement[m.id][curr] >= 0 ? "+" : ""}
                        {Math.round(
                          settlement[m.id][curr]
                        ).toLocaleString()}{" "}
                        {curr}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50/50 flex gap-4">
          <button
            onClick={() => setShowSummary(!showSummary)}
            className="flex-1 py-4 bg-white border border-indigo-100 rounded-2xl text-xs font-black text-indigo-500"
          >
            {showSummary ? "⬅ 返回編輯" : "📊 查看本站分帳總結"}
          </button>
          <button
            onClick={() => {
              onSave(spot.id, localList);
              onClose();
            }}
            className="flex-1 py-4 bg-indigo-600 rounded-2xl text-xs font-black text-white shadow-lg"
          >
            儲存變更並關閉
          </button>
        </div>
      </div>
    </div>
  );
}
