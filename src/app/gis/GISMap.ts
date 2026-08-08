import EsriMap from "@arcgis/core/Map.js";
import MapView from "@arcgis/core/views/MapView.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import Home from "@arcgis/core/widgets/Home.js";
import ScaleBar from "@arcgis/core/widgets/ScaleBar.js";
import Basemap from "@arcgis/core/Basemap.js";
import BasemapToggle from "@arcgis/core/widgets/BasemapToggle.js";
//import BasemapGallery from "@arcgis/core/widgets/BasemapGallery.js";
import ImageryLayer from "@arcgis/core/layers/ImageryLayer.js";
//import VectorTileLayer from "@arcgis/core/layers/VectorTileLayer.js";
import LayerView from "@arcgis/core/views/layers/FeatureLayerView";
//import Handle from "@arcgis/core/core/Handles";
import Viewpoint from "@arcgis/core/Viewpoint";

import { ownerService } from "../services/OwnerService";

let lockExtent = true;

export class GISMap {
  private map!: EsriMap;
  private view!: MapView;
  private graphicsLayer!: GraphicsLayer;
  private melkLayer!: FeatureLayer;
  private home!: Home;
  private scaleBar!: ScaleBar;
  private layerView!: LayerView;
  //private highlightHandle: IHandle | null = null;
  private highlightHandle: __esri.Handle | null = null;
  private customSatelliteBasemap!: Basemap;
  private defaultBasemap!: Basemap;
  private basemapToggle!: BasemapToggle;
  private homeViewpoint: Viewpoint | null = null;

  // private parcelService!: ParcelService;
  private readonly cNosaziField = "Code_nosazi";

  private readonly defaultSymbols = {
    polygon: {
      select: {
        type: "simple-fill",
        color: [135, 206, 235, 0.5],
        outline: {
          color: [0, 71, 171],
          width: 1.5,
          style: "dash",
        },
      },
      highlight: {
        type: "simple-fill",
        color: [255, 170, 51, 0.5],
        outline: {
          color: [255, 68, 51],
          width: 1.5,
          style: "dash",
        },
      },
    },

    polyline: {
      select: {
        type: "simple-line",
        color: [135, 206, 235],
        width: 3,
      },
      highlight: {
        type: "simple-line",
        color: [255, 68, 51],
        width: 4,
      },
    },

    point: {
      select: {
        type: "simple-marker",
        style: "circle",
        color: [135, 206, 235],
        size: 10,
        outline: {
          color: [255, 255, 255],
          width: 1,
        },
      },
      highlight: {
        type: "simple-marker",
        style: "circle",
        color: [255, 68, 51],
        size: 12,
        outline: {
          color: [0, 0, 0],
          width: 1.5,
        },
      },
    },
  };

