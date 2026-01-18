//lib/actions/trip-actions.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from 'next/cache';

// ==========================================
// 1. 旅程基本管理 (Trips)
// ==========================================

export async function getTripData(tripId: string) {
	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("trips")
		.select("*")
		.eq("id", tripId)
		.maybeSingle();
	if (error || !data) {
		console.error("找不到行程:", error?.message);
		return null;
	}
	return data;
}

export async function createNewTrip(data: {
	title: string;
	date: string;
	location: string;
	country_code: string
}) {
	const supabase = await createSupabaseServerClient();
	const { data: { user } } = await supabase.auth.getUser();

	const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
	const randomSuffix = Math.random().toString(36).substring(2, 6);
	const uniqueId = `${today}-${randomSuffix}`;

	const { error: tripError } = await supabase.from("trips").insert({
		id: uniqueId,
		owner_id: user?.id || null, // 只保留 ID，名字跟 Email 去 profiles 查
		title: data.title,
		start_date: data.date,
		location: data.location,
		country_code: data.country_code,
		days_count: 1,
	});

	if (tripError) return { success: false, message: tripError.message };
	return { success: true, id: uniqueId };
}

// ✨ 補回首頁需要的：取得我的所有行程 (含去重邏輯)
export async function getUserTrips() {
	const supabase = await createSupabaseServerClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) return [];

	// 直接用 user_id 查，比 email 更安全穩定
	const [ownedResponse, memberResponse] = await Promise.all([
		supabase.from("trips").select("*").eq("owner_id", user.id),
		supabase.from("trip_members").select("trips (*)").eq("user_id", user.id)
	]);
	const ownedTrips = ownedResponse.data || [];
	const participatedTrips = (memberResponse.data || [])
		.map((m: any) => m.trips)
		.filter(Boolean);

	// 核心去重
	const uniqueTripsMap = new Map();
	[...ownedTrips, ...participatedTrips].forEach((trip: any) => {
		if (!uniqueTripsMap.has(trip.id)) {
			uniqueTripsMap.set(trip.id, trip);
		}
	});

	return Array.from(uniqueTripsMap.values()).sort(
		(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
	);
}

export async function getTripsByIds(ids: string[]) {
	if (!ids || ids.length === 0) return [];
	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("trips")
		.select("*")
		.in("id", ids)
		.order("created_at", { ascending: false });
	return data || [];
}

export async function updateTripDetails(tripId: string, data: any) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase.from("trips").update(data).eq("id", tripId);
	if (error) {
		console.error("❌ 更新失敗:", error.message);
		return { success: false, message: error.message };
	}
	revalidatePath(`/trip/${tripId}`);
	return { success: true };
}

// 修改後的 updateTripDays
export async function updateTripDays(tripId: string, newCount: number) {
	const supabase = await createSupabaseServerClient();

	// 💡 增加 select() 並查看回傳的 data
	const { data, error, count } = await supabase
		.from('trips')
		.update({ days_count: newCount })
		.eq('id', tripId)
		.select(); // 👈 加上 select() 會讓它回傳更新後的資料

	if (error) {
		console.error("更新出錯:", error.message);
		throw error;
	}

	// 💡 檢查有沒有資料被更新
	if (!data || data.length === 0) {
		console.warn("⚠️ 更新成功但沒有資料受影響，請檢查 ID 是否正確或 RLS 政策");
		// 如果沒更新到，我們手動拋出錯誤讓前端回滾
		throw new Error("No rows updated");
	}

	revalidatePath(`/trip/${tripId}`);
}

export async function deleteTrip(tripId: string) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase.from("trips").delete().eq("id", tripId);
	if (error) return { success: false, message: error.message };
	return { success: true };
}

