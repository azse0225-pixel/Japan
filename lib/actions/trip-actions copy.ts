"use server"; // 👈 將此檔案標註為伺服器 Actions

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from 'next/cache';

// 1. 取得旅程基本資料 (強化版：含持有者資訊)
export async function getTripData(tripId: string) {
	const supabase = await createSupabaseServerClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) return null;

	// ✨ 核心邏輯：從成員表去撈行程，只要你在裡面，就一定能撈到關聯的 trips
	const { data, error } = await supabase
		.from("trip_members")
		.select(`
      trips (*)
    `)
		.eq("trip_id", tripId)
		.eq("user_email", user.email?.toLowerCase().trim())
		.maybeSingle();

	if (error || !data) {
		console.error("權限檢查失敗或不在成員名單內:", error?.message);
		return null;
	}

	// 回傳關聯到的完整行程資料 (包含天數 days_count)
	return data.trips;
}

// 2. 更新旅程總天數
export async function updateTripDays(tripId: string, newCount: number) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase
		.from('trips')
		.update({ days_count: newCount })
		.eq('id', tripId);

	if (error) throw error;
	revalidatePath(`/trip/${tripId}`);
}

// 3. 取得景點
export async function getSpots(tripId: string, day: number) {
	const supabase = await createSupabaseServerClient();
	const { data: { user } } = await supabase.auth.getUser();
	// ✨ 修正點：強制將傳入的 day 轉為整數 (Number)
	// 確保它跟資料庫的 int4 型別完全匹配
	const targetDay = Number(day);

	const { data, error } = await supabase
		.from("spots")
		.select("*")
		.eq("trip_id", tripId) // 這裡是 tokyo-2026
		.eq("day", targetDay)  // 這裡是 數字 2
		.order("time", { ascending: true });

	if (error) {
		console.error("❌ 抓取景點失敗:", error.message);
		return [];
	}

	// 🔍 除錯用：讓你在終端機看到底查了什麼
	console.log(`📡 查詢 Day ${targetDay}: 抓到 ${data?.length || 0} 筆`);
	console.log("🛠️ 伺服器端檢查 User Email:", user?.email);
	return data || [];
}
// 4. 新增景點（包含 category）
export async function addSpotToDB(tripId: string, name: string, day: number, lat?: number, lng?: number, category: string = 'spot', time: string = "") {
	const supabase = await createSupabaseServerClient();
	const { data: existingSpots } = await supabase.from('spots').select('id').eq('trip_id', tripId).eq('day', day);
	const nextIndex = existingSpots ? existingSpots.length : 0;

	const { error } = await supabase.from('spots').insert([{

		trip_id: tripId,
		name,
		day,
		order_index: nextIndex,
		lat,
		lng,
		category,
		time
	}]);

	if (error) throw error;
	revalidatePath(`/trip/${tripId}`);
}

// 5. 刪除景點
export async function deleteSpot(tripId: string, spotId: string) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase.from('spots').delete().eq('id', spotId);
	if (error) throw error;
	revalidatePath(`/trip/${tripId}`);
}

// 6. 更新排序（保留 category）
export async function updateSpotsOrder(tripId: string, updatedSpots: any[], day: number) {
	const supabase = await createSupabaseServerClient();
	const updates = updatedSpots.map((spot, index) => ({
		id: spot.id,
		trip_id: tripId,
		name: spot.name,
		day: day,
		order_index: index,
		lat: spot.lat,
		lng: spot.lng,
		note: spot.note,
		time: spot.time,
		category: spot.category || 'spot'
	}));
	const { error } = await supabase.from('spots').upsert(updates);
	if (error) throw error;
}

// 7. 刪除特定天數（包含景點遞補邏輯）
export async function deleteSpecificDay(tripId: string, dayToDelete: number, currentTotalDays: number) {
	const supabase = await createSupabaseServerClient();
	// 刪除該天景點
	await supabase.from('spots').delete().eq('trip_id', tripId).eq('day', dayToDelete);

	// 取得該天之後的所有景點並往前遞補一天
	const { data: laterSpots } = await supabase.from('spots').select('*').eq('trip_id', tripId).gt('day', dayToDelete);
	if (laterSpots && laterSpots.length > 0) {
		const updates = laterSpots.map(spot => ({ ...spot, day: spot.day - 1 }));
		await supabase.from('spots').upsert(updates);
	}

	// 更新總天數
	await updateTripDays(tripId, currentTotalDays - 1);
	revalidatePath(`/trip/${tripId}`);
}

