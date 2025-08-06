import React, { useState, useRef, useEffect } from "react";
import {
  BarChart3,
  Calendar,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
} from "lucide-react";
import InteractiveMap from "./InteractiveMap";
import { useRecoilState } from "recoil";
import { weatherDataState, type WeatherData } from "../recoil/weatherState";
import { TemperatureDisplay } from "./TemperatureDisplay";

type TimeUnit = "Hour" | "Day";

interface TimelineSliderProps {
  startDate: Date;
  endDate: Date;
  selectedRange: [Date, Date];
  onRangeChange: (range: [Date, Date]) => void;
  isRangeMode: boolean;
  onModeToggle: () => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  timeUnit: TimeUnit;
  onTimeUnitChange: (unit: TimeUnit) => void;
}

const TimelineSlider: React.FC<TimelineSliderProps> = ({
  selectedRange,
  onRangeChange,
  isRangeMode,
  onModeToggle,
  isPlaying,
  onPlayPause,
  timeUnit,
  onTimeUnitChange,
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<
    "start" | "end" | "range" | null
  >(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const timeUnits: TimeUnit[] = ["Hour", "Day"];

  // Calculate 30 days before today as the effective range
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0); // Start of 30 days ago

  // Use the 30-day range instead of the original startDate/endDate
  const effectiveStartDate = thirtyDaysAgo;
  const effectiveEndDate = today;

  // Initialize to middle point (15 days ago) on first load
  useEffect(() => {
    if (!isInitialized) {
      const totalDuration =
        effectiveEndDate.getTime() - effectiveStartDate.getTime();
      const middleDate = new Date(
        effectiveStartDate.getTime() + totalDuration / 2
      );
      onRangeChange([middleDate, middleDate]);
      setIsInitialized(true);
    }
  }, [isInitialized, effectiveStartDate, effectiveEndDate, onRangeChange]);

  const totalDuration =
    effectiveEndDate.getTime() - effectiveStartDate.getTime();
  const startPercent =
    ((selectedRange[0].getTime() - effectiveStartDate.getTime()) /
      totalDuration) *
    100;
  const endPercent =
    ((selectedRange[1].getTime() - effectiveStartDate.getTime()) /
      totalDuration) *
    100;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
      day: "numeric",
    });
  };

  // Maximum percent is 100% since we can go up to today
  const maxPercent = 100;

  const formatRangeDisplay = () => {
    const formatByUnit = (date: Date) => {
      switch (timeUnit) {
        case "Hour":
          return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
        case "Day":
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

        default:
          return formatDate(date);
      }
    };

    if (isRangeMode) {
      return `${formatByUnit(selectedRange[0])} - ${formatByUnit(
        selectedRange[1]
      )}`;
    } else {
      return formatByUnit(selectedRange[0]);
    }
  };

  const getDurationText = () => {
    const diffMs = selectedRange[1].getTime() - selectedRange[0].getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    switch (timeUnit) {
      case "Hour":
        if (diffHours < 24) {
          return `${diffHours} hours`;
        } else {
          return `${diffDays} days`;
        }
      case "Day":
        return `${diffDays} days`;
      default:
        return `${diffDays} days`;
    }
  };

  const getDateFromPercent = (percent: number) => {
    const time = effectiveStartDate.getTime() + (percent / 100) * totalDuration;
    return new Date(time);
  };

  const getPercentFromEvent = (e: MouseEvent | React.MouseEvent) => {
    if (!sliderRef.current) return 0;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return Math.max(0, Math.min(100, (x / rect.width) * 100));
  };

  const handleMouseDown = (
    e: React.MouseEvent,
    handle: "start" | "end" | "range"
  ) => {
    e.preventDefault();
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawPercent = Math.max(0, Math.min(100, (rawX / rect.width) * 100));
    const clampedPercent = Math.min(rawPercent, maxPercent);
    const clampedX = (clampedPercent / 100) * rect.width;

    setIsDragging(handle);

    if (handle === "range") {
      const rangeStartX = (startPercent / 100) * rect.width;
      setDragOffset(clampedX - rangeStartX);
    }
  };

  const handleSliderClick = (e: React.MouseEvent) => {
    if (isDragging) return;

    const percent = Math.min(getPercentFromEvent(e), maxPercent);
    const newDate = getDateFromPercent(percent);

    if (isRangeMode) {
      const rangeDuration =
        selectedRange[1].getTime() - selectedRange[0].getTime();
      const newStart = new Date(newDate.getTime() - rangeDuration / 2);
      const newEnd = new Date(newDate.getTime() + rangeDuration / 2);

      // Clamp to effective bounds (30 days before today to today)
      if (newStart.getTime() < effectiveStartDate.getTime()) {
        onRangeChange([
          effectiveStartDate,
          new Date(effectiveStartDate.getTime() + rangeDuration),
        ]);
      } else if (newEnd.getTime() > effectiveEndDate.getTime()) {
        onRangeChange([
          new Date(effectiveEndDate.getTime() - rangeDuration),
          effectiveEndDate,
        ]);
      } else {
        onRangeChange([newStart, newEnd]);
      }
    } else {
      // In single point mode, set both start and end to the same date
      onRangeChange([newDate, newDate]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !sliderRef.current) return;

      const percent = getPercentFromEvent(e);
      const newDate = getDateFromPercent(percent);

      if (isDragging === "start") {
        if (isRangeMode) {
          const newStart = new Date(
            Math.max(
              effectiveStartDate.getTime(),
              Math.min(newDate.getTime(), selectedRange[1].getTime())
            )
          );
          onRangeChange([newStart, selectedRange[1]]);
        } else {
          // In single point mode, dragging the handle moves the single point
          const clampedDate = new Date(
            Math.max(
              effectiveStartDate.getTime(),
              Math.min(effectiveEndDate.getTime(), newDate.getTime())
            )
          );
          onRangeChange([clampedDate, clampedDate]);
        }
      } else if (isDragging === "end") {
        const newEnd = new Date(
          Math.min(
            effectiveEndDate.getTime(),
            Math.max(newDate.getTime(), selectedRange[0].getTime())
          )
        );
        onRangeChange([selectedRange[0], newEnd]);
      } else if (isDragging === "range") {
        const rect = sliderRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - dragOffset;
        const newStartPercent = Math.max(
          0,
          Math.min(endPercent - startPercent, (x / rect.width) * 100)
        );
        const newEndPercent = Math.min(
          100,
          newStartPercent + (endPercent - startPercent)
        );

        const newStart = getDateFromPercent(newStartPercent);
        const newEnd = getDateFromPercent(newEndPercent);
        onRangeChange([newStart, newEnd]);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
      setDragOffset(0);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    selectedRange,
    effectiveStartDate,
    effectiveEndDate,
    dragOffset,
    startPercent,
    endPercent,
    onRangeChange,
  ]);

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Calendar className="w-5 h-5 text-purple-400" />
          <span className="text-white font-medium">Time Period</span>
          <span className="text-purple-400 font-medium">
            {formatRangeDisplay()}
          </span>
          <span className="text-slate-400 text-sm">{getDurationText()}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onPlayPause}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors">
            <SkipBack className="w-4 h-4 text-slate-300" />
          </button>
          <button
            onClick={onPlayPause}
            className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors">
            {isPlaying ? (
              <Pause className="w-4 h-4 text-white" />
            ) : (
              <Play className="w-4 h-4 text-white" />
            )}
          </button>
          <button
            onClick={onPlayPause}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors">
            <SkipForward className="w-4 h-4 text-slate-300" />
          </button>
          <span className="text-slate-400 text-sm px-2">
            {isPlaying ? "Playing" : "Paused"}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 px-3 py-2 bg-slate-700 rounded-lg border border-slate-600 hover:bg-slate-600 transition-colors">
              <span className="text-slate-300 text-sm">
                Time Unit: {timeUnit}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-10">
                {timeUnits.map((unit) => (
                  <button
                    key={unit}
                    onClick={() => {
                      onTimeUnitChange(unit);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-600 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                      unit === timeUnit
                        ? "text-purple-400 bg-slate-600"
                        : "text-slate-300"
                    }`}>
                    {unit}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 text-sm">Single Point</span>
            <button
              onClick={onModeToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isRangeMode ? "bg-purple-600" : "bg-slate-600"
              }`}>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isRangeMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-slate-400 text-sm">Range</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          ref={sliderRef}
          className="relative h-2 bg-slate-600 rounded-full cursor-pointer"
          onClick={handleSliderClick}>
          {/* Track */}
          <div className="absolute inset-0 bg-slate-600 rounded-full" />

          {/* Selected range */}
          <div
            className="absolute h-full bg-purple-500 rounded-full"
            style={{
              left: `${startPercent}%`,
              right: `${100 - endPercent}%`,
            }}
          />

          {/* Start handle */}
          <div
            className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-purple-500 rounded-full border-2 border-white cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
            style={{ left: `${startPercent}%` }}
            onMouseDown={(e) => handleMouseDown(e, "start")}
          />

          {/* End handle (only visible in range mode) */}
          {isRangeMode && (
            <div
              className="absolute top-1/2 transform -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-purple-500 rounded-full border-2 border-white cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
              style={{ left: `${endPercent}%` }}
              onMouseDown={(e) => handleMouseDown(e, "end")}
            />
          )}

          {/* Range drag area (only visible in range mode) */}
          {isRangeMode && (
            <div
              className="absolute top-1/2 transform -translate-y-1/2 h-6 cursor-grab active:cursor-grabbing"
              style={{
                left: `${startPercent}%`,
                right: `${100 - endPercent}%`,
              }}
              onMouseDown={(e) => handleMouseDown(e, "range")}
            />
          )}
        </div>

        {/* Timeline labels */}
        <div className="flex justify-between mt-4 text-sm text-slate-400">
          <span>
            {timeUnit === "Hour"
              ? effectiveStartDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }) + " 12:00 AM"
              : formatDate(effectiveStartDate)}
          </span>
          <span className="text-purple-400 font-medium">
            {formatRangeDisplay()}
          </span>
          <span>
            {timeUnit === "Hour"
              ? effectiveEndDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }) + " 11:59 PM"
              : formatDate(effectiveEndDate)}
          </span>
        </div>
      </div>
    </div>
  );
};

