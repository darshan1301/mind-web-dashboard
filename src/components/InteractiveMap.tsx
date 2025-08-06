// components/PolygonDrawingMap.tsx
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useEffect, useRef, useState, useCallback } from "react";
import L, { FeatureGroup } from "leaflet";
import "leaflet-draw";

// Define LatLngLiteral type since it's not exported by leaflet
type LatLngLiteral = { lat: number; lng: number };
import { useRecoilState } from "recoil";
import { polygonRegionsState } from "../recoil/polygonState";
import PolygonSidebar from "./PolygonSidebar";

const center: LatLngLiteral = { lat: 20.5937, lng: 78.9629 }; // India

interface SavedPolygon {
  id: string;
  name: string;
  dataSource: string;
  coordinates: LatLngLiteral[];
  color: string;
  createdAt: Date;
}

// Mock data sources - replace with your actual endpoints
const DATA_SOURCES = [
  {
    id: "weather_api",
    name: "Weather API",
    description: "Real-time weather data",
  },
  {
    id: "satellite_imagery",
    name: "Satellite Imagery",
    description: "High-resolution satellite data",
  },
  {
    id: "demographic_data",
    name: "Demographic Data",
    description: "Population and census data",
  },
  {
    id: "traffic_data",
    name: "Traffic Data",
    description: "Real-time traffic information",
  },
];