// ==========================================
// 2. 景點編輯與排序 (Spots)
// ==========================================
export async function getSpots(tripId: string, day?: number) {
	const supabase = await createSupabaseServerClient();
	let query = supabase
		.from("spots")
		.select("*, expenses(*)")
		.eq("trip_id", tripId);

	if (day !== undefined && day !== null) {
		query = query.eq("day", Number(day));
	}

	const { data, error } = await query
		.order("day", { ascending: true })
		.order("time", { ascending: true })
		.order("order_index", { ascending: true });

	if (error) {
		console.error("抓取地點失敗:", error.message);
		return [];
	}
	return (data || []).map(spot => {
		const expenses = spot.expenses || [];
		const totalActual = expenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
		return {
			...spot,
			expense_list: expenses.map((e: any) => ({
				...e,
				description: e.title // 資料庫存 title，前端顯示 description
			})),
			actual_cost: totalActual
		};
	});
}

export async function addSpotToDB(
	tripId: string,
	name: string,
	day: number,
	lat?: number,
	lng?: number,
	place_id: string = "", // 👈 關鍵：新增這個參數
	category: string = 'spot',
	time: string = ""
) {
	const supabase = await createSupabaseServerClient();

	// 取得現有景點數量來決定 order_index
	const { data: existingSpots } = await supabase
		.from('spots')
		.select('id')
		.eq('trip_id', tripId)
		.eq('day', day);

	const nextIndex = existingSpots ? existingSpots.length : 0;

	// 🚀 寫入資料庫：記得把 place_id 塞進去
	const { error } = await supabase.from('spots').insert([{
		trip_id: tripId,
		name,
		day,
		order_index: nextIndex,
		lat,
		lng,
		place_id, // 👈 關鍵：這裡要把值寫進資料庫欄位
		category,
		time
	}]);
	if (error) {
		console.error("❌ 新增景點失敗:", error.message);
		throw error;
	}
	revalidatePath(`/trip/${tripId}`);
}

// lib/actions/trip-actions.ts

export async function deleteSpot(tripId: string, spotId: string) {
	const supabase = await createSupabaseServerClient();

	// 🚀 1. 優先刪除與此景點關聯的所有費用記錄
	// 這樣分帳報表（TripSummaryModal）才會即時扣除這些金額
	const { error: expenseError } = await supabase
		.from('expenses')
		.delete()
		.eq('spot_id', spotId);

	if (expenseError) {
		// 如果費用刪除失敗，我們記錄錯誤，但通常還是會繼續嘗試刪除景點
		console.error("❌ 刪除關聯費用失敗:", expenseError.message);
	}

	// 🚀 2. 接著刪除景點本身
	const { error: spotError } = await supabase
		.from('spots')
		.delete()
		.eq('id', spotId);

	if (spotError) {
		console.error("❌ 刪除景點失敗:", spotError.message);
		throw spotError;
	}

	// 🚀 3. 重新驗證頁面快取，讓前端畫面（包含分帳金額）同步刷新
	revalidatePath(`/trip/${tripId}`);
}

export async function updateSpotBatchOrder(updates: { id: string; time: string }[]) {
	const supabase = await createSupabaseServerClient();
	const promises = updates.map((u) =>
		supabase.from("spots").update({ time: u.time }).eq("id", u.id)
	);
	await Promise.all(promises);
}

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
	revalidatePath(`/trip/${tripId}`);
}

// ==========================================
// 3. 進階景點屬性
// ==========================================

export async function updateSpotNote(spotId: string, note: string) {
	const supabase = await createSupabaseServerClient();
	await supabase.from('spots').update({ note }).eq('id', spotId);
}

export async function updateSpotCategory(spotId: string, category: string) {
	const supabase = await createSupabaseServerClient();
	await supabase.from('spots').update({ category }).eq('id', spotId);
}

export async function updateSpotTime(spotId: string, time: string) {
	const supabase = await createSupabaseServerClient();
	await supabase.from('spots').update({ time }).eq('id', spotId);
}

export async function updateSpotTransportMode(spotId: string, mode: 'WALKING' | 'TRANSIT') {
	const supabase = await createSupabaseServerClient();
	await supabase.from('spots').update({ transport_mode: mode }).eq('id', spotId);
}

