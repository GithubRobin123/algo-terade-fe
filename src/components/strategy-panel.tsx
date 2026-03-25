import { StrategyStatus } from '../api/types';

interface StrategyPanelProps {
  status: StrategyStatus | null;
  onToggle: (enabled: boolean) => Promise<void>;
  onEvaluate: () => Promise<void>;
  busy?: boolean;
}

export const StrategyPanel = ({ status, onToggle, onEvaluate, busy = false }: StrategyPanelProps) => {
  return (
    <div className="panel">
      <div className="panel-title-row">
        <h3>AI Strategy Control</h3>
        <span>Max 2 auto-trades/day + risk guardrails</span>
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
          <h2>{(status?.risk.dailyPnl ?? 0).toFixed(2)}</h2>
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
          onClick={() => {
            void onToggle(!status?.enabled);
          }}
          disabled={busy}
        >
          {status?.enabled ? 'Disable Strategy' : 'Enable Strategy'}
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => {
            void onEvaluate();
          }}
          disabled={busy}
        >
          Evaluate Signal Now
        </button>
      </div>
    </div>
  );
};