  async initialize(container: HTMLDivElement) {
    //#region GIS CONFIG
    const map_ENDPOINT = "/api/maps";
    //const map_ENDPOINT = "http://192.168.10.3:6500/api/maps";

    const response = await fetch(map_ENDPOINT, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(`خطا در دریافت تنظیمات GIS: ${response.status}`);
      throw new Error(`خطا در دریافت تنظیمات GIS: ${response.status}`);
    }

    const config = await response.json();

    if (!config.isSuccess) {
      console.error("خطا در دریافت تنظیمات GIS");
      throw new Error("خطا در دریافت تنظیمات GIS");
    }

    const mapConfig = config.value;

    // Set Melk Service URL
    const melkLayerUrl =
      mapConfig?.address ||
      "/arcgis/rest/services/Maragheh/Maraghe_14050406/MapServer/1";

    // Set Basemap Service URL
    const customBasemapURL =
      mapConfig?.customBasemapURL ||
      "/arcgis/rest/services/Maragheh/Google2025/ImageServer";

    const geometryServiceAddress = mapConfig?.geometryServiceAddress;
    const printServiceAddress = mapConfig?.printServiceAddress;
    const arseLayerId = mapConfig?.arseLayerId;

    lockExtent = mapConfig?.locked ?? true;
    //#endregion

    //#region LAYERS
    this.melkLayer = new FeatureLayer({
      url: melkLayerUrl,
      minScale: 0,
    });

    this.graphicsLayer = new GraphicsLayer();
    //#endregion

    //#region BASEMAP
    this.customSatelliteBasemap = new Basemap({
      title: "Satellite",
      id: "customSatellite",
      thumbnailUrl: "../../../dist/images/Satellite.png",
      baseLayers: [
        new ImageryLayer({
          url: customBasemapURL,
        }),
      ],
    });
    //#endregion

    //#region MAP
    this.map = new EsriMap({
      basemap: "osm",
      layers: [this.melkLayer, this.graphicsLayer],
    });

    this.defaultBasemap = this.map.basemap;

    this.view = new MapView({
      container,
      map: this.map,
    });
    //#endregion

    //#region VIEW UI
    this.scaleBar = new ScaleBar({
      view: this.view,
      unit: "metric",
    });

    this.view.ui.add(this.scaleBar, "bottom-left");
    this.view.ui.remove("attribution");
    this.view.ui.remove("zoom");

    this.view.popup.dockEnabled = false;
    this.view.popup.dockOptions = {
      buttonEnabled: false,
      breakpoint: false,
    };

    this.view.popup.collapseEnabled = false;
    this.view.popup.visibleElements = {
      closeButton: true,
      featureNavigation: false,
      actionBar: false,
    };
    //#endregion

    //#region LOCK EXTENT
    if (lockExtent) {
      this.view.navigation.mouseWheelZoomEnabled = false;
      this.view.navigation.browserTouchPanEnabled = false;
      this.view.navigation.momentumEnabled = false;

      this.view.on("drag", (e) => e.stopPropagation());
      this.view.on("double-click", (e) => e.stopPropagation());
      this.view.on("mouse-wheel", (e) => e.stopPropagation());

      this.view.on("key-down", (e) => {
        if (
          e.key === "+" ||
          e.key === "-" ||
          e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight"
        ) {
          e.stopPropagation();
        }
      });
    }
    //#endregion

    //#region WAIT FOR VIEW AND LAYER
    await this.view.when();
    await this.melkLayer.when();

    this.layerView = await this.view.whenLayerView(this.melkLayer);
    //#endregion

    //#region EXTENT
    const extent = this.melkLayer.fullExtent?.clone();

    if (extent) {
      extent.expand(1.2);

      // تنظیم محدودیت قبل از goTo
      this.view.constraints = {
        geometry: extent,
        minZoom: 14,
        maxZoom: 22,
        rotationEnabled: false,
      };

      try {
        await this.view.goTo(extent, {
          animate: false,
        });
      } catch (error: any) {
        if (error?.name !== "view:goto-interrupted") {
          console.error("خطا در رفتن به extent:", error);
        }
      }

      this.homeViewpoint = new Viewpoint({
        targetGeometry: extent,
      });

      this.home = new Home({
        view: this.view,
        viewpoint: {
          targetGeometry: extent,
        },
      });
    }
    //#endregion

    //#region BASEMAP TOGGLE
    this.basemapToggle = new BasemapToggle({
      view: this.view,
      nextBasemap: this.customSatelliteBasemap,
    });

    // this.view.ui.add(this.basemapToggle, "bottom-right");
    //#endregion

    //#region EVENTS
    if (!lockExtent) {
      this.registerEvents();
    }
    //#endregion
  }

  // async findParcel(code: string) {
  //   const result = await this.parcelService.findByCodeNosazi(code);

  //   if (result.features.length === 0) {
  //     return;
  //   }
  //   const feature = result.features[0];

  //   await this.view.goTo(feature.geometry);
  //   this.highlightHandle?.remove();
  //   this.highlightHandle = this.layerView.highlight(feature);

  //   return {
  //       attributes: feature.attributes,
  //       geometry: feature.geometry
  //   };
  // }

  private removeGraphics(geometryType: string, graphicType: string): void {
    const graphicsToRemove = this.graphicsLayer.graphics.filter(
      (g) =>
        g.attributes &&
        g.attributes._geometryType === geometryType &&
        g.attributes._type === graphicType,
    );

    graphicsToRemove.forEach((g) => this.graphicsLayer.remove(g));
  }

  private addManagedGraphic(
    geometry: any,
    type: "select" | "highlight",
    attributes: Record<string, any> = {},
  ): void {
    const graphic = new Graphic({
      geometry,
      symbol:
        this.defaultSymbols[geometry.type as "polygon" | "polyline" | "point"][
          type
        ],
      attributes: {
        ...attributes,
        _geometryType: geometry.type,
        _type: type,
      },
      //popupTemplate: melkPopupTemplate
    });

    this.graphicsLayer.add(graphic);
  }

  private async selectByAttribute(
    featureLayer: FeatureLayer,
    field: string = "1",
    value: string | number = 1,
    operation: string = "=",
    options: any = {},
  ): Promise<any[]> {
    await featureLayer.when();
    const query = featureLayer.createQuery();
    query.returnGeometry = options.returnGeometry ?? true;
    query.outFields = options.outFields || ["*"];

    // Handler number vs string
    const isNumber = typeof value === "number";
    const formattedValue = isNumber ? value : `'${value}'`;
    query.where = `${field} ${operation} ${formattedValue}`;

    const featureSet = await featureLayer.queryFeatures(query);

    return featureSet.features || [];
  }