// 8. 交換天數
export async function swapDays(tripId: string, dayA: number, dayB: number) {
	const supabase = await createSupabaseServerClient();
	await supabase.from('spots').update({ day: -1 }).eq('trip_id', tripId).eq('day', dayA);
	await supabase.from('spots').update({ day: dayA }).eq('trip_id', tripId).eq('day', dayB);
	await supabase.from('spots').update({ day: dayB }).eq('trip_id', tripId).eq('day', -1);
	revalidatePath(`/trip/${tripId}`);
}

// 9. 更新景點備註
export async function updateSpotNote(spotId: string, note: string) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase
		.from('spots')
		.update({ note: note })
		.eq('id', spotId);

	if (error) throw error;
}

// 10. 更新景點分類
export async function updateSpotCategory(spotId: string, category: string) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase
		.from('spots')
		.update({ category: category })
		.eq('id', spotId);
	if (error) throw error;
}

// 11. 建立全新旅程
// lib/actions/trip-actions.ts

export async function createNewTrip(data: {
	title: string;
	date: string;
	location: string;
	country_code: string
}) {
	const supabase = await createSupabaseServerClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) return { success: false, message: "請先登入" };

	// ✨ 核心優化：後端自動產生唯一 ID
	// 格式：20260104-xxxx (日期-4位隨機碼)
	const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
	const randomSuffix = Math.random().toString(36).substring(2, 6);
	const uniqueId = `${today}-${randomSuffix}`;

	// Step 1: 建立行程
	const { error: tripError } = await supabase.from("trips").insert({
		id: uniqueId, // 使用自動產生的 ID
		owner_id: user.id,
		owner_email: user.email,
		owner_name: user.user_metadata?.full_name || user.email?.split('@')[0],
		title: data.title,
		start_date: data.date,
		location: data.location,
		country_code: data.country_code,
		days_count: 1,
	});

	if (tripError) return { success: false, message: tripError.message };

	// Step 2: 把創辦人塞進成員名單
	await supabase.from("trip_members").insert({
		trip_id: uniqueId, // 記得這裡也要改用產出的 uniqueId
		user_email: user.email,
		name: user.user_metadata?.full_name || user.email?.split('@')[0]
	});

	return { success: true };
}

// 12. 更新景點時間
export async function updateSpotTime(spotId: string, time: string) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase
		.from('spots')
		.update({ time })
		.eq('id', spotId);

	if (error) {
		console.error("更新時間失敗:", error);
		throw error;
	}
}

// --- 13. 行前清單功能 ---

// 取得清單
export async function getChecklist(tripId: string) {
	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from('checklists')
		.select('*')
		.eq('trip_id', tripId)
		.order('created_at', { ascending: true });

	return data || [];
}

// 新增項目
export async function addChecklistItem(tripId: string, content: string) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase
		.from('checklists')
		.insert([{ trip_id: tripId, content }]);

	if (error) throw error;
	revalidatePath(`/trip/${tripId}`);
}

// 切換勾選狀態
export async function toggleChecklistItem(itemId: string, isChecked: boolean) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase
		.from('checklists')
		.update({ is_checked: isChecked })
		.eq('id', itemId);

	if (error) throw error;
}

// 刪除項目
export async function deleteChecklistItem(itemId: string) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase
		.from('checklists')
		.delete()
		.eq('id', itemId);

	if (error) throw error;
}

// --- 14. 更新交通方式 ---
export async function updateSpotTransportMode(spotId: string, mode: 'WALKING' | 'TRANSIT') {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase
		.from('spots')
		.update({ transport_mode: mode })
		.eq('id', spotId);

	if (error) throw error;
}

// --- 15. 更新預算與花費 ---
export async function updateSpotCost(


	spotId: string,
	estimated: number,
	actual: number
) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase
		.from("spots")
		.update({ estimated_cost: estimated, actual_cost: actual })
		.eq("id", spotId);

	if (error) console.error("更新費用失敗", error);
}

// --- 16. 批次更新順序 ---
export async function updateSpotBatchOrder(
	updates: { id: string; time: string }[]
) {
	const supabase = await createSupabaseServerClient();

	const promises = updates.map((u) =>
		supabase.from("spots").update({ time: u.time }).eq("id", u.id)
	);

	await Promise.all(promises);
}

