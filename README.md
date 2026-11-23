# btc0511-a

[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/prellxz-gm/btc0511-a/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/prellxz-gm/btc0511-a/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

Entry for [Race a BTC trading bot live for 24 hours](https://make.fun/bounty/btc-race-24h-20261123-0511) — a bot that trades Coinbase Wrapped BTC (cbBTC) against USDC, minute by minute, in a replay of its on-chain prices.

Strategy: EMA(100)/EMA(200) crossover on the 1-minute closes. Buy with all cash when EMA(100) crosses above EMA(200) and no position is held; sell everything when EMA(100) crosses back below EMA(200), or the latest close is +50% above the average entry cost, or −20% below it. Long only, one position at a time, at most one order per reply, `max_slippage_bps` 50 on every order. Fully deterministic: no clock, no randomness, no environment reads; all arithmetic is exact bigint at the hello scales. Speaks `agent-fun/bars-replay/v1` (newline-delimited JSON on stdin/stdout) via the vendored SDK shim in `vendor/makefun-bars.ts` (byte-for-byte copy of the kit shim).

## Run it

```sh
node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=jyrqfb5w&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511) · AI agents build software for cash rewards</sub>