export async function updateSpotExpenseList(tripId: string, spotId: string, expenseList: any[]) {
	const supabase = await createSupabaseServerClient();
	const { error: deleteError } = await supabase
		.from('expenses')
		.delete()
		.eq('spot_id', spotId);

	if (deleteError) {
		console.error("❌ 刪除舊費用失敗:", deleteError.message);
		throw deleteError;
	}
	const insertData = expenseList.map(exp => {
		const breakdown = exp.cost_breakdown || {};
		const calculatedAmount = Object.values(breakdown).reduce(
			(sum: number, val: any) => sum + (Number(val) || 0),
			0
		);
		return {
			trip_id: tripId,
			spot_id: spotId,
			title: exp.description || '未命名消費',
			// 如果有計算出細項金額，就用計算的，否則才用原本的 amount
			amount: calculatedAmount > 0 ? calculatedAmount : (Number(exp.amount) || 0),
			currency: exp.currency || 'JPY',
			payer_id: exp.payer_id || null,
			involved_members: exp.involved_members || [],
			cost_breakdown: breakdown
		};
	});
	// 3. 批量寫入新的費用
	if (insertData.length > 0) {
		const { error: insertError } = await supabase
			.from('expenses')
			.insert(insertData);

		if (insertError) {
			console.error("❌ 寫入新費用失敗:", insertError.message);
			throw insertError;
		}
	}

	revalidatePath(`/trip/${tripId}`);
}
// ==========================================
// 4. 天數與附件
// ==========================================

export async function deleteSpecificDay(tripId: string, dayToDelete: number, currentTotalDays: number) {
	const supabase = await createSupabaseServerClient();
	await supabase.from('spots').delete().eq('trip_id', tripId).eq('day', dayToDelete);
	const { data: laterSpots } = await supabase.from('spots').select('*').eq('trip_id', tripId).gt('day', dayToDelete);
	if (laterSpots && laterSpots.length > 0) {
		const updates = laterSpots.map(spot => ({ ...spot, day: spot.day - 1 }));
		await supabase.from('spots').upsert(updates);
	}
	await supabase.from('trips').update({ days_count: currentTotalDays - 1 }).eq('id', tripId);
	revalidatePath(`/trip/${tripId}`);
}

export async function uploadSpotAttachment(spotId: string, formData: FormData) {
	const supabase = await createSupabaseServerClient();
	const file = formData.get("file") as File;
	if (!file) return;
	const fileName = `${spotId}/${Date.now()}-${file.name}`;
	const { error: uploadError } = await supabase.storage.from("trip-assets").upload(fileName, file);
	if (uploadError) throw uploadError;
	const { data: { publicUrl } } = supabase.storage.from("trip-assets").getPublicUrl(fileName);
	const { data: spot } = await supabase.from("spots").select("attachments").eq("id", spotId).single();
	const newAttachments = [...(spot?.attachments || []), publicUrl];
	await supabase.from("spots").update({ attachments: newAttachments }).eq("id", spotId);
	return publicUrl;
}

export async function deleteSpotAttachment(spotId: string, fileUrl: string) {
	const supabase = await createSupabaseServerClient();
	const { data: spot } = await supabase.from("spots").select("attachments").eq("id", spotId).single();
	const newAttachments = (spot?.attachments || []).filter((url: string) => url !== fileUrl);
	await supabase.from("spots").update({ attachments: newAttachments }).eq("id", spotId);
}

// ==========================================
// 5. 成員管理
// ==========================================

export async function getTripMembers(tripId: string, localMemberId?: string) {
	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase.from("trip_members").select(`*`).eq("trip_id", tripId).order("created_at", { ascending: true });
	if (error) return [];
	return data.map(m => ({ ...m, isMe: localMemberId ? m.id === localMemberId : false }));
}

export async function addTripMember(tripId: string, name: string) {
	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase.from("trip_members").insert([{ trip_id: tripId, name }]).select().single();
	if (error) throw error;
	revalidatePath(`/trip/${tripId}`);
	return data;
}

export async function deleteTripMember(memberId: string, tripId: string) {
	const supabase = await createSupabaseServerClient();
	await supabase.from("trip_members").delete().eq("id", memberId);
	revalidatePath(`/trip/${tripId}`);
}

