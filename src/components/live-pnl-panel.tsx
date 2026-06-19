import { useEffect, useRef, useState } from 'react';
import { StrategyPosition } from '../api/types';
import { formatNumber, formatOptionLabel, formatPrice } from '../lib/format';

interface LivePnlPanelProps {
  positions: StrategyPosition[];
  onClosePosition: (p: StrategyPosition) => Promise<void>;
  busy?: boolean;
}

const pnlClass = (v: number | null | undefined) => {
  if (v == null || Number.isNaN(v)) return '';
  return v >= 0 ? 'side-buy' : 'side-sell';
};

export const LivePnlPanel = ({ positions, onClosePosition, busy = false }: LivePnlPanelProps) => {
  const open = positions.filter((p) => p.status === 'OPEN');
  const [pulse, setPulse] = useState(false);
  const prevPnlRef = useRef<number>(0);

  const totalPnl = open.reduce((sum, p) => sum + (p.unrealizedPnl ?? 0), 0);

  // Flash pulse dot whenever totalPnl changes
  useEffect(() => {
    if (totalPnl !== prevPnlRef.current) {
      prevPnlRef.current = totalPnl;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 600);
      return () => clearTimeout(t);
    }
  }, [totalPnl]);

  if (!open.length) return null;

  return (
    <div className="panel live-pnl-panel">
      <div className="panel-title-row">
        <h3>
          <span className={`live-dot ${pulse ? 'live-dot-pulse' : ''}`} />
          Open Trades — Live P&amp;L
        </h3>
        <span className={`live-pnl-total ${pnlClass(totalPnl)}`}>
          Total: {totalPnl >= 0 ? '+' : ''}{formatPrice(totalPnl)}
          <span className="pnl-refresh-hint"> · updates every 5s</span>
        </span>
      </div>

      <div className="pnl-card-grid">
        {open.map((pos) => {
          const pnl = pos.unrealizedPnl ?? 0;
          const entry = pos.entryPrice ?? 0;
          const current = pos.currentPrice ?? entry;
          const pnlPct = entry > 0 ? ((current - entry) / entry) * 100 * (pos.side === 'BUY' ? 1 : -1) : 0;
          const localPnl = pos.side === 'BUY'
            ? (current - entry) * pos.quantity
            : (entry - current) * pos.quantity;

          const meta = pos.metadata as Record<string, unknown>;
          const optionLabel = formatOptionLabel(pos.symbol, meta);
          const indexLtpAtEntry = meta?.indexLtp as number | undefined;
          const expiryDate = meta?.expiryDate as string | undefined;

          return (
            <div key={pos.id} className={`pnl-card ${localPnl >= 0 ? 'pnl-card-profit' : 'pnl-card-loss'}`}>
              <div className="pnl-card-top">
                <span className={`pnl-side-badge ${pos.side === 'BUY' ? 'side-buy' : 'side-sell'}`}>
                  {pos.side}
                </span>
                <strong className="pnl-symbol" title={pos.instrumentKey}>{optionLabel}</strong>
                <span className="pnl-qty">×{pos.quantity}</span>
              </div>

              {(indexLtpAtEntry || expiryDate) && (
                <div className="pnl-meta-row" style={{ fontSize: '0.72rem', opacity: 0.7, marginBottom: '2px' }}>
                  {indexLtpAtEntry && <span>Index at entry: {formatPrice(indexLtpAtEntry)}</span>}
                  {expiryDate && <span style={{ marginLeft: '8px' }}>Expiry: {expiryDate}</span>}
                </div>
              )}

              <div className="pnl-prices">
                <span>Entry <strong>{formatPrice(pos.entryPrice)}</strong></span>
                <span>LTP <strong>{formatPrice(pos.currentPrice)}</strong></span>
              </div>

              <div className="pnl-value-row">
                <span className={`pnl-value ${pnlClass(localPnl)}`}>
                  {localPnl >= 0 ? '+' : ''}{formatPrice(localPnl)}
                </span>
                <span className={`pnl-pct ${pnlClass(pnlPct)}`}>
                  {pnlPct >= 0 ? '+' : ''}{formatNumber(pnlPct)}%
                </span>
              </div>

              <div className="pnl-sl-target">
                <span>SL {formatPrice(pos.stopLossPrice)}</span>
                <span>Target {formatPrice(pos.targetPrice)}</span>
              </div>

              <button
                className="btn btn-ghost btn-inline pnl-close-btn"
                disabled={busy}
                onClick={() => void onClosePosition(pos)}
              >
                Close
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
