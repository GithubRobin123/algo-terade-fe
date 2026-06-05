import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from 'recharts';
import { getInstrumentLtp } from '../api/client';
import { SelectedOption } from './option-chain-table';

interface PriceTick {
  t: string;
  ltp: number;
}

interface OptionInstrumentPanelProps {
  option: SelectedOption;
  chainSymbol: string;
  onClose: () => void;
}

const MAX_POINTS = 60;

export const OptionInstrumentPanel = ({
  option,
  chainSymbol,
  onClose,
}: OptionInstrumentPanelProps) => {
  const [ticks, setTicks] = useState<PriceTick[]>([]);
  const [ltp, setLtp] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLtp = useCallback(async () => {
    try {
      const data = await getInstrumentLtp(option.instrumentKey);
      if (data.ltp != null) {
        const point: PriceTick = {
          t: new Date(data.sourceTimestamp).toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
          }),
          ltp: data.ltp,
        };
        setLtp(data.ltp);
        setTicks((prev) => [...prev.slice(-(MAX_POINTS - 1)), point]);
        setError(null);
      }
    } catch {
      setError('Could not fetch price');
    }
  }, [option.instrumentKey]);

  useEffect(() => {
    // Reset on new option
    setTicks([]);
    setLtp(null);
    setError(null);
    void fetchLtp();
    timerRef.current = setInterval(() => { void fetchLtp(); }, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchLtp]);

  const entryPrice = ticks[0]?.ltp ?? null;
  const change = ltp != null && entryPrice != null ? ltp - entryPrice : null;
  const changePct = change != null && entryPrice != null && entryPrice > 0 ? (change / entryPrice) * 100 : null;
  const isUp = change != null && change >= 0;
  const lineColor = isUp ? '#22c55e' : '#ef4444';

  const ltps = ticks.map((t) => t.ltp);
  const yMin = ticks.length > 1 ? Math.min(...ltps) * 0.998 : 'auto';
  const yMax = ticks.length > 1 ? Math.max(...ltps) * 1.002 : 'auto';

  return (
    <div className="option-instrument-panel">
      <div className="oip-header">
        <div className="oip-title-group">
          <span className={`oip-type-badge ${option.type === 'CE' ? 'oip-ce' : 'oip-pe'}`}>
            {option.type}
          </span>
          <strong className="oip-label">
            {chainSymbol} {option.label}
          </strong>
        </div>

        <div className="oip-price-group">
          <span className="oip-ltp">{ltp != null ? `₹${ltp.toFixed(2)}` : '…'}</span>
          {change != null && changePct != null && (
            <span className={`oip-change ${isUp ? 'oip-up' : 'oip-down'}`}>
              {isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
            </span>
          )}
        </div>

        <button className="btn btn-ghost btn-inline oip-close" onClick={onClose} title="Close">
          ✕
        </button>
      </div>

      {error ? (
        <p className="oip-error">{error} — instrument may be expired or unavailable</p>
      ) : ticks.length < 2 ? (
        <p className="oip-loading">Collecting data…</p>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={ticks} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
            <YAxis domain={[yMin, yMax]} hide />
            <Tooltip
              formatter={(v: number) => [`₹${v.toFixed(2)}`, 'LTP']}
              labelFormatter={(l: string) => l}
              contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 11 }}
            />
            {entryPrice != null && (
              <ReferenceLine
                y={entryPrice}
                stroke="rgba(245,158,11,0.6)"
                strokeDasharray="4 3"
                label={{ value: 'Open', fill: '#f59e0b', fontSize: 10, position: 'insideTopLeft' }}
              />
            )}
            <Line
              type="monotone"
              dataKey="ltp"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      <p className="oip-hint">
        Instrument: {option.instrumentKey} &nbsp;|&nbsp; {ticks.length} data points &nbsp;|&nbsp; refreshes every 5s
      </p>
    </div>
  );
};
