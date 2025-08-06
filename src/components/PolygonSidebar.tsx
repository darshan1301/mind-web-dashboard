// components/PolygonSidebar.tsx
import { useEffect, useRef } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  polygonRegionsState,
  type PolygonRegion,
} from "../recoil/polygonState";
import { selectedRangeState, type DateRange } from "../recoil/rangeState";
import { calculateCentroid } from "../utils/calculateCentroid";

// Fixed temperature color function
const getColorForTemperature = (temp: number): string => {
  if (temp >= 10 && temp <= 15) {
    return "#ff0000"; // Red
  } else if (temp > 15 && temp <= 25) {
    return "#0000ff"; // Blue
  } else if (temp > 25) {
    return "#00ff00"; // Green
  } else {
    return "#808080"; // Gray for temperatures below 10
  }
};

export default function PolygonSidebar() {
  const selectedRange = useRecoilValue<DateRange>(selectedRangeState);
  const [polygons, setPolygons] =
    useRecoilState<PolygonRegion[]>(polygonRegionsState);

  const dataLoadedRef = useRef(new Set());
  const lastPolygonCountRef = useRef(0);

  useEffect(() => {
    if (polygons.length === 0) return;

    // If polygon count changed, clear the loaded data tracking
    if (polygons.length !== lastPolygonCountRef.current) {
      dataLoadedRef.current.clear();
      lastPolygonCountRef.current = polygons.length;
    }

    // Clamp end date to today (2025-08-06 in this session)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [rawStart, rawEnd] = selectedRange;
    const start = rawStart;
    const end = rawEnd > today ? today : rawEnd;

    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    const rangeKey = `${startStr}-${endStr}`;

    // Check if any polygon needs temperature data
    const needsData = polygons.some((p) => p.avgTemperature === undefined);
    if (!needsData && dataLoadedRef.current.has(rangeKey)) return;

    (async () => {
      const updated: PolygonRegion[] = await Promise.all(
        polygons.map(async (poly) => {
          // Skip if this polygon already has temperature data
          if (poly.avgTemperature !== undefined) return poly;

          const { lat, lng } = calculateCentroid(poly.coordinates);

          const url =
            `https://archive-api.open-meteo.com/v1/archive` +
            `?latitude=${lat}&longitude=${lng}` +
            `&start_date=${startStr}&end_date=${endStr}` +
            `&hourly=temperature_2m`;

          try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            const temps: number[] = data.hourly?.temperature_2m ?? [];
            if (temps.length === 0) return poly; // no data

            const avg = temps.reduce((a, b) => a + b, 0) / temps.length;

            return {
              ...poly,
              avgTemperature: avg,
              color: getColorForTemperature(avg),
            };
          } catch {
            return poly; // keep old colour
          }
        })
      );

      // Mark this date range as loaded
      dataLoadedRef.current.add(rangeKey);
      setPolygons(updated);
    })();
  }, [polygons.length, selectedRange, setPolygons]);

  const handleDelete = (id: string) => {
    setPolygons((prev) => prev.filter((p) => p.id !== id));
  };

  if (polygons.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-[1000] bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-xs max-h-96 overflow-y-auto">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">
        Saved Polygons ({polygons.length})
      </h3>

      {/* Temperature Legend */}
      <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
        <div className="font-semibold mb-1">Temperature Colors:</div>
        <div className="flex items-center gap-1 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: "#ff0000" }}
          />
          <span>10-15°C: Red</span>
        </div>
        <div className="flex items-center gap-1 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: "#0000ff" }}
          />
          <span>15-25°C: Blue</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: "#00ff00" }}
          />
          <span>&gt;25°C: Green</span>
        </div>
      </div>

      <div className="space-y-2">
        {polygons.map((polygon) => (
          <div
            key={polygon.id}
            className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-800 truncate">
                {polygon.name}
              </h4>
              <button
                onClick={() => handleDelete(polygon.id)}
                className="text-red-600 hover:text-red-800 text-sm font-bold w-6 h-6 flex items-center justify-center rounded hover:bg-red-100"
                title="Delete polygon">
                ×
              </button>
            </div>
            <div className="text-xs text-gray-600">
              <div className="flex items-center gap-1 mb-1">
                <div
                  className="w-4 h-4 rounded-full border border-gray-400"
                  style={{ backgroundColor: polygon.color }}
                />
                <span>{polygon.coordinates.length} points</span>

                {polygon.avgTemperature !== undefined && (
                  <span className="ml-2 font-medium">
                    {polygon.avgTemperature.toFixed(1)}°C
                  </span>
                )}
              </div>
              <div className="truncate">Source: {polygon.dataSource}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
