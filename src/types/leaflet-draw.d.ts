/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "leaflet-draw" {
  import * as L from "leaflet";

  export interface DrawEvents {
    created: {
      layer: L.Layer;
      layerType: string;
    };
    edited: {
      layers: L.LayerGroup;
    };
    deleted: {
      layers: L.LayerGroup;
    };
  }

  export interface DrawCreate {
    layer: L.Layer;
    layerType: string;
  }

  export interface DrawEdit {
    layers: L.LayerGroup;
  }

  export interface DrawDelete {
    layers: L.LayerGroup;
  }
}
declare module "leaflet" {
  namespace Control {
    /**
     * Minimal type for L.Control.Draw
     */
    class Draw extends L.Control {
      constructor(opts?: Control.DrawConstructorOptions);
    }
    interface DrawConstructorOptions {
      draw?: DrawOptions;
      edit?: EditOptions;
    }
    interface DrawOptions {
      polygon?: any;
      polyline?: any;
      rectangle?: any;
      circle?: any;
      marker?: any;
      circlemarker?: any;
    }
    interface EditOptions {
      featureGroup: L.FeatureGroup;
      edit?: boolean;
      remove?: boolean;
    }
  }

  namespace Control.Draw {
    /** You can expand these as needed */
    interface ConstructorOptions {
      draw?: {
        polygon?: any;
        polyline?: any;
        rectangle?: any;
        circle?: any;
        marker?: any;
        circlemarker?: any;
      };
      edit?: {
        featureGroup: L.FeatureGroup;
        edit?: boolean;
        remove?: boolean;
      };
    }
  }
}
