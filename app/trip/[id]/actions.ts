"use server"; // 👈 這行是關鍵，將此檔案標註為伺服器 Actions

import { supabase } from '@/lib/supabase';
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

// 4. 新增景點
export async function addSpotToDB(tripId: string, name: string, day: number, lat?: number, lng?: number) {
	const { data: existingSpots } = await supabase.from('spots').select('id').eq('trip_id', tripId).eq('day', day);
	const nextIndex = existingSpots ? existingSpots.length : 0;

	const { error } = await supabase.from('spots').insert([{
		trip_id: tripId, name, day, order_index: nextIndex, lat, lng
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

// 6. 更新排序
export async function updateSpotsOrder(tripId: string, updatedSpots: any[], day: number) {
	const updates = updatedSpots.map((spot, index) => ({
		id: spot.id,
		trip_id: tripId,
		name: spot.name,
		day: day,
		order_index: index,
		lat: spot.lat,
		lng: spot.lng
	}));
	const { error } = await supabase.from('spots').upsert(updates);
	if (error) throw error;
	revalidatePath(`/trip/${tripId}`);
}

// 7. 刪除天數
export async function deleteSpecificDay(tripId: string, dayToDelete: number, currentTotalDays: number) {
	await supabase.from('spots').delete().eq('trip_id', tripId).eq('day', dayToDelete);
	const { data: laterSpots } = await supabase.from('spots').select('*').eq('trip_id', tripId).gt('day', dayToDelete);
	if (laterSpots && laterSpots.length > 0) {
		const updates = laterSpots.map(spot => ({ ...spot, day: spot.day - 1 }));
		await supabase.from('spots').upsert(updates);
	}
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