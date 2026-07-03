import { useEffect } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { OrdemServico } from '@/types';

const lineColor = '#3b82f6';

export type MapGeoPoint = { lat: number; lng: number };

function markerIcon(ordem: number, selected: boolean) {
  return L.divIcon({
    className: 'rota-marker-wrap',
    html: `<span class="rota-marker${selected ? ' rota-marker--sel' : ''}">${ordem}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function dotIcon(color: string, title: string) {
  return L.divIcon({
    className: 'rota-marker-wrap',
    html: `<span class="rota-dot" style="background:${color}" title="${title}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function MapRecenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center[0], center[1], zoom, map]);
  return null;
}

type Props = {
  ordens: OrdemServico[];
  selectedId?: string;
  onSelect?: (o: OrdemServico) => void;
  userPosition?: MapGeoPoint;
  checkInPosition?: MapGeoPoint;
};

export function RotaMap({ ordens, selectedId, onSelect, userPosition, checkInPosition }: Props) {
  if (!ordens.length) {
    return (
      <div className="map-box map-box--empty">
        <span style={{ color: 'var(--muted)' }}>Sem OS na rota</span>
      </div>
    );
  }

  const selected = ordens.find((o) => o.id === selectedId);
  const center: [number, number] = userPosition
    ? [userPosition.lat, userPosition.lng]
    : selected
      ? [selected.lat, selected.lng]
      : [ordens[0].lat, ordens[0].lng];
  const path: [number, number][] = ordens.map((o) => [o.lat, o.lng]);
  const mapKey = selectedId ?? ordens[0]?.id ?? 'rota';

  return (
    <div className="map-box map-box--rota">
      <MapContainer
        key={mapKey}
        center={center}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <MapRecenter center={center} zoom={14} />
        <TileLayer attribution="© OSM" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline positions={path} pathOptions={{ color: lineColor, weight: 3, opacity: 0.7 }} />
        {ordens.map((o) => (
          <Marker
            key={o.id}
            position={[o.lat, o.lng]}
            icon={markerIcon(o.rotaOrdem, o.id === selectedId)}
            eventHandlers={{
              click: () => onSelect?.(o),
            }}
          />
        ))}
        {checkInPosition && (
          <Marker
            position={[checkInPosition.lat, checkInPosition.lng]}
            icon={dotIcon('#22c55e', 'Check-in GPS')}
          />
        )}
        {userPosition && (
          <Marker position={[userPosition.lat, userPosition.lng]} icon={dotIcon('#f97316', 'Você agora')} />
        )}
      </MapContainer>
      <div className="map-legend" aria-hidden>
        <span className="map-legend__item">
          <i className="map-legend__dot map-legend__dot--os" /> OS
        </span>
        {checkInPosition && (
          <span className="map-legend__item">
            <i className="map-legend__dot map-legend__dot--checkin" /> Check-in
          </span>
        )}
        {userPosition && (
          <span className="map-legend__item">
            <i className="map-legend__dot map-legend__dot--user" /> Você
          </span>
        )}
      </div>
    </div>
  );
}
