import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MarketTick } from '../api/types';
import { formatPrice, formatTime } from '../lib/format';

export type ChartMode = 'line' | 'candle';

interface PriceChartProps {
  ticks: MarketTick[];
  title?: string;
  mode?: ChartMode;
  onModeChange?: (mode: ChartMode) => void;
}

interface CandlePoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  wickBase: number;
  wickSize: number;
  bodyBase: number;
  bodySize: number;
  trend: 'up' | 'down';
}

const buildCandles = (ticks: MarketTick[]): CandlePoint[] => {
  const buckets = new Map<string, CandlePoint>();

  for (const tick of ticks) {
    const date = new Date(tick.sourceTimestamp);
    date.setSeconds(0, 0);

    const key = date.toISOString();
    const existing = buckets.get(key);

    if (!existing) {
      buckets.set(key, {
        time: formatTime(key),
        open: tick.ltp,
        high: tick.ltp,
        low: tick.ltp,
        close: tick.ltp,
        wickBase: tick.ltp,
        wickSize: 0,
        bodyBase: tick.ltp,
        bodySize: 0,
        trend: 'up',
      });
      continue;
    }

    existing.high = Math.max(existing.high, tick.ltp);
    existing.low = Math.min(existing.low, tick.ltp);
    existing.close = tick.ltp;
  }

  return Array.from(buckets.values())
    .map((item) => {
      const bodyBase = Math.min(item.open, item.close);
      const rawBody = Math.abs(item.close - item.open);

      return {
        ...item,
        wickBase: item.low,
        wickSize: Math.max(item.high - item.low, 0.0001),
        bodyBase,
        bodySize: Math.max(rawBody, 0.0001),
        trend: (item.close >= item.open ? 'up' : 'down') as 'up' | 'down',
      };
    })
    .slice(-120);
};

export const PriceChart = ({ ticks, title = 'Live Price', mode = 'line', onModeChange }: PriceChartProps) => {
  if (!ticks.length) {
    return <div className="empty-state">Waiting for live market ticks...</div>;
  }

  const lineData = ticks.map((tick) => ({
    time: formatTime(tick.sourceTimestamp),
    price: tick.ltp,
  }));

  const candles = buildCandles(ticks);

  return (
    <div className="panel chart-panel">
      <div className="panel-title-row">
        <h3>{title}</h3>
        <div className="chart-mode-switch">
          <button
            className={`btn btn-ghost ${mode === 'line' ? 'btn-active' : ''}`}
            onClick={() => onModeChange?.('line')}
            type="button"
          >
            Line
          </button>
          <button
            className={`btn btn-ghost ${mode === 'candle' ? 'btn-active' : ''}`}
            onClick={() => onModeChange?.('candle')}
            type="button"
          >
            Candle
          </button>
        </div>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          {mode === 'line' ? (
            <LineChart data={lineData} margin={{ top: 16, right: 24, left: 12, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f0" />
              <XAxis dataKey="time" minTickGap={24} stroke="#4f5f78" tickLine={false} />
              <YAxis
                stroke="#4f5f78"
                tickLine={false}
                tickFormatter={(value: number) => `?${Math.round(value)}`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                formatter={(value: number) => [formatPrice(value), 'LTP']}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Line type="monotone" dataKey="price" stroke="#0057d8" strokeWidth={3} dot={false} />
            </LineChart>
          ) : (
            <ComposedChart data={candles} margin={{ top: 16, right: 24, left: 12, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f0" />
              <XAxis dataKey="time" minTickGap={24} stroke="#4f5f78" tickLine={false} />
              <YAxis
                stroke="#4f5f78"
                tickLine={false}
                tickFormatter={(value: number) => `?${Math.round(value)}`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                formatter={(value: number, name: string, props: { payload?: CandlePoint }) => {
                  const candle = props.payload;

                  if (!candle) {
                    return [formatPrice(value), name];
                  }

                  return [
                    `O ${formatPrice(candle.open)}  H ${formatPrice(candle.high)}  L ${formatPrice(
                      candle.low,
                    )}  C ${formatPrice(candle.close)}`,
                    'OHLC',
                  ];
                }}
                labelFormatter={(label) => `Time: ${label}`}
              />

              <Bar dataKey="wickBase" stackId="wick" fill="transparent" isAnimationActive={false} />
              <Bar dataKey="wickSize" stackId="wick" fill="#64748b" barSize={2} isAnimationActive={false} />

              <Bar dataKey="bodyBase" stackId="body" fill="transparent" isAnimationActive={false} />
              <Bar dataKey="bodySize" stackId="body" barSize={8} isAnimationActive={false}>
                {candles.map((entry) => (
                  <Cell key={`${entry.time}-${entry.open}`} fill={entry.trend === 'up' ? '#0d9a5d' : '#d7472f'} />
                ))}
              </Bar>
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
