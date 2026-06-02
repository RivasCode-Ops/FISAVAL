import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { OrdemServico, OsStatus } from '@/types';

const STATUS_CLASS: Partial<Record<OsStatus, string>> = {
  atribuida: 'painel-marker--nova',
  em_campo: 'painel-marker--campo',
  check_in: 'painel-marker--campo',
  em_vistoria: 'painel-marker--campo',
  pendente_sync: 'painel-marker--sync',
  homologacao: 'painel-marker--homolog',
  homologada: 'painel-marker--ok',
  concluida: 'painel-marker--ok',
  interrompida: 'painel-marker--stop',
};

function markerIcon(status: OsStatus, highlight: boolean) {
  const cls = STATUS_CLASS[status] ?? 'painel-marker--nova';
  return L.divIcon({
    className: 'rota-marker-wrap',
    html: `<span class="painel-marker ${cls}${highlight ? ' painel-marker--hl' : ''}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function FitBounds({ ordens }: { ordens: OrdemServico[] }) {
  const map = useMap();
  useEffect(() => {
    if (!ordens.length) return;
    const bounds = L.latLngBounds(ordens.map((o) => [o.lat, o.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 });
  }, [map, ordens]);
  return null;
}

type Props = {
  ordens: OrdemServico[];
  highlightId?: string;
  onSelect?: (o: OrdemServico) => void;
};

export function PainelMap({ ordens, highlightId, onSelect }: Props) {
  if (!ordens.length) {
    return (
      <div className="map-box map-box--painel map-box--empty">
        <span style={{ color: 'var(--muted)' }}>Nenhuma OS para exibir no mapa</span>
      </div>
    );
  }
  const center: [number, number] = [ordens[0].lat, ordens[0].lng];

  return (
    <div className="map-box map-box--painel">
      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer attribution="© OSM" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds ordens={ordens} />
        {ordens.map((o) => (
          <Marker
            key={o.id}
            position={[o.lat, o.lng]}
            icon={markerIcon(o.status, o.id === highlightId)}
            eventHandlers={{ click: () => onSelect?.(o) }}
          >
            <Popup>
              <strong>{o.id}</strong>
              <br />
              {o.inscricao}
              <br />
              <small>{o.endereco}</small>
              <br />
              <span>{o.fiscalNome}</span> · <em>{o.status}</em>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export const PAINEL_MAP_LEGEND: { className: string; label: string }[] = [
  { className: 'painel-marker--campo', label: 'Em campo / vistoria' },
  { className: 'painel-marker--sync', label: 'Pendente sync' },
  { className: 'painel-marker--homolog', label: 'Homologação' },
  { className: 'painel-marker--ok', label: 'Homologada / concluída' },
  { className: 'painel-marker--stop', label: 'Interrompida' },
  { className: 'painel-marker--nova', label: 'Atribuída / outras' },
];
