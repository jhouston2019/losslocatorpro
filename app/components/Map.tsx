// @ts-nocheck
"use client";

import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function RealMap() {
  return (
    <div className="w-full h-[260px] rounded-xl overflow-hidden shadow-card">
      <MapContainer
        center={[29.7604, -95.3698]} // Houston default
        zoom={6}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap Contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
    </div>
  );
}



