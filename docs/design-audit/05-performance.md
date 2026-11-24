# Performance as Perceived Design Quality

A diagnostic audit of client-side rendering speed, bundle weights, DOM node density, and layout stability during 2-second live SSE data streams.

---

## 1. Bundle Sizes & Asset Distribution

Measured from production bundle generation (`ng build`):

| Chunk / Asset | Module / Scope | Raw Size | Estimated Gzip | Assessment |
|---|---|---|---|---|
| `main.js` | Core framework, routing, signals | **342.18 kB** | ~92 kB | Optimal |
| `styles.css` | Global theme tokens, typography, glass | **64.22 kB** | ~14 kB | Lightweight |
| `chunk-PALB4W4J.js` | Notification Channels feature | **138.12 kB** | ~38 kB | Acceptable |
| `chunk-B2QKSRBW.js` | Alerts & Rules feature | **125.60 kB** | ~35 kB | Acceptable |
| `chunk-6VXT3NP7.js` | Containers List feature | **124.74 kB** | ~34 kB | Acceptable |
| `chunk-EG62YUF5.js` | Settings feature | **122.79 kB** | ~33 kB | Acceptable |
| `chunk-7RC77IEB.js` | Dashboard feature | **107.45 kB** | ~29 kB | Highly optimized |
| `chunk-WJAB5QYO.js` | Host Server feature | **106.39 kB** | ~28 kB | Highly optimized |
| `chunk-PARI7344.js` | Compose Projects feature | **90.87 kB** | ~25 kB | Highly optimized |
| `chunk-NKRDZJVY.js` | Audit Log feature | **87.76 kB** | ~23 kB | Highly optimized |
| `chunk-2OFRVBDQ.js` | Users & Roles feature | **84.34 kB** | ~22 kB | Highly optimized |
| `chunk-SXW6BSNB.js` | Logs Explorer feature | **53.82 kB** | ~16 kB | Exceptionally lean |

**Total Initial JavaScript Payload**: ~406 kB uncompressed (~106 kB gzipped). Initial load is fast and respects budget limits.

---

## 2. Real-Time Telemetry & SSE Update Profiling (Dashboard & Containers)

A 15-second diagnostic recording during live server-sent events (`/api/v1/overview/stream` and `/api/v1/containers/stream`) on the Dashboard:

| Metric | Measured Value | Threshold | Performance Verdict |
|---|---|---|---|
| **Sample Duration** | 15.0 seconds | — | Baseline sample |
| **DOM Mutations** | 6 events (~1 per 2.5s) | < 10 per tick | ✅ Excellent DOM scoping via Angular Signals |
| **Layout Shift Events** | 2 shifts detected | 0 | ⚠️ Needs tabular numerals |
| **Cumulative Layout Shift (CLS)** | **0.03065** | < 0.10 (Good) | ⚠️ Passable, but visually perceptible |
| **Memory Growth** | +1.8 MB (steady GC cycle) | < 10 MB/min | ✅ No memory leaks detected |
| **FPS Stability** | 58–60 fps | 60 fps | ✅ Silky animation transitions |

### Root Cause of CLS (0.03065)
The layout shifts stem from **numeric proportional font rendering** in CPU and memory percentage values (`Space Grotesk`). When a container jumps from `9.8%` to `10.2%`, the string length increases by one character and the digit `1` occupies less advance width than `0`. Sibling progress bars and status labels snap by 4–8px horizontally.
- **Fix**: Apply `font-variant-numeric: tabular-nums;` and fixed-width numeric containers (`min-width: 58px; text-align: right;`).

---

## 3. Virtual Scrolling & High-Volume Log Streaming

- **Test Payload**: 2,000 log lines streamed via `/logs`.
- **Implementation**: Angular CDK Virtual Scroll (`cdk-virtual-scroll-viewport`).
- **Results**:
  - **DOM Node Count**: Capped at **48 active DOM nodes** inside the viewport buffer regardless of total buffer length.
  - **Scroll Frame Rate**: Maintains a locked **60 fps** during rapid trackpad scrolling.
  - **Minimap Tick Performance**: Error and warning minimap ticks are rendered as absolute CSS pills with negligible composite overhead.

---

## 4. Web Vitals Benchmark Summary (1440x900)

| Route | Largest Contentful Paint (LCP) | Interaction to Next Paint (INP) | Cumulative Layout Shift (CLS) | Total Blocking Time (TBT) |
|---|---|---|---|---|
| `/login` | 0.8s | 28ms | 0.000 | 12ms |
| `/dashboard` | 1.1s | 34ms | 0.031 | 18ms |
| `/containers` | 1.2s | 42ms | 0.008 | 24ms |
| `/containers/c1`| 1.3s | 46ms | 0.012 | 26ms |
| `/logs` | 1.2s | 38ms | 0.004 | 22ms |
| `/host` | 1.4s | 48ms | 0.015 | 30ms |
| `/audit` | 1.1s | 36ms | 0.002 | 16ms |
