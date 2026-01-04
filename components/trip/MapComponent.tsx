"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap, DirectionsRenderer } from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "100%", borderRadius: "32px" };
const DEFAULT_CENTER = { lat: 35.6895, lng: 139.6917 };

export default function MapComponent({
  spots,
  isLoaded,
  focusedSpot,
  // ✨ 新增：傳入國家代碼參數
  countryCode = "TW",
  onDurationsChange,
  onMapClick,
}: {
  spots: any[];
  isLoaded: boolean;
  focusedSpot: any | null;
  // ✨ 新增：型別定義
  countryCode?: string;
  onDurationsChange?: (durations: { [key: string]: any }) => void;
  onMapClick?: (lat: number, lng: number) => void;
}) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [routeSegments, setRouteSegments] = useState<any[]>([]);
  const markersRef = useRef<any[]>([]);

  const onLoad = useCallback((map: google.maps.Map) => setMap(map), []);
  const onUnmount = useCallback(() => {
    setMap(null);
    clearMarkers();
  }, []);

  const clearMarkers = () => {
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];
  };

  const resolveLocation = async (
    spot: any
  ): Promise<{ lat: number; lng: number } | null> => {
    if (!spot) return null;
    let lat, lng;
    if (spot.lat !== undefined && spot.lng !== undefined) {
      lat = Number(spot.lat);
      lng = Number(spot.lng);
    } else if (
      Array.isArray(spot.coordinates) &&
      spot.coordinates.length === 2
    ) {
      lng = Number(spot.coordinates[0]);
      lat = Number(spot.coordinates[1]);
    }
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) [lat, lng] = [lng, lat];
      return { lat, lng };
    }

    if (!google.maps.places || !google.maps.places.Place) return null;
    try {
      // ✨ 直接在這裡定義前綴，確保不會找不到變數
      const prefix =
        countryCode === "JP" ? "日本 " : countryCode === "TW" ? "台灣 " : "";

      // @ts-ignore
      const { places } = await google.maps.places.Place.searchByText({
        // ✨ 將前綴與景點名稱組合，例如 "台灣 台北101"
        textQuery: `${prefix}${spot.name}`,
        fields: ["location"],
        language: "zh-TW",
        // ✅ 這裡已經移除了會報錯的 locationBias
      });
      if (places?.[0]?.location) {
        return { lat: places[0].location.lat(), lng: places[0].location.lng() };
      }
    } catch (e) {
      console.error("解析位置失敗:", e);
    }
    return null;
  };
  const findNearestStation = async (location: { lat: number; lng: number }) => {
    if (!google.maps.places || !google.maps.places.Place) return null;
    try {
      // @ts-ignore
      const { places } = await google.maps.places.Place.searchNearby({
        locationRestriction: { center: location, radius: 2000 }, // ✨ 1. 半徑放大到 2km 比較保險
        includedTypes: [
          "transit_station",
          "train_station",
          "subway_station",
          "bus_stop", // ✨ 2. 加入巴士站，增加日本景點的兼容性
          "bus_station",
        ],
        maxResultCount: 1,
        fields: ["location", "displayName"],
        language: "zh-TW",
      });

      if (places && places.length > 0 && places[0].location) {
        // ✨ 這裡有個關鍵！要把 displayName 傳回去，MapComponent 才有機會在失敗時保底使用
        return {
          lat: places[0].location.lat(),
          lng: places[0].location.lng(),
          name: places[0].displayName, // 雖然目前 return 只拿 lat/lng，但留著備用更好
        };
      }
    } catch (e) {
      console.warn("尋找車站失敗:", e);
    }
    return null;
  };

  useEffect(() => {
    if (!map || !focusedSpot) return;
    const moveMap = async () => {
      const loc = await resolveLocation(focusedSpot);
      if (loc) {
        map.panTo(loc);
        map.setZoom(15);
      }
    };
    moveMap();
  }, [focusedSpot, map]);

  useEffect(() => {
    if (!isLoaded || !map) return;
    if (!spots || spots.length === 0) {
      clearMarkers();
      setRouteSegments([]);
      if (onDurationsChange) onDurationsChange({});
      return;
    }

    const directionsService = new google.maps.DirectionsService();

    const updateMap = async () => {
      clearMarkers();
      const { AdvancedMarkerElement, PinElement } =
        (await google.maps.importLibrary("marker")) as any;

      const spotCoords = await Promise.all(
        spots.map(async (spot, i) => {
          const loc = await resolveLocation(spot);
          if (loc) {
            const isFocused = focusedSpot?.id === spot.id;
            const pin = new PinElement({
              glyphText: (i + 1).toString(),
              background: isFocused ? "#EA580C" : "#F97316",
              borderColor: "white",
              glyphColor: "white",
              scale: isFocused ? 1.4 : 1.0,
            });
            const marker = new AdvancedMarkerElement({
              map,
              position: loc,
              content: pin.element,
              title: spot.name,
              zIndex: isFocused ? 999 : 1,
            });
            marker.addListener("click", () => {
              map.panTo(loc);
              map.setZoom(15);
            });
            markersRef.current.push(marker);
          }
          return loc;
        })
      );

      if (spots.length < 2) {
        setRouteSegments([]);
        if (onDurationsChange) onDurationsChange({});
        return;
      }

      const allSegments: any[] = [];
      const newDurations: { [key: string]: any } = {}; // ✨ 確保型別為 any

      for (let i = 1; i < spots.length; i++) {
        const startLoc = spotCoords[i - 1];
        const endLoc = spotCoords[i];
        const mode = spots[i].transport_mode;
        const segmentId = spots[i].id;

        if (!startLoc || !endLoc) continue;

        const getRoute = (
          origin: any,
          destination: any,
          travelMode: google.maps.TravelMode
        ) => {
          return new Promise<any>((resolve) => {
            directionsService.route(
              { origin, destination, travelMode },
              (result, status) => {
                if (status === "OK") resolve(result);
                else resolve(null);
              }
            );
          });
        };

        if (mode === "TRANSIT") {
          console.log("newDurations", newDurations);

          // 1. 🔍 尋找最近車站 (針對日本優化範圍)
          const stA = await findNearestStation(startLoc);
          const stB = await findNearestStation(endLoc);

          if (stA && stB) {
            const transitFullRoute = await getRoute(
              startLoc,
              endLoc,
              google.maps.TravelMode.TRANSIT
            );
            console.log("transitFullRoute", transitFullRoute);

            if (transitFullRoute?.routes[0]?.legs[0]) {
              const leg = transitFullRoute.routes[0].legs[0];

              // 2. ✨ 深度解析車站名稱 (針對日本多鐵路系統優化)
              // 先找 transitStep，如果找不到，就去細節層級找
              let departureName = "";
              let arrivalName = "";

              const transitStep = leg.steps.find(
                (s: any) => s.travel_mode === "TRANSIT"
              );

              if (transitStep?.transit) {
                departureName = transitStep.transit.departure_stop.name;
                arrivalName = transitStep.transit.arrival_stop.name;
              } else {
                // 如果第一層找不到，嘗試掃描所有子步驟 (解決日本轉乘站名遺失問題)
                leg.steps.forEach((s: any) => {
                  if (s.transit_details) {
                    departureName =
                      departureName || s.transit_details.departure_stop.name;
                    arrivalName = s.transit_details.arrival_stop.name; // 取最後一個站
                  }
                });
              }

              if (departureName && arrivalName) {
                newDurations[segmentId] = {
                  time: leg.duration?.text || "",
                  stations: `${departureName} ➔ ${arrivalName}`,
                };
              } else {
                newDurations[segmentId] = {
                  time: leg.duration?.text || "",
                  stations: null,
                };
              }

              allSegments.push({ result: transitFullRoute, id: segmentId });
            }

            // 畫出走路到車站的細線
            const leg1 = await getRoute(
              startLoc,
              stA,
              google.maps.TravelMode.WALKING
            );
            const leg2 = await getRoute(
              stB,
              endLoc,
              google.maps.TravelMode.WALKING
            );
            if (leg1) allSegments.push({ result: leg1, id: `${segmentId}-1` });
            if (leg2) allSegments.push({ result: leg2, id: `${segmentId}-2` });
          } else {
            // 如果找不到車站，退回普通走路模式
            const walkResult = await getRoute(
              startLoc,
              endLoc,
              google.maps.TravelMode.WALKING
            );
            if (walkResult) {
              allSegments.push({ result: walkResult, id: segmentId });
              newDurations[segmentId] = {
                time: walkResult.routes[0].legs[0].duration?.text || "",
                stations: null,
              };
            }
          }
        }
      }

      setRouteSegments(allSegments);
      if (onDurationsChange) onDurationsChange(newDurations);

      if (!focusedSpot) {
        const bounds = new google.maps.LatLngBounds();
        let hasPoints = false;
        spotCoords.forEach((loc) => {
          if (loc) {
            bounds.extend(loc);
            hasPoints = true;
          }
        });
        allSegments.forEach((seg: any) => {
          if (seg?.result?.routes[0]?.bounds)
            bounds.union(seg.result.routes[0].bounds);
        });
        if (hasPoints) {
          setTimeout(() => {
            map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
          }, 100);
        } else if (spotCoords[0]) {
          map.setCenter(spotCoords[0]);
          map.setZoom(15);
        }
      }
      console.log("🚀 即將傳回父組件的資料:", newDurations); // ✨ 加這行
    };
    updateMap();
  }, [spots, isLoaded, map, focusedSpot]);

  if (!isLoaded)
    return (
      <div className="w-full h-full bg-orange-50 animate-pulse rounded-[32px]" />
    );

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={DEFAULT_CENTER}
      zoom={15}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        mapId: "e7677d27e908976c",
      }}
      onClick={(e) => {
        if (e.latLng && onMapClick) {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          onMapClick(lat, lng);
        }
      }}
    >
      {routeSegments.map((segment) => (
        <DirectionsRenderer
          key={segment.id}
          directions={segment.result}
          options={{
            suppressMarkers: true,
            preserveViewport: true,
            polylineOptions: {
              strokeColor: "#F97316",
              strokeOpacity: 0.8,
              strokeWeight: 4,
            },
          }}
        />
      ))}
    </GoogleMap>
  );
}
