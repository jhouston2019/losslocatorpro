import { useMemo } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export default function MapboxMap({ events = [], properties = [] }) {
  const firstPoint = useMemo(() => {
    if (properties && properties.length > 0) {
      return {
        latitude: properties[0].lat || 37.8,
        longitude: properties[0].lng || -96,
      };
    }
    if (events && events.length > 0) {
      return {
        latitude: events[0].lat || 37.8,
        longitude: events[0].lng || -96,
      };
    }
    return { latitude: 37.8, longitude: -96 };
  }, [events, properties]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="map-container ci-card flex items-center justify-center text-sm text-slate-500 bg-slate-50">
        Mapbox token is not configured. Set NEXT_PUBLIC_MAPBOX_TOKEN to enable
        the interactive map.
      </div>
    );
  }

  return (
    <div className="map-container ci-card">
      <Map
        initialViewState={{
          latitude: firstPoint.latitude,
          longitude: firstPoint.longitude,
          zoom: 4,
        }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        {events.map((event) => (
          <Marker
            key={`event-${event.id}`}
            latitude={event.lat}
            longitude={event.lng}
            anchor="bottom"
          >
            <div className="h-3 w-3 rounded-full bg-sky-500 border-2 border-white shadow" />
          </Marker>
        ))}
        {properties.map((property) => (
          <Marker
            key={`property-${property.id}`}
            latitude={property.lat}
            longitude={property.lng}
            anchor="bottom"
          >
            <div className="h-3 w-3 rounded-full bg-emerald-500 border-2 border-white shadow" />
          </Marker>
        ))}
      </Map>
    </div>
  );
}



