---
phase: 1
plan: 1
wave: 1
---

# Plan 1.1: Complete Bags API Integration

## Objective
Finalize the Bags API token integration in the `$VOID` UI section to ensure the "Market Cap" and "USD Price" logic are populated, making the section production-ready for the hackathon launch.

## Context
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- `main.js` (lines 5250-5310, `voidFetch` function)
- `index.html` (lines ~960-1015)

## Tasks

<task type="auto">
  <name>Enhance Bags API Fetch Logic</name>
  <files>main.js, index.html</files>
  <action>
    - Review the `voidFetch` function inside `main.js`.
    - Note that `#v-mcap` and `#v-price-usd` UI elements exist but are not currently populated with real data.
    - Add logic to calculate or fetch the token Market Cap based on the SOL price * Total Supply. If Total Supply is unknown from the quote response, assume a standard 1 Billion supply for the tokenomics. 
    - Fetch the live SOL/USD price using a public free API (e.g., Jupiter API or Coingecko) to accurately calculate and display the USD equivalent in `#v-price-usd` and `#v-mcap`.
    - Avoid changing the Bags API base endpoint or introducing heavy SDKs; keep it lightweight vanilla `fetch`.
  </action>
  <verify>grep_search -i "v-mcap" main.js</verify>
  <done>The `voidFetch` function successfully populates the `v-mcap` DOM element and `v-price-usd` with calculated data.</done>
</task>

## Success Criteria
- [ ] `$VOID` token section displays live SQL price, USD price, Fees, and Market Cap.
- [ ] No console errors when hitting the 'Connect Live Data' button natively.
