import { useState } from 'react';
import { tradingApi } from '../api/client';
import { StrategyStatus } from '../api/types';

interface StrategyPanelProps {
  status: StrategyStatus | null;
  onToggle: (enabled: boolean) => Promise<void>;
  onEvaluate: () => Promise<void>;
  onEmergencyExit?: () => void;
  busy?: boolean;
}

export const StrategyPanel = ({
  status,
  onToggle,
  onEvaluate,
  onEmergencyExit,
  busy = false,
}: StrategyPanelProps) => {
  const [emergencyBusy, setEmergencyBusy] = useState(false);
  const [emergencyResult, setEmergencyResult] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleEmergencyExit = async () => {
    setShowConfirm(false);
    setEmergencyBusy(true);
    setEmergencyResult(null);
    try {
      const res = await tradingApi.emergencyExitAll('UI-PanicButton');
      setEmergencyResult(res.message ?? 'Emergency exit complete.');
      onEmergencyExit?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Emergency exit failed.';
      setEmergencyResult('ERROR: ' + msg);
    } finally {
      setEmergencyBusy(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-title-row">
        <h3>AI Strategy Control</h3>
        <span>
          {status?.risk.blocked
            ? `🔴 BLOCKED — ${status.risk.blockReason}`
            : `Auto-execute ON · Trade #${status?.risk.tradeCountToday ?? 0} today`}
        </span>
      </div>

      <div className="strategy-grid">
        <div>
          <p className="metric-label">Status</p>
          <h2>{status?.enabled ? 'Enabled' : 'Disabled'}</h2>
          <p className="metric-meta">Active: {status?.activeUnderlying ?? '--'}</p>
        </div>
        <div>
          <p className="metric-label">Trades Today</p>
          <h2>{status?.risk.tradeCountToday ?? 0}</h2>
          <p className="metric-meta">Open Positions: {status?.openPositions ?? 0}</p>
        </div>
        <div>
          <p className="metric-label">Daily PnL</p>
          <h2 style={{
            color: (status?.risk.dailyPnl ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)',
          }}>
            {(status?.risk.dailyPnl ?? 0) >= 0 ? '+' : ''}
            {(status?.risk.dailyPnl ?? 0).toFixed(2)}
          </h2>
          <p className="metric-meta">
            Loss Limit: {(status?.risk.dailyLossLimit ?? 0).toFixed(2)}
          </p>
        </div>
      </div>

      {status?.risk.blocked ? (
        <div className="banner banner-error">Strategy blocked: {status.risk.blockReason}</div>
      ) : null}

      <div className="strategy-actions">
        <button
          className="btn btn-primary"
          onClick={() => { void onToggle(!status?.enabled); }}
          disabled={busy || emergencyBusy}
        >
          {status?.enabled ? 'Disable Strategy' : 'Enable Strategy'}
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => { void onEvaluate(); }}
          disabled={busy || emergencyBusy}
        >
          Evaluate Signal Now
        </button>

        {/* ── PANIC BUTTON ──────────────────────────────────────────────── */}
        {!showConfirm ? (
          <button
            className="btn"
            style={{
              background: '#dc2626',
              color: '#fff',
              fontWeight: 700,
              border: '2px solid #991b1b',
              letterSpacing: '0.03em',
            }}
            onClick={() => setShowConfirm(true)}
            disabled={emergencyBusy}
            title="EMERGENCY: Closes all open positions immediately. Cannot be undone."
          >
            {emergencyBusy ? 'Exiting…' : '⚠ EMERGENCY EXIT ALL'}
          </button>
        ) : (
          <div style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            background: '#fef2f2',
            border: '2px solid #dc2626',
            borderRadius: 8,
            padding: '8px 12px',
          }}>
            <span style={{ color: '#991b1b', fontWeight: 600, fontSize: 13 }}>
              Close ALL positions now?
            </span>
            <button
              className="btn"
              style={{ background: '#dc2626', color: '#fff', padding: '4px 12px' }}
              onClick={() => { void handleEmergencyExit(); }}
            >
              YES, EXIT NOW
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 12px' }}
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {emergencyResult ? (
        <div
          className={`banner ${emergencyResult.startsWith('ERROR') ? 'banner-error' : 'banner-success'}`}
          style={{ marginTop: 8 }}
        >
          {emergencyResult}
        </div>
      ) : null}
    </div>
  );
};