// Generate random colors for polygons
const generateRandomColor = () => {
  const colors = [
    "#2563eb",
    "#dc2626",
    "#16a34a",
    "#ca8a04",
    "#9333ea",
    "#c2410c",
    "#0891b2",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Custom hook component to handle drawing controls
function DrawingControls({
  isDrawingMode,
  onPolygonCreated,
  onToggleDrawingMode,
  savedPolygons,
  onPolygonUpdated,
}: {
  isDrawingMode: boolean;
  onPolygonCreated: (coords: LatLngLiteral[]) => void;
  onToggleDrawingMode: (mode: boolean) => void;
  savedPolygons: SavedPolygon[];
  onPolygonUpdated: (id: string, coords: LatLngLiteral[]) => void;
  // mapRef: React.MutableRefObject<LeafletMap | null>;
}) {
  const map = useMap();
  const drawnItemsRef = useRef<FeatureGroup>(new L.FeatureGroup());
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const polygonLayersRef = useRef<Map<string, L.Polygon>>(new Map());

  // Update saved polygons on map
  useEffect(() => {
    const drawnItems = drawnItemsRef.current;

    // Clear existing layers
    drawnItems.clearLayers();
    polygonLayersRef.current.clear();

    // Add saved polygons to map
    savedPolygons.forEach((polygon) => {
      const leafletPolygon = L.polygon(
        polygon.coordinates.map((coord) => [coord.lat, coord.lng]),
        {
          color: polygon.color,
          fillColor: polygon.color,
          fillOpacity: 0.2,
          weight: 2,
        }
      );

      // Add click handler for editing
      leafletPolygon.on("click", () => {
        if (!isDrawingMode) {
          leafletPolygon.editing.enable();
        }
      });

      // Handle editing events
      leafletPolygon.on("edit", () => {
        const latlngs = leafletPolygon.getLatLngs()[0] as L.LatLngLiteral[];
        const coords = latlngs.map((point) => ({
          lat: point.lat,
          lng: point.lng,
        }));
        onPolygonUpdated(polygon.id, coords);
      });

      drawnItems.addLayer(leafletPolygon);
      polygonLayersRef.current.set(polygon.id, leafletPolygon);
    });
  }, [savedPolygons, isDrawingMode, onPolygonUpdated]);

  useEffect(() => {
    const drawnItems = drawnItemsRef.current;

    // Add the feature group to the map
    if (!map.hasLayer(drawnItems)) {
      map.addLayer(drawnItems);
    }

    // Create or update draw control based on drawing mode
    if (drawControlRef.current) {
      map.removeControl(drawControlRef.current);
    }

    if (isDrawingMode) {
      const drawControl = new L.Control.Draw({
        draw: {
          polygon: {
            allowIntersection: false,
            showArea: true,
            shapeOptions: {
              color: generateRandomColor(),
              fillOpacity: 0.2,
              weight: 2,
            },
            guidelineDistance: 10,
          },
          polyline: false,
          rectangle: false,
          circle: false,
          marker: false,
          circlemarker: false,
        },
        edit: false, // Disable edit controls in drawing mode
      });

      drawControlRef.current = drawControl;
      map.addControl(drawControl);
    }

    // Handle polygon creation
    const handleCreated = (e: any) => {
      const layer = e.layer as L.Polygon;
      if (!layer || !layer.getLatLngs) return;

      const latlngs = layer.getLatLngs()[0] as L.LatLng[];

      if (latlngs.length < 3) {
        alert("Polygon must have at least 3 points.");
        return;
      }

      if (latlngs.length > 12) {
        alert("Polygon cannot have more than 12 points.");
        return;
      }

      // Convert to coordinates
      const coords = latlngs.map((point) => ({
        lat: point.lat,
        lng: point.lng,
      }));

      onPolygonCreated(coords);
      onToggleDrawingMode(false); // Exit drawing mode after creating polygon
    };

    // Add event listeners only in drawing mode
    if (isDrawingMode) {
      map.on(L.Draw.Event.CREATED, handleCreated);
    }

    // Cleanup function
    return () => {
      if (isDrawingMode) {
        map.off(L.Draw.Event.CREATED, handleCreated);
      }

      if (drawControlRef.current) {
        try {
          map.removeControl(drawControlRef.current);
        } catch (e) {
          // Control might already be removed
        }
      }
    };
  }, [map, isDrawingMode, onPolygonCreated, onToggleDrawingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const drawnItems = drawnItemsRef.current;
      if (drawnItems && map.hasLayer(drawnItems)) {
        map.removeLayer(drawnItems);
      }
    };
  }, [map]);

  return null;
}

export default function PolygonDrawingMap() {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [pendingPolygonCoords, setPendingPolygonCoords] = useState<
    LatLngLiteral[] | null
  >(null);
  const [showForm, setShowForm] = useState(false);
  const [polygonName, setPolygonName] = useState("");
  const [selectedDataSource, setSelectedDataSource] = useState("");
  const [savedPolygons, setSavedPolygons] = useRecoilState(polygonRegionsState);
  const [nextAutoDataSource, setNextAutoDataSource] = useState(0);

  // Auto-select next data source if more than one endpoint
  useEffect(() => {
    if (DATA_SOURCES.length > 1 && pendingPolygonCoords) {
      setSelectedDataSource(
        DATA_SOURCES[nextAutoDataSource % DATA_SOURCES.length].id
      );
    }
  }, [pendingPolygonCoords, nextAutoDataSource]);

  const handleStartDrawing = () => {
    setIsDrawingMode(true);
  };

  const handleStopDrawing = () => {
    setIsDrawingMode(false);
  };

  const handlePolygonCreated = useCallback(
    (coords: LatLngLiteral[]) => {
      setPendingPolygonCoords(coords);
      setShowForm(true);
      setPolygonName(`Polygon ${savedPolygons.length + 1}`); // Auto-generate name
    },
    [savedPolygons.length]
  );

  const handlePolygonUpdated = useCallback(
    (id: string, coords: LatLngLiteral[]) => {
      setSavedPolygons((prev) =>
        prev.map((polygon) =>
          polygon.id === id ? { ...polygon, coordinates: coords } : polygon
        )
      );
    },
    []
  );

  const handleSavePolygon = () => {
    if (
      !pendingPolygonCoords ||
      polygonName.trim() === "" ||
      selectedDataSource === ""
    ) {
      alert("Please fill in all required fields");
      return;
    }

    const newPolygon: SavedPolygon = {
      id: `polygon_${Date.now()}`,
      name: polygonName.trim(),
      dataSource: selectedDataSource,
      coordinates: pendingPolygonCoords,
      color: generateRandomColor(),
      createdAt: new Date(),
    };

    setSavedPolygons((prev) => [...prev, newPolygon]);

    // Move to next data source for auto-selection
    setNextAutoDataSource((prev) => prev + 1);

    // Reset form
    setShowForm(false);
    setPendingPolygonCoords(null);
    setPolygonName("");
    setSelectedDataSource("");

    console.log("Saved Polygon:", newPolygon);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setPendingPolygonCoords(null);
    setPolygonName("");
    setSelectedDataSource("");
  };

  const handleDeletePolygon = (id: string) => {
    setSavedPolygons((prev) => prev.filter((polygon) => polygon.id !== id));
  };

  const selectedDataSourceInfo = DATA_SOURCES.find(
    (ds) => ds.id === selectedDataSource
  );

  return (
    <div className="relative h-[600px] mt-10 w-full">
      {/* Map Control Buttons */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-3">
        {/* Center Reset Button */}
        <button
          onClick={() => {
            // We'll implement this with a ref to the map
            const mapContainer = document.querySelector(
              ".leaflet-container"
            ) as any;
            if (mapContainer && mapContainer._leaflet_map) {
              mapContainer._leaflet_map.setView(center, 5);
            }
          }}
          className="bg-white mt-20 ml-20 hover:bg-gray-50 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg shadow-md transition-colors duration-200 flex items-center gap-2 text-sm"
          title="Reset map to center view">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Reset View
        </button>

        {/* Drawing Control */}
        <div className="bg-white border ml-20 mt-4 border-gray-300 rounded-lg shadow-lg p-3">
          <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            Polygon Tools
          </h3>
          {!isDrawingMode ? (
            <div className="space-y-2">
              <button
                onClick={handleStartDrawing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm font-medium">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Start Drawing
              </button>
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <div className="font-medium mb-1">Draw polygons with:</div>
                <div>• Minimum 3 points</div>
                <div>• Maximum 12 points</div>
                <div>• Click saved polygons to edit</div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="bg-green-100 border border-green-300 text-green-800 px-3 py-2 rounded-lg text-xs font-medium">
                🎯 Drawing Mode Active
                <div className="text-green-700 font-normal mt-1">
                  Click on map to add points (3-12)
                </div>
              </div>
              <button
                onClick={handleStopDrawing}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm font-medium">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Cancel Drawing
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Saved Polygons List */}
      {savedPolygons.length > 0 && <PolygonSidebar />}

      <MapContainer
        center={center}
        zoom={5}
        className="h-[600px] max-w-7xl flex mx-auto rounded-lg "
        style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DrawingControls
          isDrawingMode={isDrawingMode}
          onPolygonCreated={handlePolygonCreated}
          onToggleDrawingMode={setIsDrawingMode}
          savedPolygons={savedPolygons}
          onPolygonUpdated={handlePolygonUpdated}
        />
      </MapContainer>

      {/* Polygon Information Form */}
      {showForm && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] bg-white border border-gray-300 rounded-xl shadow-2xl w-[400px] p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Polygon Information
          </h2>

          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Polygon Name *
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={polygonName}
              onChange={(e) => setPolygonName(e.target.value)}
              placeholder="Enter polygon name"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Data Source *
            </label>
            <select
              className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedDataSource}
              onChange={(e) => setSelectedDataSource(e.target.value)}>
              <option value="">Select a data source</option>
              {DATA_SOURCES.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
            {selectedDataSourceInfo && (
              <p className="text-xs text-gray-500 mt-1">
                {selectedDataSourceInfo.description}
              </p>
            )}
            {DATA_SOURCES.length > 1 && (
              <p className="text-xs text-blue-600 mt-1">
                💡 Auto-selected next available source
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
              onClick={handleSavePolygon}>
              Save Polygon
            </button>
            <button
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              onClick={handleCancelForm}>
              Cancel
            </button>
          </div>

          {pendingPolygonCoords && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800">
                <div className="flex items-center gap-2 mb-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <strong>Polygon Details:</strong>
                </div>
                <div className="ml-6">
                  • Points: {pendingPolygonCoords.length}
                  <br />
                  • Valid range: 3-12 points ✓
                  <br />• Click on saved polygons to edit points
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!isDrawingMode && savedPolygons.length === 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm max-w-md text-center">
          Click "Start Drawing Polygon" to begin defining regions for analysis
        </div>
      )}
    </div>
  );
}
