import axios from 'axios';
import {
  AccountSummary,
  ApiResponse,
  AuthStatus,
  DailyReportRow,
  DecisionLogEntry,
  MarketOverviewItem,
  MarketTick,
  OptionChain,
  OptionExpiryInfo,
  OrderCheckResult,
  PlaceIntentInput,
  PlaceOrderInput,
  ReportSummary,
  StockCatalogItem,
  StrategyPosition,
  StrategyStatus,
  TokenRenewalStatus,
  TradeHistoryEntry,
  TradeIntent,
  TradeOrder,
  TradeSummaryStats,
  UnderlyingInstrument,
  WatchlistItem,
} from './types';

const normalizeBaseUrl = (url: string): string => url.replace(/\/$/, '');

// When VITE_API_BASE_URL is empty/unset the Vite dev-server proxy handles /api routing,
// so we use '' (same-origin). In production set this to the actual backend URL.
const rawApiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
export const API_BASE_URL = rawApiBase ? normalizeBaseUrl(rawApiBase) : '';

// WebSocket URL derivation — no hardcoded hosts:
//  1. VITE_WS_URL set → use it directly
//  2. VITE_API_BASE_URL set → derive ws(s):// from it
//  3. Dev proxy mode (both empty) → derive from current page origin (works on any host/port)
const rawWsUrl = import.meta.env.VITE_WS_URL as string | undefined;
export const WS_URL = rawWsUrl
  ? rawWsUrl
  : API_BASE_URL
    ? API_BASE_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:') + '/ws'
    : (typeof window !== 'undefined'
        ? window.location.origin.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
        : '') + '/ws';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

const unwrap = <T>(response: { data: ApiResponse<T> }): T => {
  if (!response.data.success) {
    throw new Error(response.data.message ?? 'API request failed');
  }

  return response.data.data;
};

