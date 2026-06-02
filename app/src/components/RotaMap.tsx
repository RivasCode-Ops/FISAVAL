import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { OrdemServico } from '@/types';

const lineColor = '#3b82f6';

function markerIcon(ordem: number, selected: boolean) {
  return L.divIcon({
    className: 'rota-marker-wrap',
    html: `<span class="rota-marker${selected ? ' rota-marker--sel' : ''}">${ordem}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

type Props = {
  ordens: OrdemServico[];
  selectedId?: string;
  onSelect?: (o: OrdemServico) => void;
};

export function RotaMap({ ordens, selectedId, onSelect }: Props) {
  if (!ordens.length) {
    return (
      <div className="map-box map-box--empty">
        <span style={{ color: 'var(--muted)' }}>Sem OS na rota</span>
      </div>
    );
  }
  const center: [number, number] = [ordens[0].lat, ordens[0].lng];
  const path: [number, number][] = ordens.map((o) => [o.lat, o.lng]);

  return (
    <div className="map-box map-box--rota">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
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
      </MapContainer>
    </div>
  );
}
