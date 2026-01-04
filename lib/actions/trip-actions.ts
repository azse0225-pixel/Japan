"use server"; // 👈 將此檔案標註為伺服器 Actions

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from 'next/cache';

// 1. 取得旅程基本資料
export async function getTripData(tripId: string) {
	const supabase = await createSupabaseServerClient();

	// 取得目前登入的使用者
	const { data: { user } } = await supabase.auth.getUser();

	// 取得行程
	const { data: trip } = await supabase
		.from("trips")
		.select("*")
		.eq("id", tripId)
		.single();

	// ✨ 自動認領邏輯：
	// 如果 (1) 行程存在 (2) 行程目前沒主人 (3) 使用者已登入
	// 那就把它變成這個使用者的！
	if (trip && !trip.owner_id && user) {
		console.log(`🎉 發現無主行程 ${tripId}，正在自動歸戶給 ${user.email}...`);
		await supabase
			.from("trips")
			.update({ owner_id: user.id })
			.eq("id", tripId);

		// 更新本地變數，這樣回傳出去的資料就是最新的
		trip.owner_id = user.id;
	}

	// (如果是新建立的行程還沒寫入資料庫，這裡可能會是 null，這部分交給前端處理)
	return trip;
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
	const supabase = await createSupabaseServerClient(); // ✨ 加這一行
	const { data, error } = await supabase
		.from('spots')
		.select('*')
		.eq('trip_id', tripId)
		.eq('day', day)
		.order('order_index', { ascending: true });

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
export async function createNewTrip(data: { title: string; id: string; date: string; location: string }) {
	const supabase = await createSupabaseServerClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) return { success: false, message: "請先登入" };

	const { error } = await supabase.from("trips").insert({
		id: data.id,
		owner_id: user.id,
		title: data.title,
		start_date: data.date,
		location: data.location,
		days_count: 1, // 預設 1 天
	});

	if (error) {
		console.error("建立行程失敗", error);
		return { success: false, message: error.message };
	}

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
export async function getTripMembers(tripId: string) {
	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("trip_members")
		.select("*")
		.eq("trip_id", tripId)
		.order("created_at", { ascending: true });

	return data || [];
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
	involvedMembers: string[] // 誰要分攤的 ID 陣列
) {
	const supabase = await createSupabaseServerClient();
	// 如果 payerId 是空字串，轉成 null
	const finalPayerId = payerId === "" ? null : payerId;

	const { error } = await supabase
		.from("spots")
		.update({
			payer_id: finalPayerId,
			involved_members: involvedMembers
		})
		.eq("id", spotId);

	if (error) {
		console.error("更新分帳失敗:", error);
		throw error;
	}

}
// 2. 新增：取得「我的所有行程」列表
export async function getUserTrips() {
	const supabase = await createSupabaseServerClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) return [];

	const { data } = await supabase
		.from("trips")
		.select("*")
		.eq("owner_id", user.id)
		.order("created_at", { ascending: false }); // 新的在上面

	return data || [];
}

