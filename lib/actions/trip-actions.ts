"use server"; // 👈 將此檔案標註為伺服器 Actions

import { supabase } from '@/lib/supabase';
import { time } from 'console';
import { revalidatePath } from 'next/cache';

// 1. 取得旅程基本資料
export async function getTripData(tripId: string) {
	const { data, error } = await supabase
		.from('trips')
		.select('*')
		.eq('id', tripId)
		.single();

	if (error) {
		console.error("讀取旅程失敗:", error);
		return null;
	}
	return data;
}

// 2. 更新旅程總天數
export async function updateTripDays(tripId: string, newCount: number) {
	const { error } = await supabase
		.from('trips')
		.update({ days_count: newCount })
		.eq('id', tripId);

	if (error) throw error;
	revalidatePath(`/trip/${tripId}`);
}

// 3. 取得景點
export async function getSpots(tripId: string, day: number) {
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
	const { error } = await supabase.from('spots').delete().eq('id', spotId);
	if (error) throw error;
	revalidatePath(`/trip/${tripId}`);
}

// 6. 更新排序（保留 category）
export async function updateSpotsOrder(tripId: string, updatedSpots: any[], day: number) {
	const updates = updatedSpots.map((spot, index) => ({
		id: spot.id,
		trip_id: tripId,
		name: spot.name,
		day: day,
		order_index: index,
		lat: spot.lat,
		lng: spot.lng,
		note: spot.note,
		time: spot.time, // 👈 確保時間在排序更新時也被保留
		category: spot.category || 'spot'
	}));
	const { error } = await supabase.from('spots').upsert(updates);
	if (error) throw error;
}

// 7. 刪除特定天數（包含景點遞補邏輯）
export async function deleteSpecificDay(tripId: string, dayToDelete: number, currentTotalDays: number) {
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
	await supabase.from('spots').update({ day: -1 }).eq('trip_id', tripId).eq('day', dayA);
	await supabase.from('spots').update({ day: dayA }).eq('trip_id', tripId).eq('day', dayB);
	await supabase.from('spots').update({ day: dayB }).eq('trip_id', tripId).eq('day', -1);
	revalidatePath(`/trip/${tripId}`);
}

// 9. 更新景點備註
export async function updateSpotNote(spotId: string, note: string) {
	const { error } = await supabase
		.from('spots')
		.update({ note: note })
		.eq('id', spotId);

	if (error) throw error;
}

// 10. 更新景點分類
export async function updateSpotCategory(spotId: string, category: string) {
	const { error } = await supabase
		.from('spots')
		.update({ category: category })
		.eq('id', spotId);
	if (error) throw error;
}

// 11. 建立全新旅程
export async function createNewTrip(formData: { title: string; id: string; date: string; location: string }) {
	const { error } = await supabase
		.from("trips")
		.insert([
			{
				title: formData.title,
				id: formData.id,
				start_date: formData.date,
				location: formData.location,
				days_count: 3,
			},
		]);

	if (error) {
		console.error("建立旅程失敗:", error.message);
		return { success: false, error: error.message };
	}

	revalidatePath("/");
	return { success: true };
}

// 12. 更新景點時間
export async function updateSpotTime(spotId: string, time: string) {
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
	const { data, error } = await supabase
		.from('checklists')
		.select('*')
		.eq('trip_id', tripId)
		.order('created_at', { ascending: true }); // 依照建立時間排序

	return data || [];
}

// 新增項目
export async function addChecklistItem(tripId: string, content: string) {
	const { error } = await supabase
		.from('checklists')
		.insert([{ trip_id: tripId, content }]);

	if (error) throw error;
	revalidatePath(`/trip/${tripId}`);
}

// 切換勾選狀態
export async function toggleChecklistItem(itemId: string, isChecked: boolean) {
	const { error } = await supabase
		.from('checklists')
		.update({ is_checked: isChecked })
		.eq('id', itemId);

	if (error) throw error;
}
// 刪除項目
export async function deleteChecklistItem(itemId: string) {
	const { error } = await supabase
		.from('checklists')
		.delete()
		.eq('id', itemId);

	if (error) throw error;
}