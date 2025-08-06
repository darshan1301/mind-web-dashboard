import type { WeatherData } from "../recoil/weatherState";

/**
 * A single time–temperature pair.
 */
export interface TimePoint {
  time: Date;
  temperature: number;
}
export type TimeUnit = "Hour" | "Day";

/**
 * Convert raw API response into an array of TimePoint objects.
 * @param raw The WeatherData from recoil state (hourly.time & hourly.temperature_2m)
 */
export function parseRawWeatherData(raw: WeatherData): TimePoint[] {
  console.log("🔍 Debug: parseRawWeatherData input:", raw);

  // Add safety checks
  if (!raw || !raw.hourly) {
    console.error("❌ Raw weather data is missing or invalid:", raw);
    return [];
  }

  const times = raw.hourly.time;
  const temps = raw.hourly.temperature_2m;

  if (!times || !temps) {
    console.error("❌ Missing time or temperature data:", { times, temps });
    return [];
  }

  if (times.length === 0 || temps.length === 0) {
    console.warn("⚠️ Empty time or temperature arrays:", {
      timesLength: times.length,
      tempsLength: temps.length,
    });
    return [];
  }

  if (times.length !== temps.length) {
    console.error("❌ Time and temperature arrays have different lengths:", {
      timesLength: times.length,
      tempsLength: temps.length,
    });
    // Use the shorter length to avoid index errors
    const minLength = Math.min(times.length, temps.length);
    times.splice(minLength);
    temps.splice(minLength);
  }

  const result = times
    .map((iso, i) => {
      const date = new Date(iso);
      const temperature = temps[i];

      // Validate each data point
      if (isNaN(date.getTime())) {
        console.warn("⚠️ Invalid date found:", iso);
        return null;
      }

      if (typeof temperature !== "number" || isNaN(temperature)) {
        console.warn(
          "⚠️ Invalid temperature found:",
          temperature,
          "at index",
          i
        );
        return null;
      }

      return {
        time: date,
        temperature: temperature,
      };
    })
    .filter((point): point is TimePoint => point !== null); // Remove null entries

  console.log("✅ Parsed weather data:", {
    originalLength: times.length,
    parsedLength: result.length,
    sample: result.slice(0, 3), // Show first 3 entries
  });

  return result;
}

/**
 * Filter a TimePoint array to only include points within the provided date range.
 * @param series Array of TimePoint
 * @param range Tuple [startDate, endDate]
 */
export function filterByRange(
  series: TimePoint[],
  range: [Date, Date]
): TimePoint[] {
  console.log("🔍 Debug: filterByRange input:", {
    seriesLength: series.length,
    range: range.map((d) => d.toISOString()),
  });

  if (!series || series.length === 0) {
    console.warn("⚠️ Empty or invalid series provided to filterByRange");
    return [];
  }

  if (!range || range.length !== 2) {
    console.error("❌ Invalid range provided to filterByRange:", range);
    return series;
  }

  const [start, end] = range;

  // Validate date range
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error("❌ Invalid dates in range:", { start, end });
    return series;
  }

  if (start.getTime() > end.getTime()) {
    console.warn("⚠️ Start date is after end date, swapping:", { start, end });
    return filterByRange(series, [end, start]);
  }

  const filtered = series.filter((pt) => {
    if (!pt || !pt.time || isNaN(pt.time.getTime())) {
      console.warn("⚠️ Invalid time point found:", pt);
      return false;
    }

    return (
      pt.time.getTime() >= start.getTime() && pt.time.getTime() <= end.getTime()
    );
  });

  console.log("✅ Filtered data:", {
    originalLength: series.length,
    filteredLength: filtered.length,
    dateRange: `${start.toISOString()} to ${end.toISOString()}`,
  });

  return filtered;
}

/**
 * Aggregate a series of TimePoints by the given time unit.
 * - "Hour": returns original series
 * - "Day": daily average (grouped by YYYY-MM-DD)
 * @param series Array of TimePoint
 * @param unit The TimeUnit to aggregate by
 */
