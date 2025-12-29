// app/trip/[id]/page.tsx
import ItineraryList from "./ItineraryList";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* 傳入 tripId，其餘 UI 交給 ItineraryList 處理 */}
      <ItineraryList tripId={id} />
    </main>
  );
}