  private async selectByLocation(
    featureLayer: FeatureLayer,
    geometry: any,
    options: any = {},
  ): Promise<any[]> {
    await featureLayer.when();

    const query = featureLayer.createQuery();

    query.geometry = geometry;
    query.spatialRelationship = options.spatialRelationship || "intersects";
    query.outFields = options.outFields || ["*"];
    query.returnGeometry = options.returnGeometry ?? true;
    query.distance = options.distance;
    query.units = options.units;

    const featureSet = await featureLayer.queryFeatures(query);

    return featureSet.features || [];
  }

  private isValidCNosaziMelk(cNosazi: string): boolean {
    // The type of Code Nosazi must be String
    if (!cNosazi || typeof cNosazi !== "string") {
      // throw new Error("The type of Code Nosazi must be String."); //En
      return false;
    }

    // The length of Code Nosazi must be exactly seven parts
    const parts = cNosazi.trim().split("-");
    if (parts.length !== 7) {
      // throw new Error("The length of Code Nosazi must be exactly seven."); //En
      return false;
    }

    // All Parts must be numeric
    if (parts.some((p) => !/^\d+$/.test(p))) {
      // throw new Error("All Parts of Code Nosazi must be numeric."); //En
      return false;
    }

    // The last three parts must be exactly zero
    if (parts[4] !== "0" || parts[5] !== "0" || parts[6] !== "0") {
      // throw new Error("The last three parts of Code Nosazi must be exactly zero."); //En
      return false;
    }

    // Sections 1, 2, 3, and 4 must not be blank or zero
    if (parts.slice(0, 4).some((p) => p === "0")) {
      // throw new Error("Sections 1, 2, 3, and 4 of Code Nosazi must not be zero."); //En
      return false;
    }

    return true;
  }

  private async getMelk(cNosazi: string): Promise<any> {
    // If the incoming code is not valid, try normalizing by forcing
    // the last three parts to zero (for building/shop/apartment codes)
    //cNosazi = "1-1-1-1-0-0-0";
    try {
    const normalized = (() => {
      try {
        const parts = String(cNosazi).trim().split("-");
        if (parts.length === 7 && parts.every((p) => /^\d+$/.test(p))) {
          const p = parts.slice();
          p[4] = "0";
          p[5] = "0";
          p[6] = "0";
          return p.join("-");
        }
      } catch {
        /* ignore */
      }
      return cNosazi;
    })();

    if (!this.isValidCNosaziMelk(normalized)) {
      throw new Error(`کد نوسازی (\u202A${cNosazi}\u202C) معتبر نیست!`); //Pr
    }

    const result = await this.selectByAttribute(
      this.melkLayer,
      this.cNosaziField,
      normalized,
    );
      if (!result.length) {
          throw new Error(`ملکی با کد نوسازی (\u202A${normalized}\u202C) در نقشه یافت نشد.`); //Pr
      }

    return result[0];
    } catch (err) {
      console.log(err.message); 
      return null;
    }    
  }

