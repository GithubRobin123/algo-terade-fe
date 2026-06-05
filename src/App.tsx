import { ColDef } from 'ag-grid-community';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL, getMarketOverview, getOAuthLoginUrl, tradingApi } from './api/client';
import {
  AccountSummary,
  AuthStatus,
  DailyReportRow,
  MarketOverviewItem,
  MarketTick,
  OptionChain,
  PositionUpdate,
  OrderCheckResult,
  PlaceOrderInput,
  ReportSummary,
  StockCatalogItem,
  StrategyPosition,
  StrategyStatus,
  TradeIntent,
  TradeOrder,
  UnderlyingInstrument,
  WatchlistItem,
} from './api/types';
import { DataGridTable } from './components/data-grid-table';
import { IntentApprovalModal } from './components/intent-approval-modal';
import { MarketOverviewBar } from './components/market-overview-bar';
import { OptionChainTable, SelectedOption } from './components/option-chain-table';
import { OptionInstrumentPanel } from './components/option-instrument-panel';
import { LivePnlPanel } from './components/live-pnl-panel';
import { OrderForm } from './components/order-form';
import { OrderList } from './components/order-list';
import { PositionTable } from './components/position-table';
import { ChartMode, PriceChart } from './components/price-chart';
import { StatusPill } from './components/status-pill';
import { StrategyPanel } from './components/strategy-panel';
import { useMarketStream } from './hooks/useMarketStream';
import { formatDateTime, formatNumber, formatPrice } from './lib/format';

const HISTORY_LIMIT = 300;
const THEME_STORAGE_KEY = 'upstox-dashboard-theme';
const SIDEBAR_STORAGE_KEY = 'upstox-dashboard-sidebar-collapsed';

type PageKey = 'dashboard' | 'orders' | 'watchlist' | 'stocks' | 'wallet' | 'reports';
type ThemeKey = 'aurora' | 'midnight' | 'sunset';

type HoldingRow = AccountSummary['holdings'][number];
type PositionRow = AccountSummary['positions'][number];

const pages: Array<{ key: PageKey; label: string; short: string; hint: string }> = [
  { key: 'dashboard', label: 'Dashboard', short: 'DB', hint: 'Live market and strategy' },
  { key: 'orders', label: 'Orders', short: 'OR', hint: 'Intents and executions' },
  { key: 'watchlist', label: 'Watchlist', short: 'WL', hint: 'Track and curate symbols' },
  { key: 'stocks', label: 'Stocks', short: 'ST', hint: 'Instrument universe' },
  { key: 'wallet', label: 'Wallet', short: 'WA', hint: 'Funds, holdings, positions' },
  { key: 'reports', label: 'Reports', short: 'RP', hint: 'Performance analytics' },
];

const themeOptions: Array<{ key: ThemeKey; label: string; tone: 'light' | 'dark' }> = [
  { key: 'aurora', label: 'Aurora Light', tone: 'light' },
  { key: 'midnight', label: 'Midnight Dark', tone: 'dark' },
  { key: 'sunset', label: 'Sunset Custom', tone: 'light' },
];

export const agGridThemeMap: Record<ThemeKey, string> = {
  aurora: 'ag-theme-quartz',
  midnight: 'ag-theme-quartz-dark',
  sunset: 'ag-theme-alpine'
};

const statusTone = (connected: boolean): 'success' | 'warning' => (connected ? 'success' : 'warning');

const wsTone = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => {
  if (status === 'open') return 'success';
  if (status === 'connecting') return 'warning';
  if (status === 'error') return 'danger';
  return 'neutral';
};

const wsLabel = (status: string): string => {
  if (status === 'open') return 'Live';
  if (status === 'connecting') return 'Connecting';
  if (status === 'closed') return 'Closed';
  if (status === 'error') return 'Error';
  return 'Idle';
};

const parseErrorMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null) {
    const maybeAxios = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };

    if (maybeAxios.response?.data?.message) {
      return maybeAxios.response.data.message;
    }

    if (maybeAxios.message) {
      return maybeAxios.message;
    }
  }

  return 'Request failed';
};

const asFallback = <T,>(result: PromiseSettledResult<T>, fallback: T): T =>
  result.status === 'fulfilled' ? result.value : fallback;

const pnlClass = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '';
  }

  return value >= 0 ? 'side-buy' : 'side-sell';
};

const readThemePreference = (): ThemeKey => {
  if (typeof window === 'undefined') {
    return 'aurora';
  }

  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (raw && themeOptions.some((item) => item.key === raw)) {
    return raw as ThemeKey;
  }

  return 'aurora';
};

const readSidebarPreference = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
};