const AnalyticsDashboard: React.FC = () => {
  const today = new Date();
  const defaultStartDate = new Date(today);
  defaultStartDate.setDate(today.getDate() - 3);
  defaultStartDate.setHours(0, 0, 0, 0);

  const defaultEndDate = new Date(today);
  defaultEndDate.setDate(today.getDate() + 1);
  defaultEndDate.setHours(23, 59, 59, 999);

  const [selectedRange, setSelectedRange] = useState<[Date, Date]>([
    defaultStartDate,
    defaultEndDate,
  ]);
  const [isRangeMode, setIsRangeMode] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("Hour");

  // Recoil state for weather data
  const [weatherData, setWeatherData] = useRecoilState(weatherDataState);

  // fetch whenever selectedRange changes
  useEffect(() => {
    const [start, end] = selectedRange;
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${52.52}&longitude=${13.41}&start_date=${startDate}&end_date=${endDate}&${"hourly"}=temperature_2m`;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as WeatherData;
        if (!cancelled) setWeatherData(data);
      } catch (err) {
        console.error("Failed to load weather data:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedRange, setWeatherData]);

  console.log(weatherData);
  // 30-day window for slider
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 15);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 15);
  endDate.setHours(23, 59, 59, 999);

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-8 h-8 text-purple-400" />
          <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
        </div>

        {/* Timeline Slider */}
        <TimelineSlider
          startDate={startDate}
          endDate={endDate}
          selectedRange={selectedRange}
          onRangeChange={setSelectedRange}
          isRangeMode={isRangeMode}
          onModeToggle={() => setIsRangeMode(!isRangeMode)}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          timeUnit={timeUnit}
          onTimeUnitChange={setTimeUnit}
        />
        <TemperatureDisplay
          selectedDateTime={selectedRange}
          showUnits
          showLocation
        />

        {/* Here you can render charts or tables using `weatherData` */}
        {/* e.g. <TemperatureChart data={weatherData?.hourly} /> */}
      </div>

      <InteractiveMap />
    </div>
  );
};

export default AnalyticsDashboard;
