import React, { useMemo } from "react";
import { useRecoilValue } from "recoil";
import { weatherDataState } from "../recoil/weatherState";

interface TemperatureDisplayProps {
  selectedDateTime?: [Date, Date]; // Optional: specific time to show, defaults to latest
  showLocation?: boolean; // Show location info
  showUnits?: boolean; // Show temperature units
}

/**
 * Simple component that displays a single temperature value from weather data
 */
export const TemperatureDisplay: React.FC<TemperatureDisplayProps> = ({
  selectedDateTime,
  showLocation = true,
  showUnits = true,
}) => {
  const weatherData = useRecoilValue(weatherDataState);

  // Find the temperature for the selected time or latest available
  const { temperature, timestamp, location, error } = useMemo(() => {
    console.log("🌡️ Processing weather data for single temperature...");

    if (!weatherData) {
      console.log("⚠️ No weather data available");
      return {
        temperature: null,
        timestamp: null,
        location: null,
        error: "No data available",
      };
    }

    // Validate data structure
    if (
      !weatherData.hourly ||
      !weatherData.hourly.time ||
      !weatherData.hourly.temperature_2m
    ) {
      console.error("❌ Invalid weather data structure:", weatherData);
      return {
        temperature: null,
        timestamp: null,
        location: null,
        error: "Invalid data structure",
      };
    }

    const times = weatherData.hourly.time;
    const temperatures = weatherData.hourly.temperature_2m;

    if (times.length === 0 || temperatures.length === 0) {
      console.error("❌ Empty time or temperature arrays");
      return {
        temperature: null,
        timestamp: null,
        location: null,
        error: "No temperature data",
      };
    }

    if (times.length !== temperatures.length) {
      console.error("❌ Mismatched array lengths:", {
        timesLength: times.length,
        temperaturesLength: temperatures.length,
      });
      return {
        temperature: null,
        timestamp: null,
        location: null,
        error: "Data array mismatch",
      };
    }

    // Extract location info
    const locationInfo = {
      latitude: weatherData.latitude,
      longitude: weatherData.longitude,
      timezone: weatherData.timezone || "GMT",
      elevation: weatherData.elevation,
    };

    let targetIndex: number;
    let targetTime: Date;

    if (selectedDateTime) {
      // Find the closest time point to selected datetime
      const selectedTime = selectedDateTime[0].getTime();
      let closestIndex = 0;
      let closestDiff = Math.abs(new Date(times[0]).getTime() - selectedTime);

      for (let i = 1; i < times.length; i++) {
        const currentDiff = Math.abs(
          new Date(times[i]).getTime() - selectedTime
        );
        if (currentDiff < closestDiff) {
          closestDiff = currentDiff;
          closestIndex = i;
        }
      }

      targetIndex = closestIndex;
      targetTime = new Date(times[closestIndex]);

      console.log("🎯 Found closest time point:", {
        requested: selectedDateTime[0].toISOString(),
        found: targetTime.toISOString(),
        index: targetIndex,
        differenceMinutes: Math.round(closestDiff / (1000 * 60)),
      });
    } else {
      // Use the latest available data point
      targetIndex = times.length - 1;
      targetTime = new Date(times[targetIndex]);

      console.log("📊 Using latest data point:", {
        timestamp: targetTime.toISOString(),
        index: targetIndex,
      });
    }

    const temp = temperatures[targetIndex];

    if (typeof temp !== "number" || isNaN(temp)) {
      console.error("❌ Invalid temperature value:", temp);
      return {
        temperature: null,
        timestamp: targetTime,
        location: locationInfo,
        error: "Invalid temperature",
      };
    }

    console.log("✅ Temperature retrieved successfully:", {
      temperature: temp,
      timestamp: targetTime.toISOString(),
      location: locationInfo,
    });

    return {
      temperature: temp,
      timestamp: targetTime,
      location: locationInfo,
      error: null,
    };
  }, [weatherData, selectedDateTime]);

  // Loading state
  if (!weatherData) {
    return (
      <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
        <div className="animate-pulse">
          <div className="text-slate-300 text-lg mb-2">
            Loading temperature...
          </div>
          <div className="h-12 bg-slate-600 rounded w-32"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-900 border border-red-600 p-6 rounded-lg shadow-lg">
        <div className="text-red-100">
          <div className="font-semibold text-lg mb-2">
            ❌ Error Loading Temperature
          </div>
          <div className="text-sm">{error}</div>
          <details className="mt-3">
            <summary className="cursor-pointer text-red-200 hover:text-red-100">
              Show Debug Info
            </summary>
            <pre className="text-xs text-red-200 bg-red-800 p-2 overflow-x-auto rounded mt-2">
              {JSON.stringify(weatherData, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  // Success state - display temperature
  return (
    <div className="bg-gradient-to-br from-blue-900 to-blue-800 border border-blue-600 p-6 rounded-lg shadow-lg">
      {/* Location info */}
      {showLocation && location && (
        <div className="text-blue-200 text-sm mb-3">
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
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>
              {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
            </span>
          </div>
          <div className="text-xs text-blue-300">
            {location.timezone} • {location.elevation}m elevation
          </div>
        </div>
      )}

      {/* Main temperature display */}
      <div className="text-center">
        <div className="text-6xl font-bold text-white mb-2">
          {temperature?.toFixed(1)}
          {showUnits && <span className="text-3xl text-blue-200 ml-1">°C</span>}
        </div>

        {/* Timestamp */}
        <div className="text-blue-200 text-sm">
          <div className="flex items-center justify-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{timestamp?.toLocaleString()}</span>
          </div>
          {selectedDateTime && (
            <div className="text-xs text-blue-300 mt-1">
              {selectedDateTime[0].getTime() !== timestamp?.getTime()
                ? "(Closest available time)"
                : "(Exact match)"}
            </div>
          )}
        </div>
      </div>

      {/* Additional weather info from API */}
      {weatherData.hourly_units && (
        <div className="mt-4 pt-3 border-t border-blue-600">
          <div className="text-xs text-blue-300 text-center">
            Data from {weatherData.timezone_abbreviation || "GMT"} • Generated
            in {weatherData.generationtime_ms?.toFixed(1)}ms
          </div>
        </div>
      )}
    </div>
  );
};
// (Moved useCurrentTemperature to a separate file: useCurrentTemperature.ts)
