import { atom } from "recoil";

export type PolygonRegion = {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number }[];
  color: string;
  dataSource?: string;
  avgTemperature?: number;
};

export const polygonRegionsState = atom<PolygonRegion[]>({
  key: "polygonRegionsState",
  default: [],
});
