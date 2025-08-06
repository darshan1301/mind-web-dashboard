// src/state/weatherState.ts
import { atom } from "recoil";

export interface WeatherData {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  hourly_units: {
    time: string;
    temperature_2m: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
  };
}

export const weatherDataState = atom<WeatherData | null>({
  key: "weatherDataState",
  default: null,
});
