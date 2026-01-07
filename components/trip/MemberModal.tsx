// components/trip/MemberModal.tsx
interface Props {
  isOpen: boolean;
  onClose: () => void;
  members: any[];
  settlement: any[];
  newMemberName: string;
  setNewMemberName: (val: string) => void;
  onAddMember: () => void;
  onDeleteMember: (id: string) => void;
}

export default function MemberModal({
  isOpen,
  onClose,
  members,
  settlement,
  newMemberName,
  setNewMemberName,
  onAddMember,
  onDeleteMember,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-[40px] p-8 w-full max-w-md shadow-2xl h-[85vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">
            📊 成員與分帳
          </h3>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-slate-600 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {members.map((m) => (
            <div
              key={m.id}
              className="bg-slate-50 p-4 rounded-3xl flex justify-between items-center border border-slate-100"
            >
              <span className="font-black text-slate-700">{m.name}</span>
              {!m.isOwner && (
                <button
                  onClick={() => onDeleteMember(m.id)}
                  className="text-slate-300 hover:text-red-500 text-[10px] font-bold"
                >
                  移除
                </button>
              )}
            </div>
          ))}

          <div className="mt-4 p-4 bg-orange-50 rounded-3xl border-2 border-dashed border-orange-100 flex gap-2">
            <input
              type="text"
              placeholder="成員名稱"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="bg-white rounded-xl px-4 py-2 text-sm flex-1 font-bold outline-none border border-orange-100"
            />
            <button
              onClick={onAddMember}
              className="bg-orange-500 text-white px-4 py-2 rounded-xl font-black shadow-md"
            >
              +
            </button>
          </div>
        </div>

        <div className="mt-6 bg-slate-900 rounded-[32px] p-6 text-white overflow-y-auto max-h-[40%]">
          <h4 className="text-[9px] font-black text-slate-500 uppercase mb-4 text-center tracking-[4px]">
            Settlement
          </h4>
          {settlement.map((m) => (
            <div
              key={m.id}
              className="flex justify-between items-center bg-white/5 p-3 rounded-2xl mb-2 border border-white/5"
            >
              <span className="font-bold text-xs">{m.name}</span>
              <span
                className={`font-mono font-bold text-sm ${
                  m.balance >= 0 ? "text-emerald-400" : "text-rose-400"
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
  );
}