// --- 17. 上傳附件 (票券收納) ---
export async function uploadSpotAttachment(spotId: string, formData: FormData) {
	const supabase = await createSupabaseServerClient();
	const file = formData.get("file") as File;
	if (!file) return;

	// ❌ 移除: const supabase = createClient();
	// ✅ 直接使用上方的 supabase
	const fileName = `${spotId}/${Date.now()}-${file.name}`; // 檔名：ID/時間-檔名

	// 1. 上傳到 Storage
	const { data: uploadData, error: uploadError } = await supabase.storage
		.from("trip-assets")
		.upload(fileName, file);

	if (uploadError) {
		console.error("上傳失敗:", uploadError);
		throw uploadError;
	}

	// 2. 取得公開連結
	const { data: publicUrlData } = supabase.storage
		.from("trip-assets")
		.getPublicUrl(fileName);

	const publicUrl = publicUrlData.publicUrl;

	// 3. 更新資料庫 (將 URL 加入陣列)
	// 先把舊的抓出來
	const { data: spot } = await supabase.from("spots").select("attachments").eq("id", spotId).single();
	const currentAttachments = spot?.attachments || [];
	const newAttachments = [...currentAttachments, publicUrl];

	const { error: dbError } = await supabase
		.from("spots")
		.update({ attachments: newAttachments })
		.eq("id", spotId);

	if (dbError) throw dbError;
	return publicUrl;
}

// --- 18. 刪除附件 ---
export async function deleteSpotAttachment(spotId: string, fileUrl: string) {
	const supabase = await createSupabaseServerClient();
	// ❌ 移除: const supabase = createClient();

	// 1. 從資料庫陣列移除
	const { data: spot } = await supabase.from("spots").select("attachments").eq("id", spotId).single();
	const newAttachments = (spot?.attachments || []).filter((url: string) => url !== fileUrl);

	await supabase.from("spots").update({ attachments: newAttachments }).eq("id", spotId);

	// 2. (選做) 從 Storage 刪除檔案，這裡暫時略過，避免誤刪
}
// ... (前面保持不變)

// --- 19. 分帳成員管理 (Expense Splitter) ---

// 取得成員名單
// 取得成員名單 (修正版)
export async function getTripMembers(tripId: string) {
	const supabase = await createSupabaseServerClient();
	const { data: { user: authUser } } = await supabase.auth.getUser();

	// 1. 移除 profiles(full_name) 關聯，避免因為沒 profile 而抓不到人
	//    加入 trips(owner_id, owner_email) 確保判定更精準
	const { data, error } = await supabase
		.from("trip_members")
		.select(`
            *,
            trips (owner_id, owner_email)
        `)
		.eq("trip_id", tripId)
		.order("created_at", { ascending: true });

	if (error) {
		console.error("getTripMembers Error:", error.message);
		return [];
	}

	// 如果 data 是空的，代表資料庫真的沒這幾筆，或是 RLS 擋住了
	if (!data || data.length === 0) {
		console.log(`📡 [Server Action] 行程 ${tripId} 找不到任何成員`);
		return [];
	}

	return data.map(m => {
		const trip = m.trips as any;

		// ✨ 判定持有者：
		// 比對資料庫 trips 表的 owner_id，或是比對 owner_email (當初建立的人)
		const isThisRowOwner =
			trip?.owner_id === authUser?.id ||
			(m.user_email && m.user_email.toLowerCase() === trip?.owner_email?.toLowerCase());

		return {
			...m,
			// ✨ 如果沒有名字，就自動抓 Email 前綴當名字，絕對不會變空白
			name: m.name || m.user_email?.split('@')[0] || "新成員",
			isOwner: isThisRowOwner,
			isMe: authUser?.email?.toLowerCase() === m.user_email?.toLowerCase()
		};
	});
}

// 新增成員
export async function addTripMember(tripId: string, name: string) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase
		.from("trip_members")
		.insert([{ trip_id: tripId, name }]);

	if (error) throw error;
	revalidatePath(`/trip/${tripId}`);
}

// 刪除成員
export async function deleteTripMember(memberId: string, tripId: string) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase
		.from("trip_members")
		.delete()
		.eq("id", memberId);

	if (error) throw error;
	revalidatePath(`/trip/${tripId}`);
}

