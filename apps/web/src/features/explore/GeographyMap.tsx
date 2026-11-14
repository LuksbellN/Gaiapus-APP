import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

export default function GeographyMap({ center }: { center: [number, number] }) {
  const element = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    let map: import("maplibre-gl").Map | undefined;
    void import("maplibre-gl")
      .then(
        ({ Map, NavigationControl, Marker, setWorkerUrl, setWorkerCount }) => {
          if (disposed || !element.current) return;
          try {
            setWorkerUrl(workerUrl);
            setWorkerCount(1);
            map = new Map({
              container: element.current,
              center,
              zoom: 3.1,
              attributionControl: false,
              style: {
                version: 8,
                sources: {
                  brazil: { type: "geojson", data: "/art/brazil.geojson" },
                  states: { type: "geojson", data: "/art/states.geojson" },
                },
                layers: [
                  {
                    id: "ocean",
                    type: "background",
                    paint: { "background-color": "#071a34" },
                  },
                  {
                    id: "land",
                    type: "fill",
                    source: "brazil",
                    paint: { "fill-color": "#235b50" },
                  },
                  {
                    id: "state-fill",
                    type: "fill",
                    source: "states",
                    paint: { "fill-color": "#43815e", "fill-opacity": 0.28 },
                  },
                  {
                    id: "state-lines",
                    type: "line",
                    source: "states",
                    paint: {
                      "line-color": "#94b68a",
                      "line-width": 0.6,
                      "line-opacity": 0.6,
                    },
                  },
                  {
                    id: "coast",
                    type: "line",
                    source: "brazil",
                    paint: { "line-color": "#66d8e6", "line-width": 1.4 },
                  },
                ],
              },
            });
            map.addControl(new NavigationControl(), "top-left");
            new Marker({ color: "#63dcff" }).setLngLat(center).addTo(map);
            map.on("load", () => {
              if (!disposed) setReady(true);
            });
            map.on("error", (event) => {
              console.warn(
                "Geographic map source error:",
                event.error?.message,
              );
              if (!disposed) setFailed(true);
            });
            map
              .getCanvas()
              .addEventListener("webglcontextlost", () => setFailed(true));
          } catch {
            setFailed(true);
          }
        },
      )
      .catch(() => setFailed(true));
    return () => {
      disposed = true;
      map?.remove();
    };
  }, [center[0], center[1]]);
  return (
    <div className="geography-map">
      <div
        ref={element}
        className="map-canvas"
        aria-label="Mapa geográfico do Brasil"
      />
      {!ready && !failed && (
        <div className="map-message">
          <LoaderCircle className="spin" />
          Carregando mapa…
        </div>
      )}
      {failed && (
        <div className="map-message">
          O mapa não está disponível neste dispositivo. A busca de locais e os
          exemplos continuam acessíveis.
        </div>
      )}
      <span className="map-attribution">
        Base geográfica do protótipo Gaiapus · sem camada analítica
      </span>
    </div>
  );
}
