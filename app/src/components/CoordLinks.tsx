import { formatCoords } from '@/lib/geolocation';
import { mapsDirUrl, mapsSearchUrl } from '@/lib/rota';

type Props = {
  lat: number;
  lng: number;
  showCoords?: boolean;
};

export function CoordLinks({ lat, lng, showCoords = false }: Props) {
  return (
    <span className="coord-links">
      {showCoords && <span className="coord-links__text">{formatCoords(lat, lng)} · </span>}
      <a href={mapsSearchUrl(lat, lng)} target="_blank" rel="noreferrer">
        Localizar no Google Maps
      </a>
      <span className="coord-links__sep"> · </span>
      <a href={mapsDirUrl(lat, lng)} target="_blank" rel="noreferrer">
        Navegar
      </a>
    </span>
  );
}