const App = () => {
  const [page, setPage] = useState<PageKey>('dashboard');
  const [theme, setTheme] = useState<ThemeKey>(readThemePreference);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(readSidebarPreference);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    connected: false,
    expiresAt: null,
    tokenType: null,
    scope: null,
    source: 'none',
  });
  const [underlyings, setUnderlyings] = useState<UnderlyingInstrument[]>([]);
  const [activeUnderlying, setActiveUnderlying] = useState<UnderlyingInstrument | null>(null);
  const [latestTick, setLatestTick] = useState<MarketTick | null>(null);
  const [tickHistory, setTickHistory] = useState<MarketTick[]>([]);
  const [optionChain, setOptionChain] = useState<OptionChain | null>(null);
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [intents, setIntents] = useState<TradeIntent[]>([]);
  const [strategyStatus, setStrategyStatus] = useState<StrategyStatus | null>(null);
  const [positions, setPositions] = useState<StrategyPosition[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [stockQuery, setStockQuery] = useState('');
  const [stockResults, setStockResults] = useState<StockCatalogItem[]>([]);
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);
  const [dailyReport, setDailyReport] = useState<DailyReportRow[]>([]);
  const [orderCheck, setOrderCheck] = useState<OrderCheckResult | null>(null);
  const [dismissedIntentIds, setDismissedIntentIds] = useState<number[]>([]);
  const [chartMode, setChartMode] = useState<ChartMode>('line');
  const [selectedOption, setSelectedOption] = useState<SelectedOption | null>(null);
  const [marketOverview, setMarketOverview] = useState<MarketOverviewItem[]>([]);
  const [marketOpen, setMarketOpen] = useState<boolean>(true);
  // Symbol whose option chain + chart is currently displayed (defaults to active underlying)
  const [viewingSymbol, setViewingSymbol] = useState<string>('NIFTY');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const oauthCodeHandledRef = useRef(false);

  const pageMeta = useMemo(() => pages.find((item) => item.key === page) ?? pages[0], [page]);
  const themeMeta = useMemo(() => themeOptions.find((item) => item.key === theme) ?? themeOptions[0], [theme]);
  const gridThemeMode = themeMeta.tone;

  const combinedAccountPositions = useMemo<PositionRow[]>(
    () => [...(accountSummary?.positions ?? []), ...(accountSummary?.mtfPositions ?? [])],
    [accountSummary],
  );

  const refreshMarketData = useCallback(async (symbol: string, refresh = false) => {
    const [live, history, chain] = await Promise.all([
      tradingApi.getMarketLive({ refresh, symbol }),
      tradingApi.getMarketHistory({ limit: HISTORY_LIMIT, symbol }),
      tradingApi.getOptionChain({ refresh, symbol }),
    ]);

    setLatestTick(live);
    setTickHistory(history);
    setOptionChain(chain);
  }, []);

  // Switch viewing to a different index — load its option chain + chart
  const handleOverviewSelect = useCallback(async (item: MarketOverviewItem) => {
    setViewingSymbol(item.symbol);
    setSelectedOption(null);
    if (!authStatus.connected) return;
    setBusy(true);
    try {
      const [chain, history] = await Promise.all([
        tradingApi.getOptionChain({ refresh: true, symbol: item.symbol }).catch(() => null),
        tradingApi.getMarketHistory({ limit: HISTORY_LIMIT, symbol: item.symbol }).catch(() => []),
      ]);
      if (chain) setOptionChain(chain);
      if (history.length) setTickHistory(history as typeof tickHistory);
    } catch { /* ignore */ } finally {
      setBusy(false);
    }
  }, [authStatus.connected]);

  const refreshOrdersIntents = useCallback(async () => {
    const [ordersResult, intentsResult] = await Promise.all([
      tradingApi.getOrders(60),
      tradingApi.listIntents({ limit: 120 }),
    ]);

    setOrders(ordersResult);
    setIntents(intentsResult);
    setDismissedIntentIds((previous) =>
      previous.filter((id) =>
        intentsResult.some((intent) => intent.id === id && intent.status === 'PENDING_APPROVAL'),
      ),
    );
  }, []);

  const refreshStrategyData = useCallback(async () => {
    const [status, strategyPositions] = await Promise.all([
      tradingApi.getStrategyStatus(),
      tradingApi.getStrategyPositions(120),
    ]);

    setStrategyStatus(status);
    setPositions(strategyPositions);
  }, []);

  const refreshWatchlist = useCallback(async () => {
    const rows = await tradingApi.listWatchlist(true);
    setWatchlist(rows);
  }, []);

  const refreshAccountAndReports = useCallback(async () => {
    const [accountResult, summaryResult, dailyResult] = await Promise.allSettled([
      tradingApi.getAccountSummary(),
      tradingApi.getReportSummary(30),
      tradingApi.getDailyReport(30),
    ]);

    setAccountSummary(asFallback(accountResult, null));
    setReportSummary(asFallback(summaryResult, null));
    setDailyReport(asFallback(dailyResult, []));
  }, []);

  const loadDashboard = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
      }

      setError(null);

      try {
        const [status, availableUnderlyings, active] = await Promise.all([
          tradingApi.getAuthStatus(),
          tradingApi.getUnderlyings(),
          tradingApi.getActiveUnderlying(),
        ]);

        setAuthStatus(status);
        setUnderlyings(availableUnderlyings);
        setActiveUnderlying(active);

        await Promise.allSettled([refreshOrdersIntents(), refreshStrategyData(), refreshWatchlist()]);

        if (status.connected) {
          await Promise.all([refreshMarketData(active.symbol, false), refreshAccountAndReports()]);
        } else {
          setLatestTick(null);
          setTickHistory([]);
          setOptionChain(null);
          setAccountSummary(null);
          setReportSummary(null);
          setDailyReport([]);
        }
      } catch (caughtError) {
        setError(parseErrorMessage(caughtError));
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [refreshAccountAndReports, refreshMarketData, refreshOrdersIntents, refreshStrategyData, refreshWatchlist],
  );

  const onTick = useCallback(
    (tick: MarketTick) => {
      if (activeUnderlying && tick.instrumentKey !== activeUnderlying.instrumentKey) {
        return;
      }

      setLatestTick(tick);
      setTickHistory((previous) => [...previous.slice(-(HISTORY_LIMIT - 1)), tick]);
    },
    [activeUnderlying],
  );

  const onOptionChain = useCallback(
    (chain: OptionChain) => {
      if (activeUnderlying && chain.symbol !== activeUnderlying.symbol) {
        return;
      }

      setOptionChain(chain);

      // Keep latestTick in sync when chain carries a fresher underlying price
      if (chain.underlyingPrice != null) {
        setLatestTick((prev) => {
          if (!prev) return prev;
          return { ...prev, ltp: chain.underlyingPrice as number, sourceTimestamp: chain.snapshotTime };
        });
      }
    },
    [activeUnderlying],
  );

  // WebSocket push: execution engine broadcasts position_update every 5s per open position.
  // We merge the update directly into positions state — no HTTP poll needed.
  const onPositionUpdate = useCallback(
    (update: PositionUpdate) => {
      setPositions((prev) =>
        prev.map((p) => {
          if (p.id !== update.id) return p;
          return {
            ...p,
            currentPrice: update.currentPrice,
            unrealizedPnl: update.unrealizedPnl,
            stopLossPrice: update.stopLossPrice,
            targetPrice: update.targetPrice,
            trailActive: update.trailActive,
            bestPrice: update.bestPrice,
            status: update.status as 'OPEN' | 'CLOSED',
          };
        }),
      );

      // If position just closed, refresh full strategy status for trade count + daily PnL
      if (update.status === 'CLOSED') {
        void refreshStrategyData();
      }
    },
    [refreshStrategyData],
  );

  const websocketStatus = useMarketStream({
    enabled: authStatus.connected,
    onTick,
    onOptionChain,
    onPositionUpdate,
  });

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // ── Market overview — batch LTP for all indices ──────────────────────────
  // Polls every 5s when market is open; every 60s when closed (just to update status)
  useEffect(() => {
    if (!authStatus.connected) return;
    let timer: ReturnType<typeof setInterval>;

    const fetch = () => {
      void getMarketOverview()
        .then(({ items, marketOpen: open }) => {
          setMarketOverview(items);
          setMarketOpen(open);
          // If market just opened/closed, reschedule at new interval
          const ms = open ? 5_000 : 60_000;
          clearInterval(timer);
          timer = setInterval(fetch, ms);
        })
        .catch(() => {});
    };

    fetch();
    timer = setInterval(fetch, marketOpen ? 5_000 : 60_000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus.connected]);

  // ── Strategy status (trade count, daily PnL) background refresh ─────────
  // Positions are pushed via WebSocket (position_update) — no polling needed there.
  // We still poll status every 30s to keep trade count + daily PnL accurate when flat.
  useEffect(() => {
    if (!authStatus.connected) return;
    const timer = setInterval(() => { void refreshStrategyData(); }, 30_000);
    return () => clearInterval(timer);
  }, [authStatus.connected, refreshStrategyData]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [page]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get('oauth');
    const oauthMessage = params.get('message');
    const authCode = params.get('code');
    const oauthError = params.get('error');

    if (!oauthStatus) {
      if (oauthError) {
        setError(`Upstox OAuth error: ${oauthError}`);
        return;
      }

      if (authCode && !oauthCodeHandledRef.current) {
        oauthCodeHandledRef.current = true;
        setBusy(true);
        setError(null);

        void (async () => {
          try {
            await tradingApi.exchangeOAuthCode(authCode);
            setNotice('Upstox account connected successfully.');
            await loadDashboard(false);
          } catch (caughtError) {
            setError(parseErrorMessage(caughtError));
          } finally {
            setBusy(false);
            const cleanUrl = `${window.location.origin}${window.location.pathname}`;
            window.history.replaceState({}, document.title, cleanUrl);
          }
        })();
      }

      return;
    }

    if (oauthStatus === 'success') {
      setNotice('Upstox account connected successfully.');
      setError(null);
      void loadDashboard(false);
    }

    if (oauthStatus === 'failed') {
      setError(oauthMessage ?? 'OAuth login failed. Check backend logs.');
    }

    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }, [loadDashboard]);

  const pendingIntent = useMemo(
    () =>
      intents.find(
        (item) => item.status === 'PENDING_APPROVAL' && !dismissedIntentIds.includes(item.id),
      ) ?? null,
    [dismissedIntentIds, intents],
  );

  const pendingIntentsCount = useMemo(
    () => intents.filter((item) => item.status === 'PENDING_APPROVAL').length,
    [intents],
  );

  const preferredInstrumentKey = useMemo(() => {
    if (!optionChain || optionChain.rows.length === 0) {
      return activeUnderlying?.instrumentKey ?? 'NSE_INDEX|Nifty 50';
    }

    return (
      optionChain.rows.find((row) => row.callInstrumentKey)?.callInstrumentKey ||
      optionChain.rows.find((row) => row.putInstrumentKey)?.putInstrumentKey ||
      optionChain.instrumentKey
    );
  }, [activeUnderlying?.instrumentKey, optionChain]);

  const connectUpstox = () => {
    window.location.href = getOAuthLoginUrl();
  };

  const disconnectUpstox = async () => {
    setBusy(true);
    setError(null);

    try {
      await tradingApi.disconnect();
      setNotice('Upstox disconnected.');
      await loadDashboard(false);
    } catch (caughtError) {
      setError(parseErrorMessage(caughtError));
    } finally {
      setBusy(false);
    }
  };

  const changeUnderlying = async (symbol: string) => {
    setBusy(true);
    setError(null);

    try {
      const next = await tradingApi.setActiveUnderlying(symbol);
      setActiveUnderlying(next);
      setTickHistory([]);
      setOptionChain(null);

      if (authStatus.connected) {
        await refreshMarketData(next.symbol, true);
      }

      await refreshStrategyData();
      setNotice(`Underlying switched to ${next.displayName}.`);
    } catch (caughtError) {
      setError(parseErrorMessage(caughtError));
    } finally {
      setBusy(false);
    }
  };

  const refreshEverything = async () => {
    setBusy(true);

    try {
      if (activeUnderlying && authStatus.connected) {
        await refreshMarketData(activeUnderlying.symbol, true);
      }

      await Promise.all([
        refreshOrdersIntents(),
        refreshStrategyData(),
        refreshWatchlist(),
        authStatus.connected ? refreshAccountAndReports() : Promise.resolve(),
      ]);

      setNotice('Data refreshed.');
    } catch (caughtError) {
      setError(parseErrorMessage(caughtError));
    } finally {
      setBusy(false);
    }
  };

  const handleOrderSubmit = async (side: 'BUY' | 'SELL', payload: PlaceOrderInput) => {
    setBusy(true);
    setError(null);

    try {
      const check = await tradingApi.checkOrder({
        side,
        instrumentKey: payload.instrumentKey,
        quantity: payload.quantity,
        price: payload.price,
        orderType: payload.orderType,
        product: payload.product,
      });

      setOrderCheck(check);

      if (!check.allowed) {
        throw new Error(check.reason ?? 'Order blocked by wallet validation.');
      }

      const intent = await tradingApi.createIntent({
        source: 'MANUAL',
        side,
        symbol: payload.symbol,
        instrumentKey: payload.instrumentKey,
        quantity: payload.quantity,
        orderType: payload.orderType,
        product: payload.product,
        validity: payload.validity,
        price: payload.price,
        triggerPrice: payload.triggerPrice,
        tag: payload.tag,
        requiresApproval: true,
        rationale: 'Manual order request from UI',
        metadata: { orderCheck: check },
      });

      setIntents((previous) => [intent, ...previous.filter((item) => item.id !== intent.id)].slice(0, 120));
      setDismissedIntentIds((previous) => previous.filter((id) => id !== intent.id));
      setNotice('Intent created. Approve it to execute the trade.');
    } catch (caughtError) {
      setError(parseErrorMessage(caughtError));
    } finally {
      setBusy(false);
    }
  };

  const approveIntent = async (intent: TradeIntent) => {
    setBusy(true);

    try {
      const result = await tradingApi.approveIntent(intent.id);

      setIntents((previous) => [result.intent, ...previous.filter((item) => item.id !== result.intent.id)]);
      setOrders((previous) => [result.order, ...previous.filter((item) => item.id !== result.order.id)].slice(0, 60));
      setDismissedIntentIds((previous) => previous.filter((id) => id !== result.intent.id));

      await Promise.all([refreshStrategyData(), refreshAccountAndReports()]);
      setNotice(`Intent #${intent.id} approved and executed.`);
    } catch (caughtError) {
      setError(parseErrorMessage(caughtError));
    } finally {
      setBusy(false);
    }
  };

  const rejectIntent = async (intent: TradeIntent) => {
    setBusy(true);

    try {
      const rejected = await tradingApi.rejectIntent(intent.id, 'Rejected by user from approval modal');
      setIntents((previous) => [rejected, ...previous.filter((item) => item.id !== rejected.id)]);
      setDismissedIntentIds((previous) => previous.filter((id) => id !== rejected.id));
      setNotice(`Intent #${intent.id} rejected.`);
    } catch (caughtError) {
      setError(parseErrorMessage(caughtError));
    } finally {
      setBusy(false);
    }
  };

  const toggleStrategy = async (enabled: boolean) => {
    setBusy(true);

    try {
      const updated = await tradingApi.setStrategyEnabled(enabled);
      setStrategyStatus(updated);
      setNotice(`Strategy ${enabled ? 'enabled' : 'disabled'}.`);
    } catch (caughtError) {
      setError(parseErrorMessage(caughtError));
    } finally {
      setBusy(false);
    }
  };

  const evaluateStrategy = async () => {
    setBusy(true);

    try {
      const result = await tradingApi.evaluateStrategyNow(true);
      await Promise.all([refreshOrdersIntents(), refreshStrategyData()]);

      if (result.intentId) {
        setNotice(`Strategy created intent #${result.intentId}.`);
      } else {
        setNotice('Strategy evaluated. No trade setup generated.');
      }
    } catch (caughtError) {
      setError(parseErrorMessage(caughtError));
    } finally {
      setBusy(false);
    }
  };

  const closePosition = async (position: StrategyPosition) => {
    setBusy(true);

    try {
      await tradingApi.closeStrategyPosition(position.id, 'Manual close from orders page');
      await Promise.all([refreshStrategyData(), refreshOrdersIntents(), refreshAccountAndReports()]);
      setNotice(`Position #${position.id} closed.`);
    } catch (caughtError) {
      setError(parseErrorMessage(caughtError));
    } finally {
      setBusy(false);
    }
  };

  const executeStockSearch = async (query: string, syncRemote = false) => {
    setBusy(true);
    setError(null);

    try {
      const rows = await tradingApi.searchStocks({
        q: query,
        limit: 80,
        syncRemote,
      });

      setStockResults(rows);
      if (!rows.length) {
        setNotice('No stocks found for current search.');
      }
    } catch (caughtError) {
      setError(parseErrorMessage(caughtError));
    } finally {
      setBusy(false);
    }
  };

  const addToWatchlist = async (stock: StockCatalogItem) => {
    setBusy(true);

    try {
      await tradingApi.addWatchlistItem({
        instrumentKey: stock.instrumentKey,
        symbol: stock.symbol,
        displayName: stock.displayName,
        exchange: stock.exchange,
        segment: stock.segment,
      });

      await refreshWatchlist();
      setNotice(`${stock.symbol} added to watchlist.`);
    } catch (caughtError) {
      setError(parseErrorMessage(caughtError));
    } finally {
      setBusy(false);
    }
  };

  const removeFromWatchlist = async (id: number) => {
    setBusy(true);

    try {
      await tradingApi.removeWatchlistItem(id);
      await refreshWatchlist();
      setNotice('Watchlist item removed.');
    } catch (caughtError) {
      setError(parseErrorMessage(caughtError));
    } finally {
      setBusy(false);
    }
  };

  const syncStockCatalog = async () => {
    setBusy(true);

    try {
      const result = await tradingApi.syncStockCatalog({ maxRecords: 15000 });
      setNotice(`Instrument catalog synced: ${result.synced} rows.`);
      await executeStockSearch(stockQuery, false);
    } catch (caughtError) {
      setError(parseErrorMessage(caughtError));
    } finally {
      setBusy(false);
    }
  };

  const pendingIntentColumns = useMemo<ColDef<TradeIntent>[]>(
    () => [
      {
        headerName: 'Time',
        field: 'createdAt',
        minWidth: 220,
        valueFormatter: (params) => formatDateTime(params.value as string | null),
      },
      { headerName: 'Source', field: 'source', minWidth: 110 },
      {
        headerName: 'Side',
        field: 'side',
        cellClass: (params) => (params.value === 'BUY' ? 'side-buy' : 'side-sell'),
      },
      { headerName: 'Symbol', field: 'symbol', minWidth: 120 },
      { headerName: 'Qty', field: 'quantity', minWidth: 90 },
      { headerName: 'Status', field: 'status', minWidth: 150 },
    ],
    [],
  );

  const watchlistSearchColumns = useMemo<ColDef<StockCatalogItem>[]>(
    () => [
      { headerName: 'Symbol', field: 'symbol', minWidth: 130 },
      { headerName: 'Name', field: 'displayName', minWidth: 220 },
      { headerName: 'Exchange', field: 'exchange', minWidth: 110 },
      { headerName: 'Segment', field: 'segment', minWidth: 130 },
      {
        headerName: 'Action',
        sortable: false,
        filter: false,
        minWidth: 120,
        cellRenderer: (params: { data?: StockCatalogItem }) => {
          if (!params.data) {
            return '--';
          }

          return (
            <button
              className="btn btn-ghost btn-inline"
              onClick={() => {
                void addToWatchlist(params.data as StockCatalogItem);
              }}
              disabled={busy}
            >
              Add
            </button>
          );
        },
      },
    ],
    [busy],
  );

  const watchlistColumns = useMemo<ColDef<WatchlistItem>[]>(
    () => [
      { headerName: 'Symbol', field: 'symbol', minWidth: 130 },
      { headerName: 'Name', field: 'displayName', minWidth: 220 },
      {
        headerName: 'LTP',
        field: 'lastPrice',
        valueFormatter: (params) => formatPrice(params.value as number | null),
      },
      {
        headerName: 'Change',
        valueGetter: (params) => {
          if (!params.data || params.data.change === null) {
            return '--';
          }
          return `${formatNumber(params.data.change)} (${formatNumber(params.data.changePct)}%)`;
        },
        cellClass: (params) => pnlClass(params.data?.change),
        minWidth: 170,
      },
      {
        headerName: 'Action',
        sortable: false,
        filter: false,
        minWidth: 130,
        cellRenderer: (params: { data?: WatchlistItem }) => {
          if (!params.data) {
            return '--';
          }

          return (
            <button
              className="btn btn-ghost btn-inline"
              onClick={() => {
                void removeFromWatchlist(params.data!.id);
              }}
              disabled={busy}
            >
              Remove
            </button>
          );
        },
      },
    ],
    [busy],
  );

  const stockUniverseColumns = useMemo<ColDef<StockCatalogItem>[]>(
    () => [
      { headerName: 'Symbol', field: 'symbol', minWidth: 130 },
      { headerName: 'Name', field: 'displayName', minWidth: 230 },
      { headerName: 'Instrument', field: 'instrumentKey', minWidth: 280 },
      { headerName: 'Exchange', field: 'exchange', minWidth: 120 },
      { headerName: 'Segment', field: 'segment', minWidth: 150 },
      {
        headerName: 'Lot',
        field: 'lotSize',
        minWidth: 90,
        valueFormatter: (params) => formatNumber(params.value as number | null),
      },
    ],
    [],
  );

  const holdingsColumns = useMemo<ColDef<HoldingRow>[]>(
    () => [
      { headerName: 'Symbol', field: 'tradingSymbol', minWidth: 160 },
      { headerName: 'Qty', field: 'quantity', minWidth: 100 },
      {
        headerName: 'Avg',
        field: 'averagePrice',
        valueFormatter: (params) => formatPrice(params.value as number | null),
      },
      {
        headerName: 'LTP',
        field: 'lastPrice',
        valueFormatter: (params) => formatPrice(params.value as number | null),
      },
      {
        headerName: 'PnL',
        field: 'pnl',
        valueFormatter: (params) => formatPrice(params.value as number | null),
        cellClass: (params) => pnlClass(params.value as number | null),
      },
    ],
    [],
  );

  const accountPositionsColumns = useMemo<ColDef<PositionRow>[]>(
    () => [
      { headerName: 'Symbol', field: 'tradingSymbol', minWidth: 160 },
      { headerName: 'Qty', field: 'quantity', minWidth: 100 },
      {
        headerName: 'Avg',
        field: 'averagePrice',
        valueFormatter: (params) => formatPrice(params.value as number | null),
      },
      {
        headerName: 'LTP',
        field: 'lastPrice',
        valueFormatter: (params) => formatPrice(params.value as number | null),
      },
      {
        headerName: 'PnL',
        field: 'pnl',
        valueFormatter: (params) => formatPrice(params.value as number | null),
        cellClass: (params) => pnlClass(params.value as number | null),
      },
      { headerName: 'Product', field: 'product', minWidth: 110 },
    ],
    [],
  );

  const dailyReportColumns = useMemo<ColDef<DailyReportRow>[]>(
    () => [
      { headerName: 'Date', field: 'day', minWidth: 130 },
      { headerName: 'Orders', field: 'orderCount', minWidth: 100 },
      { headerName: 'Failed', field: 'failedOrders', minWidth: 100 },
      {
        headerName: 'Notional',
        field: 'estimatedNotional',
        valueFormatter: (params) => formatPrice(params.value as number | null),
        minWidth: 160,
      },
      {
        headerName: 'Strategy Realized PnL',
        field: 'realizedPnl',
        valueFormatter: (params) => formatPrice(params.value as number | null),
        cellClass: (params) => pnlClass(params.value as number | null),
        minWidth: 210,
      },
    ],
    [],
  );

  const renderDashboard = () => {
    const viewingItem = marketOverview.find((m) => m.symbol === viewingSymbol) ?? null;
    const viewingDisplayName = viewingItem?.displayName ?? viewingSymbol;
    return (
    <>
      {/* ── Market Overview Tiles ── */}
      {marketOverview.length > 0 && (
        <section>
          <div className="market-overview-header">
            <span className="market-overview-title">Markets</span>
            <span className={`market-status-badge ${marketOpen ? 'market-open' : 'market-closed'}`}>
              {marketOpen ? '● Live' : '● Closed'}
            </span>
            {!marketOpen && (
              <span className="market-closed-hint">NSE closed · showing last traded prices</span>
            )}
          </div>
          <MarketOverviewBar
            items={marketOverview}
            selectedSymbol={viewingSymbol}
            onSelect={(item) => { void handleOverviewSelect(item); }}
            themeMode={gridThemeMode}
          />
        </section>
      )}

      <section className="metrics-grid metrics-grid-4">
        <div className="metric-card">
          <p className="metric-label">Connection</p>
          <h2>{authStatus.connected ? 'Connected' : 'Not Connected'}</h2>
          <StatusPill
            label={authStatus.connected ? 'Authorized' : 'Pending'}
            tone={statusTone(authStatus.connected)}
          />
          <p className="metric-meta">Expires: {formatDateTime(authStatus.expiresAt)}</p>
        </div>

        <div className="metric-card">
          <p className="metric-label">WebSocket</p>
          <h2>{wsLabel(websocketStatus)}</h2>
          <StatusPill label={wsLabel(websocketStatus)} tone={wsTone(websocketStatus)} />
          <p className="metric-meta">/ws stream</p>
        </div>

        <div className="metric-card">
          <p className="metric-label">Latest Price</p>
          <h2>{latestTick ? formatPrice(latestTick.ltp) : '--'}</h2>
          <p className="metric-meta">Updated: {latestTick ? formatDateTime(latestTick.sourceTimestamp) : '--'}</p>
          <p className="metric-meta">Symbol: {activeUnderlying?.symbol ?? '--'}</p>
        </div>

        <div className="metric-card">
          <p className="metric-label">Wallet Equity</p>
          <h2>{formatPrice(accountSummary?.wallet?.equity.availableMargin ?? null)}</h2>
          <p className="metric-meta">Used: {formatPrice(accountSummary?.wallet?.equity.usedMargin ?? null)}</p>
          <p className="metric-meta">Watchlist: {watchlist.length}</p>
        </div>
      </section>

      <section>
        <PriceChart
          ticks={tickHistory}
          title={`${viewingDisplayName} Chart`}
          mode={chartMode}
          onModeChange={setChartMode}
        />
      </section>

      <section>
        <OptionChainTable
          chain={optionChain}
          spotPrice={latestTick?.ltp ?? optionChain?.underlyingPrice}
          themeMode={gridThemeMode}
          onSelectOption={setSelectedOption}
        />
        {selectedOption && (
          <OptionInstrumentPanel
            option={selectedOption}
            chainSymbol={optionChain?.symbol ?? activeUnderlying?.symbol ?? 'NIFTY'}
            onClose={() => setSelectedOption(null)}
          />
        )}
      </section>

      {positions.filter((p) => p.status === 'OPEN').length > 0 && (
        <section>
          <LivePnlPanel positions={positions} onClosePosition={closePosition} busy={busy} />
        </section>
      )}

      <section>
        <StrategyPanel status={strategyStatus} onToggle={toggleStrategy} onEvaluate={evaluateStrategy} busy={busy} />
      </section>
    </>
    );
  };

  const renderOrders = () => (
    <>
      {orderCheck ? (
        <div className={`banner ${orderCheck.allowed ? 'banner-success' : 'banner-error'}`}>
          {orderCheck.allowed
            ? `Order check passed. Estimated value ${formatPrice(orderCheck.estimatedOrderValue)}.`
            : orderCheck.reason}
        </div>
      ) : null}

      <section className="two-column-grid">
        <OrderForm
          defaultSymbol={activeUnderlying?.symbol ?? 'NIFTY'}
          defaultInstrumentKey={preferredInstrumentKey}
          defaultQuantity={activeUnderlying?.defaultLotSize ?? 1}
          onSubmit={handleOrderSubmit}
          disabled={loading || busy || !authStatus.connected}
        />

        <div className="panel">
          <div className="panel-title-row">
            <h3>Pending Intents</h3>
            <span>{pendingIntentsCount} pending</span>
          </div>
          <DataGridTable<TradeIntent>
            rows={intents.slice(0, 60)}
            columns={pendingIntentColumns}
            emptyMessage="No intents yet."
            themeMode={gridThemeMode}
            height={430}
            pageSize={12}
            getRowId={(params) => `${params.data.id}`}
          />
        </div>
      </section>

      <section>
        <PositionTable positions={positions} onClosePosition={closePosition} busy={busy} themeMode={gridThemeMode} />
      </section>

      <section>
        <OrderList orders={orders} themeMode={gridThemeMode} />
      </section>
    </>
  );

  const renderWatchlist = () => (
    <>
      <section className="panel">
        <div className="panel-title-row">
          <h3>Search And Add</h3>
          <span>Find instruments and add to watchlist</span>
        </div>
        <div className="toolbar-row">
          <input
            className="search-input"
            placeholder="Search symbol (e.g. RELIANCE, NIFTY, BANKNIFTY)"
            value={stockQuery}
            onChange={(event) => setStockQuery(event.target.value)}
          />
          <button className="btn btn-primary" onClick={() => void executeStockSearch(stockQuery, true)} disabled={busy}>
            Search
          </button>
        </div>

        <DataGridTable<StockCatalogItem>
          rows={stockResults.slice(0, 80)}
          columns={watchlistSearchColumns}
          emptyMessage="Search results will appear here."
          themeMode={gridThemeMode}
          height={460}
          pageSize={12}
          quickFilterText={stockQuery}
          getRowId={(params) => `${params.data.instrumentKey}-search`}
        />
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <h3>My Watchlist</h3>
          <span>{watchlist.length} items</span>
        </div>

        <DataGridTable<WatchlistItem>
          rows={watchlist}
          columns={watchlistColumns}
          emptyMessage="No watchlist items yet."
          themeMode={gridThemeMode}
          height={460}
          pageSize={12}
          getRowId={(params) => `${params.data.id ?? params.data.instrumentKey}`}
        />
      </section>
    </>
  );

  const renderStocks = () => (
    <section className="panel">
      <div className="panel-title-row">
        <h3>Stocks Universe</h3>
        <button className="btn btn-secondary" onClick={() => void syncStockCatalog()} disabled={busy}>
          Sync Catalog
        </button>
      </div>

      <div className="toolbar-row">
        <input
          className="search-input"
          placeholder="Search stocks, indices, options"
          value={stockQuery}
          onChange={(event) => setStockQuery(event.target.value)}
        />
        <button className="btn btn-primary" onClick={() => void executeStockSearch(stockQuery, false)} disabled={busy}>
          Search
        </button>
      </div>

      <DataGridTable<StockCatalogItem>
        rows={stockResults}
        columns={stockUniverseColumns}
        emptyMessage="Search or sync the stock catalog first."
        themeMode={gridThemeMode}
        height={560}
        pageSize={15}
        quickFilterText={stockQuery}
        getRowId={(params) => params.data.instrumentKey}
      />
    </section>
  );

  const renderWallet = () => (
    <>
      {!authStatus.connected ? (
        <div className="empty-state">Connect Upstox to load wallet, holdings, and positions.</div>
      ) : null}

      <section className="metrics-grid">
        <div className="metric-card">
          <p className="metric-label">Available Margin</p>
          <h2>{formatPrice(accountSummary?.wallet?.equity.availableMargin ?? null)}</h2>
          <p className="metric-meta">Equity wallet</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Used Margin</p>
          <h2>{formatPrice(accountSummary?.wallet?.equity.usedMargin ?? null)}</h2>
          <p className="metric-meta">Current utilization</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Pay-in</p>
          <h2>{formatPrice(accountSummary?.wallet?.equity.payin ?? null)}</h2>
          <p className="metric-meta">Pending/allocated</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <h3>Holdings</h3>
          <span>{accountSummary?.holdings.length ?? 0} records</span>
        </div>
        <DataGridTable<HoldingRow>
          rows={accountSummary?.holdings ?? []}
          columns={holdingsColumns}
          emptyMessage="No holdings data available."
          themeMode={gridThemeMode}
          height={420}
          pageSize={10}
          getRowId={(params) => params.data.instrumentKey}
        />
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <h3>Positions</h3>
          <span>{combinedAccountPositions.length} records</span>
        </div>
        <DataGridTable<PositionRow>
          rows={combinedAccountPositions}
          columns={accountPositionsColumns}
          emptyMessage="No positions data available."
          themeMode={gridThemeMode}
          height={440}
          pageSize={10}
          getRowId={(params) => `${params.data.instrumentKey}-${params.data.product ?? 'NA'}`}
        />
      </section>
    </>
  );

  const renderReports = () => (
    <>
      <section className="metrics-grid">
        <div className="metric-card">
          <p className="metric-label">Orders (30d)</p>
          <h2>{reportSummary?.orders.total ?? 0}</h2>
          <p className="metric-meta">Failed: {reportSummary?.orders.failedCount ?? 0}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Notional</p>
          <h2>{formatPrice(reportSummary?.orders.estimatedNotional ?? null)}</h2>
          <p className="metric-meta">Estimated from order history</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Strategy Realized PnL</p>
          <h2>{formatPrice(reportSummary?.strategy.realizedPnl ?? null)}</h2>
          <p className="metric-meta">Win Rate: {formatNumber(reportSummary?.strategy.winRatePct ?? null)}%</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <h3>Daily Report</h3>
          <span>Last 30 days</span>
        </div>
        <DataGridTable<DailyReportRow>
          rows={dailyReport}
          columns={dailyReportColumns}
          emptyMessage="No report rows yet."
          themeMode={gridThemeMode}
          height={430}
          pageSize={12}
          getRowId={(params) => params.data.day}
        />
      </section>
    </>
  );

  const pageContent = () => {
    if (page === 'dashboard') return renderDashboard();
    if (page === 'orders') return renderOrders();
    if (page === 'watchlist') return renderWatchlist();
    if (page === 'stocks') return renderStocks();
    if (page === 'wallet') return renderWallet();
    return renderReports();
  };

  return (
    <div
      className={`workspace-shell theme-${theme} ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${
        mobileNavOpen ? 'mobile-nav-open' : ''
      }`}
    >
      <button
        className={`mobile-nav-backdrop ${mobileNavOpen ? 'show' : ''}`}
        type="button"
        onClick={() => setMobileNavOpen(false)}
        aria-label="Close navigation"
      />

      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-top">
            <div className="brand-mark">UT</div>
            <div className="brand-copy">
              <p className="eyebrow">Upstox Trader</p>
              <h2>Control Desk</h2>
              <p className="metric-meta brand-endpoint">{API_BASE_URL}</p>
            </div>
          </div>

          <div className="brand-actions">
            <button
              type="button"
              className="icon-btn desktop-only"
              onClick={() => setSidebarCollapsed((previous) => !previous)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? '>>' : '<<'}
            </button>
            <button
              type="button"
              className="icon-btn mobile-only"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close sidebar"
            >
              X
            </button>
          </div>
        </div>

        <nav className="side-nav">
          {pages.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`side-nav-item ${page === item.key ? 'active' : ''}`}
              onClick={() => setPage(item.key)}
            >
              <span className="side-nav-badge">{item.short}</span>
              <span className="side-nav-copy">
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="metric-meta">Auth: {authStatus.connected ? 'Connected' : 'Disconnected'}</p>
          <p className="metric-meta">Token Expiry: {formatDateTime(authStatus.expiresAt)}</p>
          <p className="metric-meta">Theme: {themeMeta.label}</p>
        </div>
      </aside>

      <main className="content-shell">
        <header className="hero">
          <div className="hero-main">
            <div className="hero-title-row">
              <button
                type="button"
                className="icon-btn mobile-only"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open sidebar"
              >
                Menu
              </button>
              <div>
                <p className="eyebrow">Trading Dashboard</p>
                <h1>{pageMeta.label}</h1>
              </div>
            </div>
            <p className="hero-subtitle">
              OAuth, live market stream, approvals, wallet checks, and analytics in one interactive workspace.
            </p>
          </div>

          <div className="hero-actions">
            <label className="theme-picker">
              <span>Theme</span>
              <select value={theme} onChange={(event) => setTheme(event.target.value as ThemeKey)}>
                {themeOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {!authStatus.connected ? (
              <button className="btn btn-primary" onClick={connectUpstox} disabled={busy}>
                Connect Upstox OAuth
              </button>
            ) : null}

            <button className="btn btn-secondary" onClick={() => void refreshEverything()} disabled={busy}>
              Refresh
            </button>

            {authStatus.connected ? (
              <button className="btn btn-ghost" onClick={() => void disconnectUpstox()} disabled={busy}>
                Disconnect
              </button>
            ) : null}
          </div>
        </header>

        <section className="control-strip">
          <div className="control-field">
            <label htmlFor="underlying">Active Underlying</label>
            <select
              id="underlying"
              value={activeUnderlying?.symbol ?? ''}
              onChange={(event) => {
                void changeUnderlying(event.target.value);
              }}
              disabled={busy || underlyings.length === 0}
            >
              {underlyings.map((instrument) => (
                <option key={instrument.symbol} value={instrument.symbol}>
                  {instrument.displayName} ({instrument.assetClass})
                </option>
              ))}
            </select>
          </div>

          <div className="control-stats">
            <p>
              Options: <strong>{activeUnderlying?.supportsOptions ? 'Yes' : 'No'}</strong>
            </p>
            <p>
              Intraday: <strong>{activeUnderlying?.intradayAllowed ? 'Allowed' : 'Restricted'}</strong>
            </p>
            <p>
              Lot: <strong>{activeUnderlying?.defaultLotSize ?? '--'}</strong>
            </p>
          </div>
        </section>

        {notice ? <div className="banner banner-success">{notice}</div> : null}
        {error ? <div className="banner banner-error">{error}</div> : null}

        {pageContent()}

        <IntentApprovalModal
          intent={pendingIntent}
          busy={busy}
          isPaperMode={true}
          onApprove={approveIntent}
          onReject={rejectIntent}
          onClose={() => {
            if (pendingIntent) {
              setDismissedIntentIds((previous) =>
                previous.includes(pendingIntent.id) ? previous : [...previous, pendingIntent.id],
              );
            }
            setNotice('Intent kept pending.');
          }}
        />

        {loading ? <div className="loading-overlay">Loading dashboard...</div> : null}
      </main>
    </div>
  );
};

export default App;
