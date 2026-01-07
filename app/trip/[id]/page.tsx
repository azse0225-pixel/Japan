// app/trip/[id]/page.tsx
import ItineraryList from "../../../components/trip/ItineraryList";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-slate-50">
      <ItineraryList tripId={id} />
    </main>
  );
}
