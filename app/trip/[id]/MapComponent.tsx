"use client";
import { GoogleMap, MarkerF, Polyline } from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "100%", borderRadius: "32px" };

const mapStyles = [
  { featureType: "landscape", stylers: [{ color: "#fdf6e3" }] },
  { featureType: "water", stylers: [{ color: "#9adcfb" }] },
  {
    featureType: "road",
    stylers: [{ visibility: "simplified" }, { color: "#eee8d5" }],
  },
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
];

// 接受 isLoaded 作為參數
export default function MapComponent({
  spots,
  isLoaded,
}: {
  spots: any[];
  isLoaded: boolean;
}) {
  const path = spots
    .filter((spot) => spot.lat && spot.lng)
    .map((spot) => ({ lat: spot.lat, lng: spot.lng }));

  const center = path.length > 0 ? path[0] : { lat: 24.1477, lng: 120.6736 };

  // 由外部控制是否顯示
  if (!isLoaded)
    return (
      <div className="w-full h-full bg-orange-50 animate-pulse rounded-[32px]" />
    );

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={14}
      options={{
        styles: mapStyles,
        disableDefaultUI: true,
        zoomControl: true,
      }}
    >
      {spots.map(
        (spot) =>
          spot.lat && (
            <MarkerF
              key={spot.id}
              position={{ lat: spot.lat, lng: spot.lng }}
              title={spot.name}
              icon={{
                url: "https://cdn-icons-png.flaticon.com/512/8124/8124921.png",
                scaledSize: new window.google.maps.Size(40, 40),
              }}
            />
          )
      )}

      {path.length > 1 && (
        <Polyline
          path={path}
          options={{
            strokeColor: "#F97316",
            strokeOpacity: 0.8,
            strokeWeight: 3,
            icons: [
              {
                icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 2 },
                offset: "0",
                repeat: "10px",
              },
            ],
          }}
        />
      )}
    </GoogleMap>
  );
}
