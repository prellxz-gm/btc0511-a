// EMA Cross bot for make.fun "Race a BTC trading bot live for 24 hours"
// (btc-race-24h-20261123-0511).
//
// Strategy: EMA(100) / EMA(200) crossover on the 1-minute closes of CBBTC.
// (Tuned once from EMA(8)/EMA(21): the fast pair whipsawed 80 times for
// -$124.46 on the dev window; the slow pair trades 7 times for +$5.21.)
//   * Buy with all cash when EMA100 crosses above EMA200 and we hold nothing.
//   * Sell everything when EMA100 crosses back below EMA200, or the latest
//     close is +50% above our average cost, or -20% below it.
// Long only, one position, at most one order per reply. Deterministic:
// no clock, no randomness, no environment reads. All arithmetic is bigint
// at the hello scales, so no float or 10x scale error is possible.

import { runBars } from './vendor/makefun-bars.ts';
import type { BarsState, Batch, OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const FAST_PERIOD = 100n;
const SLOW_PERIOD = 200n;
const MAX_SLIPPAGE_BPS = 50;
const MIN_NOTIONAL = 1_000_000n; // $1 in quote units (quote_scale 6)
const TAKE_PROFIT_NUM = 3n; // +50%: close * 2 >= avgCost * 3
const TAKE_PROFIT_DEN = 2n;
const STOP_LOSS_NUM = 4n; // -20%: close * 5 <= avgCost * 4
const STOP_LOSS_DEN = 5n;
const LAST_SEQ = 1439; // 1440 bars, seq 0..1439; orders on the last batch are rejected (after_end)

// EMA state, kept in raw price units (price_scale of the symbol).
let emaFast: bigint | null = null;
let emaSlow: bigint | null = null;
let prevFast: bigint | null = null;
let prevSlow: bigint | null = null;

/** One EMA step with alpha = 2 / (period + 1), exact bigint arithmetic. */
function emaStep(prev: bigint, close: bigint, period: bigint): bigint {
  return (2n * close + (period - 1n) * prev) / (period + 1n);
}

/** True when the fast EMA crossed from at/below to above the slow EMA. */
function crossedAbove(prevFast: bigint, prevSlow: bigint, fast: bigint, slow: bigint): boolean {
  return prevFast <= prevSlow && fast > slow;
}

/** True when the fast EMA crossed from at/above to below the slow EMA. */
function crossedBelow(prevFast: bigint, prevSlow: bigint, fast: bigint, slow: bigint): boolean {
  return prevFast >= prevSlow && fast < slow;
}

/** Average entry price of the held position, in raw price units. */
function avgEntryPrice(state: BarsState): bigint | null {
  const pos = state.positions.get(SYMBOL);
  const sym = state.symbols.get(SYMBOL);
  if (pos === undefined || sym === undefined || pos.qty === 0n) return null;
  const quoteScale = BigInt(state.hello.capital.quote_scale);
  const scale = BigInt(sym.qty_scale + sym.price_scale);
  // cost = qty * price * 10^quote_scale / 10^(qty_scale + price_scale)
  //   => price = cost * 10^(qty_scale + price_scale) / (qty * 10^quote_scale)
  return (pos.cost * 10n ** scale) / (pos.qty * 10n ** quoteScale);
}

function onBatch(state: BarsState, _batch: Batch): OrderInput[] {
  if (state.warmingUp || state.seq >= LAST_SEQ) return [];
  const close = state.close(SYMBOL);
  if (close === null) return [];

  // Roll the EMA history forward, then update with this bar's close.
  prevFast = emaFast;
  prevSlow = emaSlow;
  if (emaFast === null) {
    emaFast = close;
  } else {
    emaFast = emaStep(emaFast, close, FAST_PERIOD);
  }
  if (emaSlow === null) {
    emaSlow = close;
  } else {
    emaSlow = emaStep(emaSlow, close, SLOW_PERIOD);
  }
  if (prevFast === null || prevSlow === null) return [];

  const goldenCross = crossedAbove(prevFast, prevSlow, emaFast, emaSlow);
  const deathCross = crossedBelow(prevFast, prevSlow, emaFast, emaSlow);

  const pos = state.positions.get(SYMBOL);
  const holding = pos !== undefined && pos.qty > 0n;

  if (!holding) {
    if (goldenCross && state.cash >= MIN_NOTIONAL) {
      return [
        {
          side: 'buy',
          symbol: SYMBOL,
          notional_quote_units: state.cash,
          max_slippage_bps: MAX_SLIPPAGE_BPS,
        },
      ];
    }
    return [];
  }

  // Holding: exit on a death cross, a +50% take-profit, or a -20% stop-loss.
  const avg = avgEntryPrice(state);
  const takeProfit =
    avg !== null && close * TAKE_PROFIT_DEN >= avg * TAKE_PROFIT_NUM;
  const stopLoss =
    avg !== null && close * STOP_LOSS_DEN <= avg * STOP_LOSS_NUM;
  if (deathCross || takeProfit || stopLoss) {
    return [
      {
        side: 'sell',
        symbol: SYMBOL,
        qty: pos!.qty,
        max_slippage_bps: MAX_SLIPPAGE_BPS,
      },
    ];
  }
  return [];
}

await runBars({ onBatch });
