"use client";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

export default function MemberInviteLink({
  memberId,
  currentEmail,
}: {
  memberId: string;
  currentEmail?: string;
}) {
  const [email, setEmail] = useState(currentEmail || "");
  const [isEditing, setIsEditing] = useState(!currentEmail);

  const handleSave = async () => {
    const { error } = await supabase
      .from("trip_members")
      .update({ user_email: email.toLowerCase().trim() })
      .eq("id", memberId);

    if (!error) {
      alert("綁定成功！朋友登入後就能看到行程了。");
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return <span className="text-xs text-slate-400">({email})</span>;
  }

  return (
    <div className="flex gap-2">
      <input
        className="text-xs border rounded px-2"
        placeholder="填入 Email 共享"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        onClick={handleSave}
        className="text-xs bg-orange-500 text-white px-2 rounded"
      >
        儲存
      </button>
    </div>
  );
}
