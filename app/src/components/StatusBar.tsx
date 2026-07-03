type Props = {
  online: boolean;
  apiMode?: boolean;
  apiOk?: boolean;
  apiChecking?: boolean;
  apiStorage?: string;
};

export function StatusBar({ online, apiMode, apiOk, apiChecking, apiStorage }: Props) {
  return (
    <div className="status-bar stack stack--xs">
      <span className="offline-pill" data-on={online ? 'true' : 'false'}>
        {online ? '● Online' : '○ Offline'}
      </span>
      {apiMode && (
        <span className="offline-pill api-pill" data-on={apiOk ? 'true' : 'false'}>
          {apiChecking ? '… API' : apiOk ? `● API (${apiStorage ?? 'ok'})` : '○ API off'}
        </span>
      )}
    </div>
  );
}