  private unionExtent(geoList: any[]): any {
    if (geoList.length === 0) throw new Error(`هیچ عارضه‌ای یافت نشد.`);
    let extent = geoList[0].extent.clone();
    for (let i = 1; i < geoList.length; i++) {
      extent = extent.union(geoList[i].extent);
    }
    return extent.expand(1.3);
  }
  private generatePopupTableHTML(
    rowsArray: { label: string; value: any }[],
  ): string {
    return `
    <table style="width:100%; max-width:100%; table-layout:fixed; border-collapse:collapse; font-size:12px;">
      <tbody>
        ${rowsArray
          .map(
            (row) => `
          <tr>
            <td style="width:38%; padding:4px 8px; border:1px solid #ddd; font-weight:bold; overflow-wrap:anywhere;">
              ${row.label}
            </td>
            <td style="padding:4px 8px; border:1px solid #ddd; overflow-wrap:anywhere; word-break:break-word;">
              ${row.value}
            </td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>`;
  }

  private registerEvents() {
    // View Handler
    this.view.on("key-down", (e) => {
      if (e.key === "Escape") {
        this.graphicsLayer?.removeAll();
      }
    });

    // Find Melk by Click in Map
    this.view.on("click", async (event) => {
      this.onMapClick(event);
    });
  }
  private async onMapClick(event: __esri.ViewClickEvent) {
    try {
      // 1. Find Melk
      const features = await this.selectByLocation(
        this.melkLayer,
        event.mapPoint,
        {
          spatialRelationship: "intersects",
          distance: 2,
          units: "meters",
        },
      );
      if (!features.length) {
        return;
      }

      // 2. Fit View to Melk Extent
      const featureMelk = features[0];
      const attMelk = featureMelk.attributes;
      const geoMelk = featureMelk.geometry;
      const extentMelk = geoMelk.extent.expand(4);
      this.view.goTo(extentMelk);

      // 3. Add Graphic to Map
      this.removeGraphics(geoMelk.type, "select");
      this.addManagedGraphic(geoMelk, "select", attMelk);

      // 4. Get Name Malk from Shahrsazi
      var cNosazi = attMelk[this.cNosaziField];
      const nameMalek = await ownerService.getOwnerName(cNosazi);
      const area = this.firstValue(
        attMelk["SHAPE.STArea()"],
        attMelk["Shape.STArea()"],
        attMelk["SHAPE_Area"],
        attMelk["Shape_Area"],
        attMelk["Shape__Area"],
        attMelk["AREA"],
        attMelk["Area"],
        attMelk["area"],
      );

      const rows = [
        { label: "کد نوسازی", value: cNosazi || "نامشخص" },
        { label: "نام مالک", value: nameMalek || "نامشخص" },
        {
          label: "مساحت",
          value: area != null ? Number(area).toFixed(2) : "نامشخص",
        },
      ];

      // Sort Rows by Label or ...
      //rows.sort((a, b) => a.label.localeCompare(b.label));

      // 5. Oprn Popup
      this.view.openPopup({
        title: "اطلاعات ملک",
        location: geoMelk.extent.center,
        content: this.generatePopupTableHTML(rows),
      });

      // 6. Export Data
    } catch {}
  }

  private firstValue = (...values: unknown[]) => {
    for (const value of values) {
      if (value !== null && value !== undefined && value !== "") {
        return value;
      }
    }

    return null;
  };

  public async selectMelkByCodeNosazi(cNosazi: any) {
    try {
      // 1. Find Melk in Map & Fit View to Melk Extent
      const featureMelk = await this.getMelk(cNosazi);
      const geoMelk = featureMelk.geometry;
      const extentMelk = geoMelk.extent.expand(4);
      this.view.goTo(extentMelk);

      // 2. Add Graphic to Map
      this.removeGraphics(geoMelk.type, "select");
      this.addManagedGraphic(geoMelk, "select", featureMelk.attributes);

      // 3. Export Data
    } catch {}
  }

  public async highlightMelkByCodeNosazi(cNosaziList: any[]) {
    try {
      // 1. Init
      let geoHighlights = [];
      this.removeGraphics("polygon", "highlight");

      for (const cNosazi of cNosaziList) {
        try {
          // 2. Load FLayerMelk
          await this.melkLayer.when();

          // 3. Find Melk & Add Graphic to Map
          const featureMelk = await this.getMelk(cNosazi);
          const geoMelk = featureMelk.geometry;
          this.addManagedGraphic(geoMelk, "highlight", featureMelk.attributes);
          geoHighlights.push(geoMelk);
        } catch {
          continue;
        }
      }
      // 4. Fit View to Highlights extent
      const extent = this.unionExtent(geoHighlights);
      await this.view.goTo(extent, { animate: true });
    } catch {}
  }

  public clearGraphics() {
    this.view.closePopup();
    this.graphicsLayer?.removeAll();
  }

  public goHome() {
    if (!this.homeViewpoint) return;

    this.view.goTo(this.homeViewpoint, {
      duration: 1000,
    });
  }

  public zoomIn() {
    if (!this.view) return;

    const maxZoom = this.view.constraints.maxZoom ?? 0;
    if (this.view.zoom >= maxZoom) {
      return;
    }

    this.view.goTo({
      zoom: this.view.zoom + 1,
    });
  }

  public zoomOut() {
    if (!this.view) return;

    const minZoom = this.view.constraints.minZoom ?? 0;
    if (this.view.zoom <= minZoom) {
      return;
    }

    this.view.goTo({
      zoom: this.view.zoom - 1,
    });
  }

  public toggleBasemap() {
    this.map.basemap =
      this.map.basemap === this.customSatelliteBasemap
        ? this.defaultBasemap
        : this.customSatelliteBasemap;
  }

  public mapLockExtent(){
    return !lockExtent;
  }

  destroy() {
    this.view?.destroy();
  }
}