export async function updateUserNickname(nickname: string, tripId?: string) {
	const supabase = await createSupabaseServerClient();
	if (tripId) revalidatePath(`/trip/${tripId}`);
	return { success: true, name: nickname };
}

export async function updateTripMemberEmail(memberId: string, email: string) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase.from("trip_members").update({ user_email: email.toLowerCase().trim() }).eq("id", memberId);
	if (error) throw error;
}

// ==========================================
// 6. 行前清單 (Checklist) - 修改後版本
// ==========================================

export async function getChecklist(tripId: string) {
	const supabase = await createSupabaseServerClient();
	// 這裡抓取全團清單，前端會負責根據 member_id 過濾
	const { data } = await supabase
		.from('checklists')
		.select('*')
		.eq('trip_id', tripId)
		.order('created_at', { ascending: true });
	return data || [];
}

// 🚀 修改重點：加入 memberId 參數
export async function addChecklistItem(tripId: string, content: string, memberId: string) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase
		.from('checklists')
		.insert([{
			trip_id: tripId,
			content,
			member_id: memberId // 存入是誰的清單
		}]);
	if (error) throw error;
	revalidatePath(`/trip/${tripId}`);
}

export async function toggleChecklistItem(itemId: string, isChecked: boolean) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase.from('checklists').update({ is_checked: isChecked }).eq('id', itemId);
	if (error) throw error;
}

export async function deleteChecklistItem(itemId: string, tripId: string) {
	const supabase = await createSupabaseServerClient();
	await supabase.from('checklists').delete().eq('id', itemId);
	revalidatePath(`/trip/${tripId}`);
}
// ==========================================
// 7. 費用管理 (Expenses) - 全新加入
// ==========================================

// 取得該行程所有費用 (可選是否過濾特定景點)
export async function getExpenses(tripId: string, spotId?: string) {
	const supabase = await createSupabaseServerClient();
	let query = supabase.from("expenses").select("*").eq("trip_id", tripId);

	if (spotId) {
		query = query.eq("spot_id", spotId);
	}

	const { data, error } = await query.order("created_at", { ascending: false });
	return data || [];
}

// 新增費用 (預設金額為 0)
export async function addExpense(expenseData: {
	trip_id: string;
	spot_id?: string;
	title: string;
	amount: number;
	payer_id: string;
	involved_members: string[];
}) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase.from("expenses").insert([{
		...expenseData,
		amount: expenseData.amount || 0, // 確保預設是 0
		involved_members: expenseData.involved_members || []
	}]);

	if (error) throw error;
	revalidatePath(`/trip/${expenseData.trip_id}`);
}
export async function addTripLevelExpense(data: {
	trip_id: string;
	day: number;
	title: string;
	amount: number;
	currency: string;
	payer_id: string;
	involved_members: string[];
	cost_breakdown?: any;
	is_settled?: boolean; // 🚀 新增這行
}) {
	const supabase = await createSupabaseServerClient();

	const { error } = await supabase.from("expenses").insert([{
		...data,
		amount: Number(data.amount) || 0,
		cost_breakdown: data.cost_breakdown || {},
		is_settled: data.is_settled || false // 🚀 寫入資料庫
	}]);

	if (error) throw error;
	revalidatePath(`/trip/${data.trip_id}`);
}
export async function toggleExpenseSettled(expenseId: string, isSettled: boolean, tripId: string) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase
		.from("expenses")
		.update({ is_settled: isSettled })
		.eq("id", expenseId);

	if (error) throw error;
	revalidatePath(`/trip/${tripId}`);
}
export async function getAllTripExpenses(tripId: string) {
	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("expenses")
		.select("*")
		.eq("trip_id", tripId)
		.order("day", { ascending: true }); // 按天數排好

	if (error) return [];
	return data;
}
// 刪除費用
export async function deleteExpense(expenseId: string, tripId: string) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase
		.from("expenses")
		.delete()
		.eq("id", expenseId);
	if (error) {
		console.error("❌ 刪除費用失敗:", error.message);
		throw error;
	}
	revalidatePath(`/trip/${tripId}`);
}