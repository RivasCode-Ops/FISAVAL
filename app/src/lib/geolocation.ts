export type GeoCapture = {
  lat: number;
  lng: number;
  accuracyM: number;
  timestamp: number;
};

export type GeoErrorCode =
  | 'UNSUPPORTED'
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNKNOWN';

export type GeoCaptureResult =
  | { ok: true; position: GeoCapture }
  | { ok: false; code: GeoErrorCode; message: string };

const DEFAULT_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 15_000,
};

const ERROR_MESSAGES: Record<GeoErrorCode, string> = {
  UNSUPPORTED: 'Geolocalização não suportada neste navegador.',
  PERMISSION_DENIED:
    'Permissão de localização negada. Permita o site em Configurações do navegador e ative Localização no Windows.',
  POSITION_UNAVAILABLE:
    'Posição indisponível. Ative o serviço de Localização do Windows e tente novamente.',
  TIMEOUT: 'Tempo esgotado ao obter GPS. Tente de novo em área com melhor sinal ou Wi-Fi.',
  UNKNOWN: 'Não foi possível obter a localização.',
};

function codeFromError(err: GeolocationPositionError | null): GeoErrorCode {
  if (!err) return 'UNKNOWN';
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'PERMISSION_DENIED';
    case err.POSITION_UNAVAILABLE:
      return 'POSITION_UNAVAILABLE';
    case err.TIMEOUT:
      return 'TIMEOUT';
    default:
      return 'UNKNOWN';
  }
}

export function geoErrorMessage(code: GeoErrorCode): string {
  return ERROR_MESSAGES[code];
}

export function formatCoords(lat: number, lng: number, digits = 5): string {
  return `${lat.toFixed(digits)}, ${lng.toFixed(digits)}`;
}

export function capturePosition(options?: PositionOptions): Promise<GeoCaptureResult> {
  if (!navigator.geolocation) {
    return Promise.resolve({
      ok: false,
      code: 'UNSUPPORTED',
      message: ERROR_MESSAGES.UNSUPPORTED,
    });
  }
  const opts = { ...DEFAULT_OPTIONS, ...options };
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          ok: true,
          position: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyM: pos.coords.accuracy,
            timestamp: pos.timestamp,
          },
        });
      },
      (err) => {
        const code = codeFromError(err);
        resolve({ ok: false, code, message: ERROR_MESSAGES[code] });
      },
      opts,
    );
  });
}

/** Atualiza posição na tela por `durationMs` e retorna função para parar o watch. */
export function watchPositionBrief(
  onUpdate: (pos: GeoCapture) => void,
  durationMs = 10_000,
  options?: PositionOptions,
): () => void {
  if (!navigator.geolocation) return () => {};
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const id = navigator.geolocation.watchPosition(
    (pos) => {
      onUpdate({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyM: pos.coords.accuracy,
        timestamp: pos.timestamp,
      });
    },
    () => {},
    opts,
  );
  const timer = window.setTimeout(() => navigator.geolocation.clearWatch(id), durationMs);
  return () => {
    window.clearTimeout(timer);
    navigator.geolocation.clearWatch(id);
  };
}