export function aggregateByUnit(
  series: TimePoint[],
  unit: TimeUnit
): TimePoint[] {
  console.log("🔍 Debug: aggregateByUnit input:", {
    seriesLength: series.length,
    unit,
    samplePoints: series.slice(0, 3),
  });

  if (!series || series.length === 0) {
    console.warn("⚠️ Empty or invalid series provided to aggregateByUnit");
    return [];
  }

  if (unit === "Hour") {
    console.log("✅ Returning hourly data unchanged");
    return series;
  }

  const buckets = new Map<
    string,
    { sum: number; count: number; dates: Date[] }
  >();

  series.forEach(({ time, temperature }, index) => {
    // Validate each point
    if (!time || isNaN(time.getTime())) {
      console.warn(`⚠️ Invalid time at index ${index}:`, time);
      return;
    }

    if (typeof temperature !== "number" || isNaN(temperature)) {
      console.warn(`⚠️ Invalid temperature at index ${index}:`, temperature);
      return;
    }

    let key: string;

    if (unit === "Day") {
      // e.g. "2025-07-09"
      key = time.toISOString().slice(0, 10);
    } else {
      console.error("❌ Unknown time unit:", unit);
      return;
    }

    if (!buckets.has(key)) {
      buckets.set(key, { sum: 0, count: 0, dates: [] });
    }

    const bucket = buckets.get(key)!;
    bucket.sum += temperature;
    bucket.count += 1;
    bucket.dates.push(time);
  });

  console.log("🔍 Debug: Buckets created:", {
    bucketCount: buckets.size,
    bucketKeys: Array.from(buckets.keys()).slice(0, 5), // Show first 5 keys
    totalPoints: Array.from(buckets.values()).reduce(
      (sum, bucket) => sum + bucket.count,
      0
    ),
  });

  // Build aggregated series
  const result = Array.from(buckets.entries())
    .map(([key, { sum, count }]) => {
      const avgTemp = sum / count;

      if (isNaN(avgTemp)) {
        console.warn("⚠️ NaN temperature calculated for bucket:", key, {
          sum,
          count,
        });
        return null;
      }

      return {
        time: new Date(key + "T00:00:00.000Z"),
        temperature: avgTemp,
      };
    })
    .filter((point): point is TimePoint => point !== null)
    .sort((a, b) => a.time.getTime() - b.time.getTime()); // Sort by date

  console.log("✅ Aggregated data:", {
    unit,
    originalLength: series.length,
    aggregatedLength: result.length,
    sample: result.slice(0, 3),
  });

  return result;
}

// Helper function to debug the entire pipeline
export function debugWeatherDataPipeline(
  raw: WeatherData,
  range?: [Date, Date],
  unit: TimeUnit = "Hour"
): TimePoint[] {
  console.log("🚀 Starting weather data pipeline debug...");

  try {
    // Step 1: Parse raw data
    const parsed = parseRawWeatherData(raw);
    if (parsed.length === 0) {
      console.error("❌ Pipeline stopped: No data after parsing");
      return [];
    }

    // Step 2: Filter by range (if provided)
    let filtered = parsed;
    if (range) {
      filtered = filterByRange(parsed, range);
      if (filtered.length === 0) {
        console.error("❌ Pipeline stopped: No data after filtering by range");
        return [];
      }
    }

    // Step 3: Aggregate by unit
    const aggregated = aggregateByUnit(filtered, unit);
    if (aggregated.length === 0) {
      console.error("❌ Pipeline stopped: No data after aggregation");
      return [];
    }

    console.log("✅ Pipeline completed successfully:", {
      originalPoints: parsed.length,
      filteredPoints: filtered.length,
      aggregatedPoints: aggregated.length,
      unit,
      dateRange: range
        ? `${range[0].toISOString()} to ${range[1].toISOString()}`
        : "No range filter",
    });

    return aggregated;
  } catch (error) {
    console.error("❌ Pipeline error:", error);
    return [];
  }
}

// Additional helper function to validate WeatherData structure
export function validateWeatherData(data: any): data is WeatherData {
  console.log("🔍 Validating WeatherData structure...");

  if (!data) {
    console.error("❌ Data is null or undefined");
    return false;
  }

  if (!data.hourly) {
    console.error("❌ Missing hourly property");
    return false;
  }

  if (!Array.isArray(data.hourly.time)) {
    console.error("❌ hourly.time is not an array:", typeof data.hourly.time);
    return false;
  }

  if (!Array.isArray(data.hourly.temperature_2m)) {
    console.error(
      "❌ hourly.temperature_2m is not an array:",
      typeof data.hourly.temperature_2m
    );
    return false;
  }

  if (data.hourly.time.length !== data.hourly.temperature_2m.length) {
    console.error("❌ Array length mismatch:", {
      timeLength: data.hourly.time.length,
      tempLength: data.hourly.temperature_2m.length,
    });
  }

  console.log("✅ WeatherData structure is valid:", {
    timePoints: data.hourly.time.length,
    tempPoints: data.hourly.temperature_2m.length,
    sampleTime: data.hourly.time[0],
    sampleTemp: data.hourly.temperature_2m[0],
  });

  return true;
}

export function getColorForTemperature(temp: number): string {
  if (temp >= 10 && temp <= 15) {
    return "#FF0000"; // Red
  } else if (temp > 15 && temp <= 25) {
    return "#0000FF"; // Blue
  } else if (temp > 25) {
    return "#00FF00"; // Green
  }
  return "#888888"; // Default gray
}
