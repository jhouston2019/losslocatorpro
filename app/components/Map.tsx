"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LossEvent } from "@/lib/database.types";

interface MapProps {
  events: LossEvent[];
}

// Validate coordinates are within valid ranges
function isValidCoordinate(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }
  if (isNaN(lat) || isNaN(lng)) {
    return false;
  }
  // Valid latitude: -90 to 90, longitude: -180 to 180
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// Fix for default marker icon in Next.js
const createMarkerIcon = (severity: number) => {
  try {
    const safeSeverity = typeof severity === 'number' && !isNaN(severity) ? severity : 0;
    const color = safeSeverity >= 75 ? '#ef4444' : safeSeverity >= 50 ? '#f59e0b' : '#22c55e';
    
    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      `)}`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  } catch (error) {
    console.warn('Error creating marker icon:', error);
    // Return default icon if creation fails
    return new Icon.Default();
  }
};

export default function RealMap({ events }: MapProps) {
  // Defensive: ensure events is an array
  const safeEvents = Array.isArray(events) ? events : [];
  
  // Filter events that have valid coordinates
  const eventsWithCoords = safeEvents.filter(e => {
    if (!e || !e.id) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Map: Invalid event object', e);
      }
      return false;
    }
    return isValidCoordinate(e.lat, e.lng);
  });
  
  // Calculate center based on events or default to Houston
  const center: [number, number] = eventsWithCoords.length > 0 && 
    isValidCoordinate(eventsWithCoords[0].lat, eventsWithCoords[0].lng)
    ? [eventsWithCoords[0].lat!, eventsWithCoords[0].lng!]
    : [29.7604, -95.3698];

  // Show empty state if no valid events
  if (eventsWithCoords.length === 0) {
    return (
      <div className="w-full h-[400px] rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
        <p className="text-slate-600 text-sm">No loss events with valid coordinates to display</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden border border-gray-200" style={{ boxShadow: 'var(--panel-shadow)' }}>
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap Contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {eventsWithCoords.map((event) => {
          try {
            return (
              <Marker
                key={event.id}
                position={[event.lat!, event.lng!]}
                icon={createMarkerIcon(event.severity)}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold text-slate-900">{event.event_type || 'Unknown'}</p>
                    <p className="text-slate-700">Severity: {event.severity || 0}</p>
                    <p className="text-slate-700">ZIP: {event.zip || 'N/A'}</p>
                    <p className="text-slate-700">Probability: {((event.claim_probability || 0) * 100).toFixed(0)}%</p>
                    {event.id && (
                      <a 
                        href={`/property/${event.id}`}
                        className="text-blue-600 hover:underline text-xs"
                        onClick={(e) => {
                          // Validate ID before navigation
                          if (!event.id || event.id.trim() === '') {
                            e.preventDefault();
                            console.warn('Invalid property ID');
                          }
                        }}
                      >
                        View Details
                      </a>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          } catch (error) {
            // Silently skip markers that fail to render
            if (process.env.NODE_ENV === 'development') {
              console.warn('Failed to render marker for event:', event.id, error);
            }
            return null;
          }
        })}
      </MapContainer>
    </div>
  );
}