// --- 20. 更新分帳資訊 (誰付錢 / 分給誰) ---
export async function updateSpotSplit(
	spotId: string,
	payerId: string | null,
	// ✨ 修改點：將類型改為 any，以同時支援 ID 陣列 [] 或 金額物件 {}
	involvedMembers: any
) {
	const supabase = await createSupabaseServerClient();

	// 如果 payerId 是空字串，轉成 null
	const finalPayerId = payerId === "" ? null : payerId;

	const { error } = await supabase
		.from("spots")
		.update({
			payer_id: finalPayerId,
			// Supabase 的 JSONB 欄位會自動識別傳進去的是陣列還是物件
			involved_members: involvedMembers
		})
		.eq("id", spotId);

	if (error) {
		console.error("更新分帳失敗:", error);
		throw error;
	}

	// 如果你有使用 Next.js 的快取機制，建議加上這行來即時更新畫面
	// revalidatePath(`/trip/${tripId}`); 
}
// 2. 新增：取得「我的所有行程」列表
export async function getUserTrips() {
	const supabase = await createSupabaseServerClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) return [];

	const email = user.email?.toLowerCase().trim();

	// 1. 同時抓取兩個來源：我是擁有者、我是成員
	const [ownedResponse, memberResponse] = await Promise.all([
		supabase.from("trips").select("*").eq("owner_id", user.id),
		supabase.from("trip_members").select("trips (*)").eq("user_email", email)
	]);

	// 2. 整理「我創辦的」
	const ownedTrips = ownedResponse.data || [];

	// 3. 整理「我參與的」 (從關聯的 trips 欄位取回)
	const participatedTrips = (memberResponse.data || [])
		.map((m: any) => m.trips)
		.filter(Boolean);

	// 4. ✨ 核心去重：使用 Map 確保 ID 唯一
	const uniqueTripsMap = new Map();
	[...ownedTrips, ...participatedTrips].forEach((trip: any) => {
		if (!uniqueTripsMap.has(trip.id)) {
			uniqueTripsMap.set(trip.id, trip);
		}
	});

	// 5. 排序並轉回陣列回傳
	return Array.from(uniqueTripsMap.values()).sort(
		(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
	);
}

// 更新行程資訊
export async function updateTripDetails(
	tripId: string,
	data: { title?: string; location?: string; image_url?: string; start_date?: string; country_code?: string }
) {
	const supabase = await createSupabaseServerClient();

	const { error } = await supabase
		.from("trips")
		.update(data) // ✨ 這裡會自動對應傳進來的 country_code
		.eq("id", tripId);

	if (error) {
		console.error("❌ 更新失敗:", error.message);
		return { success: false, message: error.message };
	}

	return { success: true };
}
// --- 新增：更新成員 Email (用於共享) ---
export async function updateTripMemberEmail(memberId: string, email: string) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase
		.from("trip_members")
		.update({ user_email: email.toLowerCase().trim() })
		.eq("id", memberId);

	if (error) throw error;
	// 不需要 revalidatePath，因為 ItineraryList 有 Realtime 監聽
}
// --- 21. 使用者個人資料管理 ---
export async function updateUserNickname(nickname: string, tripId?: string) {
	const supabase = await createSupabaseServerClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) return { success: false, message: "找不到使用者" };

	const newName = nickname.trim();

	// --- 1. 更新 Auth 資料 (針對已註冊使用者的「源頭」) ---
	// 即使失敗也繼續往下走，因為可能該使用者是用特殊方式登入
	const { error: authError } = await supabase.auth.updateUser({
		data: { full_name: newName }
	});
	if (authError) console.warn("Auth 更新提醒:", authError.message);

	// --- 2. 更新 trip_members (針對「算錢/顯示」的直接來源) ---
	// 只要你的 Email 在成員名單內，就把所有相關行程的名片名字都改掉
	const { error: memberError } = await supabase
		.from("trip_members")
		.update({ name: newName })
		.eq("user_email", user.email?.toLowerCase().trim());

	if (memberError) {
		console.error("更新成員表失敗:", memberError.message);
		return { success: false, message: memberError.message };
	}

	// 如果有傳入 tripId，就刷新該頁面快取
	if (tripId) revalidatePath(`/trip/${tripId}`);

	return { success: true, name: newName };
}
// 刪除旅途
export async function deleteTrip(tripId: string) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase.from("trips").delete().eq("id", tripId);
	if (error) return { success: false, message: error.message };
	return { success: true };
}