export const tradingApi = {
  getAuthStatus: async (): Promise<AuthStatus> => {
    const response = await client.get<ApiResponse<AuthStatus>>('/api/auth/upstox/status');
    return unwrap(response);
  },

  disconnect: async (): Promise<void> => {
    await client.delete('/api/auth/upstox/disconnect');
  },

  /** Sends the "approve access token" prompt to the Upstox app / WhatsApp (no OTP login). */
  requestTokenApproval: async (): Promise<TokenRenewalStatus> => {
    const response = await client.post<ApiResponse<TokenRenewalStatus>>('/api/auth/upstox/token-request');
    return unwrap(response);
  },

  exchangeOAuthCode: async (code: string): Promise<AuthStatus> => {
    const response = await client.post<ApiResponse<AuthStatus>>('/api/auth/upstox/exchange', {
      code,
    });
    return unwrap(response);
  },

  getUnderlyings: async (): Promise<UnderlyingInstrument[]> => {
    const response = await client.get<ApiResponse<UnderlyingInstrument[]>>('/api/instruments');
    return unwrap(response);
  },

  getActiveUnderlying: async (): Promise<UnderlyingInstrument> => {
    const response = await client.get<ApiResponse<UnderlyingInstrument>>('/api/instruments/active');
    return unwrap(response);
  },

  setActiveUnderlying: async (symbol: string): Promise<UnderlyingInstrument> => {
    const response = await client.post<ApiResponse<UnderlyingInstrument>>('/api/instruments/active', {
      symbol,
    });
    return unwrap(response);
  },

  getMarketLive: async (params?: { refresh?: boolean; symbol?: string }): Promise<MarketTick> => {
    const response = await client.get<ApiResponse<MarketTick>>('/api/market/nifty/live', {
      params,
    });
    return unwrap(response);
  },

  getMarketHistory: async (params?: { limit?: number; symbol?: string }): Promise<MarketTick[]> => {
    const response = await client.get<ApiResponse<MarketTick[]>>('/api/market/nifty/history', {
      params,
    });
    return unwrap(response);
  },

  getOptionChain: async (params?: {
    expiryDate?: string;
    refresh?: boolean;
    symbol?: string;
  }): Promise<OptionChain> => {
    const response = await client.get<ApiResponse<OptionChain>>('/api/market/nifty/option-chain', {
      params,
    });
    return unwrap(response);
  },

  getOptionExpiries: async (symbol?: string): Promise<OptionExpiryInfo> => {
    const response = await client.get<ApiResponse<OptionExpiryInfo>>('/api/market/nifty/option-expiries', {
      params: { symbol },
    });
    return unwrap(response);
  },

  placeBuyOrder: async (payload: PlaceOrderInput): Promise<TradeOrder> => {
    const response = await client.post<ApiResponse<TradeOrder>>('/api/orders/buy', payload);
    return unwrap(response);
  },

  placeSellOrder: async (payload: PlaceOrderInput): Promise<TradeOrder> => {
    const response = await client.post<ApiResponse<TradeOrder>>('/api/orders/sell', payload);
    return unwrap(response);
  },

  getOrders: async (limit = 25): Promise<TradeOrder[]> => {
    const response = await client.get<ApiResponse<TradeOrder[]>>('/api/orders', {
      params: { limit },
    });
    return unwrap(response);
  },

  createIntent: async (payload: PlaceIntentInput): Promise<TradeIntent> => {
    const response = await client.post<ApiResponse<TradeIntent>>('/api/intents', payload);
    return unwrap(response);
  },

  listIntents: async (params?: {
    limit?: number;
    status?: string;
    source?: 'MANUAL' | 'STRATEGY';
  }): Promise<TradeIntent[]> => {
    const response = await client.get<ApiResponse<TradeIntent[]>>('/api/intents', { params });
    return unwrap(response);
  },

  approveIntent: async (id: number): Promise<{ intent: TradeIntent; order: TradeOrder }> => {
    const response = await client.post<ApiResponse<{ intent: TradeIntent; order: TradeOrder }>>(
      `/api/intents/${id}/approve`,
      { actor: 'dashboard-user' },
    );
    return unwrap(response);
  },

  rejectIntent: async (id: number, reason: string): Promise<TradeIntent> => {
    const response = await client.post<ApiResponse<TradeIntent>>(`/api/intents/${id}/reject`, {
      actor: 'dashboard-user',
      reason,
    });
    return unwrap(response);
  },

  getStrategyStatus: async (): Promise<StrategyStatus> => {
    const response = await client.get<ApiResponse<StrategyStatus>>('/api/strategy/status');
    return unwrap(response);
  },

  setStrategyEnabled: async (enabled: boolean): Promise<StrategyStatus> => {
    const response = await client.post<ApiResponse<StrategyStatus>>('/api/strategy/enabled', {
      enabled,
    });
    return unwrap(response);
  },

  evaluateStrategyNow: async (createIntent = true): Promise<{ signal: unknown; intentId: number | null }> => {
    const response = await client.post<ApiResponse<{ signal: unknown; intentId: number | null }>>(
      '/api/strategy/evaluate',
      { createIntent },
    );
    return unwrap(response);
  },

  getStrategyPositions: async (limit = 100): Promise<StrategyPosition[]> => {
    const response = await client.get<ApiResponse<StrategyPosition[]>>('/api/strategy/positions', {
      params: { limit },
    });
    return unwrap(response);
  },

  closeStrategyPosition: async (id: number, reason?: string): Promise<StrategyPosition> => {
    const response = await client.post<ApiResponse<StrategyPosition>>(
      `/api/strategy/positions/${id}/close`,
      { reason },
    );
    return unwrap(response);
  },

  /**
   * EMERGENCY PANIC BUTTON — closes ALL open positions immediately.
   * Disables strategy engine. Cancels all pending broker orders.
   */
  emergencyExitAll: async (triggeredBy?: string): Promise<{
    message: string;
    closedCount: number;
    failedCount: number;
    errors: string[];
  }> => {
    const response = await client.post<ApiResponse<{
      message: string;
      closedCount: number;
      failedCount: number;
      errors: string[];
    }>>('/api/strategy/emergency-exit', { triggeredBy: triggeredBy ?? 'UI' });
    return unwrap(response);
  },

  getAccountSummary: async (): Promise<AccountSummary> => {
    const response = await client.get<ApiResponse<AccountSummary>>('/api/account/summary');
    return unwrap(response);
  },

  checkOrder: async (payload: {
    side: 'BUY' | 'SELL';
    instrumentKey: string;
    quantity: number;
    price?: number;
    orderType?: string;
    product?: string;
  }): Promise<OrderCheckResult> => {
    const response = await client.post<ApiResponse<OrderCheckResult>>('/api/account/check-order', payload);
    return unwrap(response);
  },

  searchStocks: async (params: {
    q?: string;
    limit?: number;
    exchange?: string;
    segment?: string;
    assetClass?: string;
    syncRemote?: boolean;
  }): Promise<StockCatalogItem[]> => {
    const response = await client.get<ApiResponse<StockCatalogItem[]>>('/api/stocks/search', {
      params,
    });
    return unwrap(response);
  },

  syncStockCatalog: async (payload?: { url?: string; maxRecords?: number }): Promise<{ synced: number; sourceUrl: string }> => {
    const response = await client.post<ApiResponse<{ synced: number; sourceUrl: string }>>(
      '/api/stocks/sync',
      payload ?? {},
    );
    return unwrap(response);
  },

  listWatchlist: async (includeQuotes = true): Promise<WatchlistItem[]> => {
    const response = await client.get<ApiResponse<WatchlistItem[]>>('/api/stocks/watchlist', {
      params: { includeQuotes },
    });
    return unwrap(response);
  },

  addWatchlistItem: async (payload: {
    symbol?: string;
    instrumentKey: string;
    displayName?: string;
    exchange?: string | null;
    segment?: string | null;
    notes?: string | null;
  }): Promise<WatchlistItem> => {
    const response = await client.post<ApiResponse<WatchlistItem>>('/api/stocks/watchlist', payload);
    return unwrap(response);
  },

  updateWatchlistNote: async (id: number, notes: string | null): Promise<WatchlistItem> => {
    const response = await client.patch<ApiResponse<WatchlistItem>>(`/api/stocks/watchlist/${id}`, {
      notes,
    });
    return unwrap(response);
  },

  removeWatchlistItem: async (id: number): Promise<void> => {
    await client.delete(`/api/stocks/watchlist/${id}`);
  },

  getReportSummary: async (days = 30): Promise<ReportSummary> => {
    const response = await client.get<ApiResponse<ReportSummary>>('/api/reports/summary', {
      params: { days },
    });
    return unwrap(response);
  },

  getDailyReport: async (days = 30): Promise<DailyReportRow[]> => {
    const response = await client.get<ApiResponse<DailyReportRow[]>>('/api/reports/daily', {
      params: { days },
    });
    return unwrap(response);
  },

  getTradeHistory: async (params?: { days?: number; status?: 'OPEN' | 'CLOSED' | 'ALL' }): Promise<TradeHistoryEntry[]> => {
    const response = await client.get<ApiResponse<TradeHistoryEntry[]>>('/api/trades/history', { params });
    return unwrap(response);
  },

  getDecisionLog: async (params?: { days?: number; decision?: string }): Promise<DecisionLogEntry[]> => {
    const response = await client.get<ApiResponse<DecisionLogEntry[]>>('/api/trades/decisions', { params });
    return unwrap(response);
  },

  getTradeSummary: async (days = 30): Promise<TradeSummaryStats> => {
    const response = await client.get<ApiResponse<TradeSummaryStats>>('/api/trades/summary', { params: { days } });
    return unwrap(response);
  },
};

export const getMarketOverview = async (): Promise<{ items: MarketOverviewItem[]; marketOpen: boolean }> => {
  const response = await client.get<{ success: boolean; data: MarketOverviewItem[]; marketOpen: boolean }>('/api/market/overview');
  return { items: response.data.data ?? [], marketOpen: response.data.marketOpen ?? true };
};

export const getInstrumentLtp = async (instrumentKey: string): Promise<{ instrumentKey: string; symbol: string; ltp: number; sourceTimestamp: string }> => {
  const response = await client.get<ApiResponse<{ instrumentKey: string; symbol: string; ltp: number; sourceTimestamp: string }>>('/api/market/instrument/ltp', {
    params: { instrumentKey },
  });
  return unwrap(response);
};

export const getOAuthLoginUrl = (): string => `${API_BASE_URL}/api/auth/upstox/login`;
