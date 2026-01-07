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

	// 嘗試抓取 User (匿名版可為 null)
	const { data: { user } } = await supabase.auth.getUser();

	const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
	const randomSuffix = Math.random().toString(36).substring(2, 6);
	const uniqueId = `${today}-${randomSuffix}`;

	const { error: tripError } = await supabase.from("trips").insert({
		id: uniqueId,
		owner_id: user?.id || null,
		owner_email: user?.email || "anonymous",
		owner_name: user?.user_metadata?.full_name || "訪客",
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

	const email = user.email?.toLowerCase().trim();

	// 同時抓取兩個來源：我是擁有者、我是成員
	const [ownedResponse, memberResponse] = await Promise.all([
		supabase.from("trips").select("*").eq("owner_id", user.id),
		supabase.from("trip_members").select("trips (*)").eq("user_email", email)
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

export async function updateTripDays(tripId: string, newCount: number) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase.from('trips').update({ days_count: newCount }).eq('id', tripId);
	if (error) throw error;
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

export async function getSpots(tripId: string, day: number) {
	const supabase = await createSupabaseServerClient();
	const { data, error } = await supabase
		.from("spots")
		.select("*")
		.eq("trip_id", tripId)
		.eq("day", Number(day))
		.order("time", { ascending: true })
		.order("order_index", { ascending: true });
	if (error) return [];
	return data || [];
}

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

export async function deleteSpot(tripId: string, spotId: string) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase.from('spots').delete().eq('id', spotId);
	if (error) throw error;
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

export async function updateSpotCost(spotId: string, estimated: number, actual: number) {
	const supabase = await createSupabaseServerClient();
	await supabase.from("spots").update({ estimated_cost: estimated, actual_cost: actual }).eq("id", spotId);
}

export async function updateSpotSplit(spotId: string, payerId: string | null, involvedMembers: any) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase.from("spots").update({
		payer_id: payerId === "" ? null : payerId,
		involved_members: involvedMembers
	}).eq("id", spotId);
	if (error) throw error;
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
// 6. 行前清單 (Checklist)
// ==========================================

export async function getChecklist(tripId: string) {
	const supabase = await createSupabaseServerClient();
	const { data } = await supabase.from('checklists').select('*').eq('trip_id', tripId).order('created_at', { ascending: true });
	return data || [];
}

export async function addChecklistItem(tripId: string, content: string) {
	const supabase = await createSupabaseServerClient();
	const { error } = await supabase.from('checklists').insert([{ trip_id: tripId, content }]);
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