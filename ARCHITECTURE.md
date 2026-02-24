# Fodl Bitcoin Chart — Complete Architecture & Knowledge Base

> Standalone extraction of the Fodl app's Bitcoin chart screen for independent vibe coding.
> Production-quality code from the original monorepo, simplified to run in an isolated Expo project.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [How This Project Was Created](#how-this-project-was-created)
3. [Running the Project](#running-the-project)
4. [File Map & Dependency Graph](#file-map--dependency-graph)
5. [Screen Layout & Spacing](#screen-layout--spacing)
6. [Data Pipeline](#data-pipeline)
7. [Animation System](#animation-system)
8. [Chart Rendering Layers](#chart-rendering-layers)
9. [Gesture & Interaction System](#gesture--interaction-system)
10. [Theme System (Fold Design Tokens)](#theme-system-fold-design-tokens)
11. [API & Data Fetching](#api--data-fetching)
12. [Currency Conversion System](#currency-conversion-system)
13. [Component Reference](#component-reference)
14. [Key Algorithms](#key-algorithms)
15. [Constants & Magic Numbers](#constants--magic-numbers)
16. [Gotchas & Lessons Learned](#gotchas--lessons-learned)
17. [What Was Removed vs. Original](#what-was-removed-vs-original)
18. [Sending Changes Back to the Team](#sending-changes-back-to-the-team)

---

## Project Overview

This is a fully functional, standalone Expo app containing the Fodl Bitcoin exchange chart screen. It includes:

- **Live BTC price chart** with Skia-rendered smooth curves
- **5 timeframes**: 1D, 1W, 1M, 1Y, ALL with animated morphing transitions
- **Touch scrubbing** with haptic feedback and crosshair overlay
- **Pulsing endpoint** (Lottie) on the 1D view
- **Live API data** from `api.foldapp.com` with mock data fallback
- **Full Fold design system** — colors, typography (Geist font), spacing, radius
- **Production header bar** — menu icon (left), clock + bell icons (right)
- **Bottom tab bar** — 3 tabs matching the original app (Bank, Exchange, Shop)

### Tech Stack

| Technology | Purpose |
|---|---|
| Expo SDK 54 | App framework |
| React Native 0.81 | UI runtime (New Architecture enabled) |
| `@shopify/react-native-skia` | GPU-accelerated chart path rendering |
| `victory-native` | Chart data binding, touch state, axis management |
| `react-native-reanimated` v4 | SharedValue animations on UI thread |
| `react-native-unistyles` v3 | Theme tokens with adaptive dark/light |
| `@tanstack/react-query` v5 | Data fetching, caching, prefetching |
| `lottie-react-native` | Pulsing endpoint animation |
| `expo-haptics` | Scrub haptic feedback |
| `bignumber.js` | Precise BTC/USD currency math |
| `dayjs` | Date formatting |
| `react-native-svg` | Icon rendering |

---

## How This Project Was Created

This project was extracted from the Fodl monorepo (`fodl-dev/`) by tracing every dependency the Bitcoin chart screen touches. The original code lives across:

- `apps/mobile/screens/(tabs)/BitcoinExchange.tsx` — the full screen (908 lines)
- `apps/mobile/app/(tabs)/_layout.tsx` — tab navigation with 3 tabs + haptic tab button
- `apps/mobile/components/BitcoinChart/` — 8 chart components
- `packages/ui/src/` — shared theme, API, hooks, utils, components, icons

### What was simplified during extraction:

| Original | Standalone |
|---|---|
| `fetchClient.ts` with Datadog logging, MMKV session tokens, auth headers | Plain `fetch()` with no auth |
| `FoldTabView` with scroll-animated header, inbox, rewards chip | Static header with icons, no scroll tracking |
| `FoldButton` with Datadog RUM tracking | Same button without analytics |
| `FoldPressable` with Datadog RUM `trackAction()` | Same pressable without analytics |
| `AndroidHaptics.Segment_Frequent_Tick` (API 34+) | `Haptics.impactAsync(Soft)` fallback |
| Theme with `UnistylesRuntime.screen.height` for radius | `Dimensions.get("window").height` |
| Monorepo `@fodl/ui/*` imports | Local `./src/*` relative imports |
| Expo Router `<Tabs>` with 3 real screens | Static `FoldTabBar` with icons, no routing |
| Buy/Sell buttons open modals with KYC guards | Placeholder no-op buttons |

### What was kept 1:1 from production:

- All 8 BitcoinChart components (AnimatedChartLine, AnimatedAreaMask, ChartBackgroundGrid, ChartSkeleton, AnimatedPulsingEndpoint, types, utils, index)
- Chart smoothing algorithms (Catmull-Rom spline interpolation)
- Dual-axis interpolation animation system
- Full color palette and typography scale
- Currency conversion with BigNumber.js precision
- React Query caching strategy with prefetching
- FoldHeader component (production layout with left/center/right sections)
- All navigation icons (MenuIcon, ClockIcon, BellIcon) and tab icons (NavBankDuoIcon, NavExchangeSolidIcon, NavTagDuoIcon)

---

## Running the Project

```bash
cd ~/Downloads/fodl-bitcoin-chart

# Install dependencies
npm install

# This requires a dev build (not Expo Go) due to native modules
npx expo run:ios
# or
npx expo run:android
```

### Toggle Live vs Mock Data

In `App.tsx`, line ~217:
```typescript
const USE_LIVE_DATA = true;  // true = hits api.foldapp.com, false = mock only
```

Mock data generates deterministic BTC prices using a seeded PRNG so charts look realistic without network.

---

## File Map & Dependency Graph

```
fodl-bitcoin-chart/
├── App.tsx                          # Entry point: providers + full chart screen
├── babel.config.js                  # Reanimated plugin
├── app.json                         # Expo config
├── index.ts                         # registerRootComponent
├── assets/
│   ├── fonts/
│   │   ├── Geist-Regular.otf
│   │   ├── Geist-Medium.otf
│   │   └── Geist-SemiBold.otf
│   └── animations/
│       └── pulser.json              # Lottie pulsing dot (24x24)
└── src/
    ├── api/
    │   └── api.ts                   # getBitcoinChartData, getExchangeRate
    ├── constants/
    │   └── queryKeys.ts             # React Query cache keys
    ├── hooks/
    │   └── useExchangeRate.ts       # BTC/USD rate hook (15s stale)
    ├── utils/
    │   ├── chartSmoothing.ts        # Catmull-Rom spline, resampling
    │   ├── conversions.ts           # BTC ↔ USD with BigNumber.js
    │   └── stringFormats.ts         # Price formatting ($X,XXX.XX / ₿0.00)
    ├── icons/
    │   ├── ArrowNarrowUpIcon.tsx    # SVG arrow for price direction
    │   ├── MenuIcon.tsx             # Hamburger menu (header left)
    │   ├── ClockIcon.tsx            # Transactions (header right)
    │   ├── BellIcon.tsx             # Notifications (header right)
    │   ├── NavBankDuoIcon.tsx       # Bank tab (inactive, duo-tone)
    │   ├── NavExchangeSolidIcon.tsx # Exchange tab (active, solid)
    │   └── NavTagDuoIcon.tsx        # Shop tab (inactive, duo-tone)
    ├── theme/
    │   ├── install.ts               # Unistyles configure (MUST import first)
    │   ├── index.ts                 # Theme assembly
    │   ├── color/colors.ts          # Full color palette + semantic maps
    │   ├── typography/
    │   │   ├── typography.ts        # 16 text styles (Geist family)
    │   │   ├── fonts.ts             # Font weight mappings
    │   │   └── size.ts              # Font size scale
    │   ├── size/
    │   │   ├── spacing.ts           # 14 spacing tokens (0–128px)
    │   │   ├── radius.ts            # Border radius scale
    │   │   ├── size.ts              # Size tokens
    │   │   └── breakpoints.ts       # Responsive breakpoints
    │   └── util/
    │       └── color.ts             # getRGBA, toHex, toRGBA, adjustOpacity
    └── components/
        ├── FoldText.tsx             # Typography component
        ├── FoldButton.tsx           # Animated press button
        ├── FoldConversionText.tsx   # Currency conversion display
        ├── FoldPillSelector.tsx     # Timeframe pill selector
        ├── FoldPressable.tsx        # Pressable with auto hitSlop + haptics
        ├── FoldHeader.tsx           # Header bar (left/center/right layout)
        ├── FoldTabView.tsx          # Screen container with header + icons
        ├── FoldTabBar.tsx           # Bottom tab bar (static, 3 tabs)
        └── BitcoinChart/
            ├── types.ts             # ChartDataPoint, NormalizedPoint, CoordParams
            ├── utils.ts             # generateSmoothPath, generateAreaPath (worklets)
            ├── AnimatedChartLine.tsx # Dual-axis interpolated line
            ├── AnimatedAreaMask.tsx  # Gradient area fill under line
            ├── ChartBackgroundGrid.tsx  # Dot grid + crosshairs + scrub overlay
            ├── ChartSkeleton.tsx    # Shimmer loading animation
            ├── AnimatedPulsingEndpoint.tsx  # Lottie pulsing dot (1D)
            └── index.ts             # Barrel exports
```

### Dependency Flow

```
App.tsx (entry)
  ├── theme/install.ts (MUST be first import)
  ├── QueryClientProvider → useQuery, useQueryClient
  ├── SafeAreaProvider → useSafeAreaInsets (in FoldTabView, FoldTabBar)
  ├── GestureHandlerRootView → gesture system
  ├── expo-font → Geist font loading
  │
  ├── View wrapper (flex: 1) ← critical for tab bar layout
  │   ├── BitcoinChartScreen (flex: 1 via FoldTabView)
  │   │   ├── FoldTabView → header + content container
  │   │   │   ├── FoldHeader → left/center/right layout
  │   │   │   │   ├── FoldPressable → haptic touch targets
  │   │   │   │   ├── MenuIcon (left)
  │   │   │   │   ├── ClockIcon (right)
  │   │   │   │   └── BellIcon (right)
  │   │   │   └── Content (flex: 1)
  │   │   │
  │   │   ├── api/api.ts → fetch from api.foldapp.com
  │   │   ├── hooks/useExchangeRate.ts → React Query + api.ts
  │   │   ├── utils/chartSmoothing.ts → Catmull-Rom math
  │   │   ├── utils/conversions.ts → BigNumber.js
  │   │   │
  │   │   ├── CartesianChart (victory-native) → provides chartBounds, points
  │   │   │   ├── ChartBackgroundGrid → dot grid, crosshairs, area mask
  │   │   │   │   └── AnimatedAreaMask → gradient fill under line
  │   │   │   ├── AnimatedChartLine (x2) → black left / yellow right
  │   │   │   └── ToolTip (Skia Circle) → scrub indicator dot
  │   │   │
  │   │   ├── AnimatedPulsingEndpoint → Lottie animation (1D only)
  │   │   ├── AnimatedDateLabel → floating date during scrub
  │   │   │
  │   │   ├── FoldText → all text rendering
  │   │   ├── FoldConversionText → price display with conversion
  │   │   ├── FoldPillSelector (x5) → timeframe selection
  │   │   ├── FoldButton (x2) → Buy / Sell placeholders
  │   │   └── ArrowNarrowUpIcon → price direction arrow
  │   │
  │   └── FoldTabBar → bottom tab bar (fixed height)
  │       ├── NavBankDuoIcon (inactive)
  │       ├── NavExchangeSolidIcon (active, filled)
  │       └── NavTagDuoIcon (inactive)
```

---

## Screen Layout & Spacing

The full screen layout from top to bottom:

```
┌─────────────────────────────────────┐
│  SAFE AREA TOP INSET                │  ← system (dynamic per device)
├─────────────────────────────────────┤
│  HEADER (48px)                      │  ← FoldHeader inside FoldTabView
│  [≡ Menu]              [⏰] [🔔]   │  ← paddingHorizontal: 20px
├─────────────────────────────────────┤
│                                     │
│  paddingVertical: 3xl (32px)        │  ← outer wrapper View
│                                     │
│  ┌─── TEXT HEADER ────────────────┐ │
│  │ paddingHorizontal: xl (20px)   │ │
│  │ gap: xxs (4px) between rows   │ │
│  │                                │ │
│  │ [Bitcoin]         [Today]      │ │  row 1
│  │ [$97,234]    [↑ 2.45%]        │ │  row 2 (gap 3xs/2px between arrow+%)
│  │                                │ │
│  │ marginBottom: 3xl (32px)       │ │
│  └────────────────────────────────┘ │
│                                     │
│  ┌─── CHART ─────────────────────┐ │
│  │ width: 100%, flex: 1          │ │  ← takes all remaining space
│  │ NO horizontal padding         │ │  ← chart bleeds edge-to-edge
│  │ marginBottom: xl (20px)       │ │
│  │                                │ │
│  │ domainPadding:                │ │
│  │   top: 15, bottom: 15        │ │  ← Victory internal padding
│  │   left: 0                    │ │
│  │   right: 25 (1D) or 2        │ │  ← room for pulsing dot
│  │                                │ │
│  │ dotMargin: 14px               │ │  ← inside chart, top/bottom
│  └────────────────────────────────┘ │
│                                     │
│  ┌─── BOTTOM CONTROLS ───────────┐ │
│  │ paddingHorizontal: xl (20px)   │ │
│  │ gap: xxl (24px) between groups │ │
│  │                                │ │
│  │ ┌─ PILLS ───────────────────┐ │ │
│  │ │ paddingVertical: xs (6px) │ │ │
│  │ │ gap: xxs (4px)           │ │ │
│  │ │ [1D] [1W] [1M] [1Y] [ALL]│ │ │  each pill: flex:1
│  │ └───────────────────────────┘ │ │
│  │                                │ │
│  │ ┌─ BUTTONS ─────────────────┐ │ │
│  │ │ gap: lg (16px)           │ │ │
│  │ │ [  Buy  ]  [  Sell  ]    │ │ │  each button: flex:1
│  │ └───────────────────────────┘ │ │
│  └────────────────────────────────┘ │
│                                     │
│  paddingVertical: 3xl (32px)        │  ← bottom of outer wrapper
├─────────────────────────────────────┤
│  TAB BAR (48px)                     │  ← FoldTabBar
│  [🏦 Bank]  [⇄ Exchange]  [🏷 Shop] │  ← yellow bg, 1px top border
├─────────────────────────────────────┤
│  SAFE AREA BOTTOM INSET            │  ← system (dynamic per device)
└─────────────────────────────────────┘
```

### Key Spacing Values

| Token | Value | Where Used |
|---|---|---|
| `spacing.3xl` (32px) | Outer wrapper `paddingVertical` — breathing room top & bottom |
| `spacing.xl` (20px) | Header text & bottom controls `paddingHorizontal` — side margins |
| `spacing.xxs` (4px) | Gap between "Bitcoin/$97K" rows, gap between timeframe pills |
| `spacing.3xs` (2px) | Gap between arrow icon and percent text |
| `spacing.3xl` (32px) | `marginBottom` below header text, before chart |
| `spacing.xl` (20px) | `marginBottom` below chart, before pills |
| `spacing.xxl` (24px) | Gap between pills row and buttons row |
| `spacing.lg` (16px) | Gap between Buy and Sell buttons |
| `spacing.xs` (6px) | `paddingVertical` on pills container row |

### Critical Layout Detail: Chart Has NO Horizontal Padding

The chart `View` is `width: 100%` with zero horizontal padding. The Skia canvas fills edge-to-edge. Only the **text header** and **bottom controls** have `paddingHorizontal: xl (20px)`. This gives the chart maximum width while text content sits inset.

### Header Layout (FoldHeader)

The header uses absolute positioning for left/right icons with a centered title area:

```
paddingHorizontal: 20px (containerPaddingHorizontal)
paddingVertical: 4px (containerPaddingVertical)
icon padding: 8px

┌─────────────────────────────────────────┐
│ [Menu]         (center title)  [⏰] [🔔] │  48px height
│  ↑ abs left                    ↑ abs right │
│  marginLeft:20              marginRight:20 │
└─────────────────────────────────────────┘

Center title max width = screenWidth - leftWidth - rightWidth - 40 - gap - 45
```

Right icons have `gap: lg (16px)` between them and `hitSlop={10}` for larger touch targets.

### Tab Bar Layout (FoldTabBar)

```
┌─────────────────────────────────────────┐
│ 1px border (border.primary / #E8BE11)   │
├───────────┬───────────┬─────────────────┤
│           │           │                 │
│  🏦 Bank  │ ⇄ Exchange│  🏷 Shop        │  48px height
│  (duo)    │  (solid)  │  (duo)          │
│  inactive │  ACTIVE   │  inactive       │
│           │           │                 │
├───────────┴───────────┴─────────────────┤
│ safe area bottom inset                  │
└─────────────────────────────────────────┘

Background: object.primary.bold.default (#FFDD33)
Border: border.primary (#E8BE11)
Active icon fill: face.primary (#383723)
Inactive icons: hardcoded #7A6E53 in SVG
Each tab: flex:1, centered, TouchableOpacity with light haptic
```

### App.tsx Root Layout Structure

```jsx
<GestureHandlerRootView style={{ flex: 1 }}>
  <SafeAreaProvider>
    <QueryClientProvider>
      <View style={{ flex: 1 }}>        {/* ← critical wrapper */}
        <BitcoinChartScreen />           {/* ← flex: 1 via FoldTabView */}
        <FoldTabBar />                   {/* ← fixed height at bottom */}
      </View>
    </QueryClientProvider>
  </SafeAreaProvider>
</GestureHandlerRootView>
```

The `<View style={{ flex: 1 }}>` wrapper is required to create a proper flex column. Without it, `BitcoinChartScreen` (which has `flex: 1` via FoldTabView) and `FoldTabBar` don't layout correctly.

---

## Data Pipeline

The chart transforms raw API data through several stages before rendering:

```
1. API Response (variable length)
   getBitcoinChartData("1d") → ChartDataPoint[]
   e.g., 288 points for 1D (5-min intervals)

2. Resampling to Fixed Count
   resampleToFixedCount(data, 288) → ChartDataPoint[]
   Linear interpolation to exactly 288 points (TARGET_POINT_COUNT)
   This is the "detailed" dataset

3. Smooth Curve Generation
   getTargetPointsForTimeframe(length) → min(20, length) control points
   smoothChartData(data, 20) → 20 averaged bucket points
   resampleWithSpline(smoothed, 288) → 288 smooth points via Catmull-Rom
   This is the "smooth" dataset

4. Normalization to 0-1 Range
   For each point:
     x = index / (length - 1)          → horizontal: 0 to 1
     y = (rate - minPrice) / range      → vertical: 0 to 1
   Creates NormalizedPoint[] for both smooth and detailed

5. SharedValue Assignment
   fromSmoothPoints ← previous toSmoothPoints
   fromDetailedPoints ← previous toDetailedPoints
   toSmoothPoints ← new normalizedSmooth
   toDetailedPoints ← new normalizedDetailed

6. Animation Trigger
   rangeTransition: 0 → 1 over 600ms (Easing.out(cubic))

7. Pixel Conversion (in worklets)
   pixelX = chartLeft + normX * usableWidth
   pixelY = chartBottom - dotMargin - normY * usableHeight
```

### Why Two Datasets?

| Dataset | Used When | Visual Effect |
|---|---|---|
| **Smooth** (20 control points → 288 spline) | Default idle view | Elegant flowing curves |
| **Detailed** (288 linearly resampled) | During scrubbing | Precise data-accurate positions |

The `interactionProgress` shared value (0 = smooth, 1 = detailed) blends between them during scrubbing so the line morphs from pretty to precise as the user starts touching.

---

## Animation System

### Core Concept: Dual-Axis Interpolation

Every animated chart component uses the same interpolation pattern with two independent axes:

**Axis 1 — Interaction** (`interactionProgress`: 0→1)
- 0 = show smooth curve (idle)
- 1 = show detailed curve (scrubbing)
- 200ms transition with `Easing.out(Easing.cubic)`

**Axis 2 — Range/Timeframe** (`rangeTransition`: 0→1)
- 0 = show FROM timeframe data
- 1 = show TO timeframe data
- 600ms transition with `Easing.out(Easing.cubic)`

**The interpolation formula** (repeated in every animated component):

```javascript
// Step 1: Blend within TO dataset based on interaction
toTarget = toSmooth + (toDetailed - toSmooth) * tInteraction

// Step 2: Blend within FROM dataset based on interaction
fromTarget = fromSmooth + (fromDetailed - fromSmooth) * tInteraction

// Step 3: Blend FROM → TO based on range transition
final = fromTarget + (toTarget - fromTarget) * tRange
```

This creates a 2D animation space where switching timeframes AND starting/stopping scrubbing can happen simultaneously without conflict.

### Smoothing Passes

The line's visual smoothing is also animated:

```javascript
const smoothingPasses = Math.round(3 * (1 - tInteraction));
// tInteraction = 0 (idle)     → 3 passes (very smooth)
// tInteraction = 0.5 (mid)    → 2 passes (moderate)
// tInteraction = 1 (scrubbing) → 0 passes (raw data)
```

### Gaussian Kernel for Path Smoothing

Both `generateSmoothPath()` and `generateAreaPath()` use a 5-point weighted moving average:

```
Weights: [1, 4, 6, 4, 1] / 16
```

This is a discrete Gaussian approximation. Applied in multiple passes (0-3), keeping first 2 and last 2 points unchanged to preserve curve endpoints.

### Animation Timing Summary

| Animation | Duration | Easing | Trigger |
|---|---|---|---|
| Range transition (timeframe switch) | 600ms | `Easing.out(cubic)` | Data change detected |
| Interaction transition (scrub start/stop) | 200ms | `Easing.out(cubic)` | `isActive` change |
| Chart fade-in | 300ms | `Easing.out(cubic)` | First data load |
| Tooltip opacity | 50ms | `Easing.out(cubic)` | Touch start/end |
| Button press scale | 75ms | `withTiming` default | Press in/out |
| Skeleton shimmer | 3000ms | `Easing.inOut(ease)` | Infinite loop (reverse) |

### Worklet Execution

All path generation and coordinate math runs on the UI thread via Reanimated worklets:
- `generateSmoothPath()` — has `"worklet"` pragma
- `generateAreaPath()` — has `"worklet"` pragma
- All `useDerivedValue` callbacks
- Coordinate conversion (normalized → pixel)

This eliminates JS bridge round-trips, keeping animations at 60/120fps.

---

## Chart Rendering Layers

The chart renders inside Victory Native's `CartesianChart` component. Inside its render function, Skia components are layered bottom-to-top:

```
Layer 1 (bottom): ChartBackgroundGrid
  ├── Gradient dot grid (8px spacing)
  ├── AnimatedAreaMask (yellow gradient fill under line)
  ├── AnimatedScrubbedDots (dark dots left of crosshair)
  └── AnimatedCrosshairs (yellow crosshair lines)

Layer 2: AnimatedChartLine (primary, black)
  └── Clipped to LEFT of crosshair when scrubbing

Layer 3: AnimatedChartLine (dimmed, yellow)
  └── Clipped to RIGHT of crosshair when scrubbing
  └── Only visible during scrubbing (showLine prop)

Layer 4 (top): ToolTip
  └── Skia Circle (6r black fill + yellow 2px stroke)

Layer 5 (overlay, outside CartesianChart): AnimatedPulsingEndpoint
  └── Lottie 24x24 animation (1D only, not during scrubbing)

Layer 6 (overlay, outside CartesianChart): AnimatedDateLabel
  └── Floating text following cursor X position
```

### Dot Grid Details

The background is a grid of dots with dynamic opacity based on context:

**1D idle mode** — angular fade from endpoint:
```javascript
opacity = Math.max(0, Math.min(1, distFromEndpoint / 60))
// Dots near the endpoint are transparent, far ones are opaque
```

**Scrubbing mode** — fade from crosshair:
```javascript
opacity = Math.max(0.15, 1 - (distFromCrosshair / 150) * 0.85)
// Minimum 15% opacity, fading toward crosshair
```

**AnimatedScrubbedDots** — an animated Skia clip rect follows the crosshair X position, rendering darker dots (`#D1A300`) on the left side of the crosshair.

### Gradient Colors (top → bottom)

```javascript
["#FFDD33", "#E8BE11", "#D1A300"]
// Bright yellow → mid gold → dark gold
```

Used by both the area mask fill and the skeleton shimmer.

---

## Gesture & Interaction System

### Victory Native Touch Tracking

```javascript
const { state, isActive } = useChartPressState({
  x: 0,
  y: { rate: 0 },
});
```

Victory provides:
- `state.x.position` — SharedValue of pixel X position
- `state.matchedIndex` — SharedValue of nearest data point index
- `state.isActive` — SharedValue boolean (finger down)
- `isActive` — JS boolean (for conditional rendering)

### Index Mapping

Victory works with the raw `chartData` array (variable length), but the animation system uses 288-point normalized arrays. The mapping:

```javascript
const mappedIdx = Math.round(
  (victoryIdx / Math.max(chartDataLength - 1, 1)) * (normalizedArray.length - 1)
);
const clampedIdx = Math.min(Math.max(0, mappedIdx), normalizedArray.length - 1);
```

This mapping appears in: ToolTip, AnimatedCrosshairs, and the main screen's clipY calculation.

### Haptic Feedback

| Platform | Behavior |
|---|---|
| iOS | `Haptics.selectionAsync()` on every index change |
| Android (API 34+) | `Haptics.impactAsync(Soft)` on every index change |
| Android (older) | `Haptics.impactAsync(Soft)` with 80ms debounce |

Haptics only fire when `matchedIndex` actually changes (tracked via `previousMatchedIndexRef`).

### Selected Data Point Logic

```javascript
const selectedDataPoint =
  isActive && selectedIndex !== null && chartData[selectedIndex]
    ? chartData[selectedIndex]      // Scrubbing: show touched point
    : latestDataPoint;              // Idle: show current price

const currentPrice = selectedDataPoint?.rate ?? latestPrice;
```

### Price Display During Scrubbing

- **Header price**: Updates to the scrubbed point's price
- **Percent change**: Recalculated from earliest point to scrubbed point
- **Arrow direction**: Flips based on `differenceInPrice` sign (`scaleY: -1`)
- **Date label**: Follows cursor X, clamped to screen bounds (140px wide label)
- **Timeframe label**: Changes to specific date/time of scrubbed point

---

## Theme System (Fold Design Tokens)

### Import Order (Critical)

```javascript
// This MUST be the first import in App.tsx
import "./src/theme/install";
```

`install.ts` calls `StyleSheet.configure()` which registers themes and breakpoints with Unistyles. If imported after component code, theme values will be undefined.

### Color Architecture

**6 color families** with 11 shades each (000–1000):

| Family | Base Color | Usage |
|---|---|---|
| `yellow` | `#FFDD33` (400) | Primary brand, chart fills |
| `red` | `#F44C4C` (400) | Negative sentiment |
| `green` | `#12B76A` (400) | Positive sentiment |
| `blue` | `#4C8DF4` (400) | Accent, links |
| `gray` | `#949494` (400) | Neutral, disabled |
| `grayAlpha` | `rgba(0,0,0,0.24)` | Overlays, shadows |

**Semantic color maps** (what components actually use):

```
theme.colors.
├── layer.background          # Screen background
├── object.
│   ├── primary.bold.default  # Primary buttons, chart bg, tab bar bg
│   ├── primary.bold.pressed  # Pressed state, active pill
│   ├── inverse.default       # Inverse buttons (Buy/Sell)
│   ├── positive.bold.default # Green for price up
│   ├── negative.bold.default # Red for price down
│   ├── tertiary.default      # Pill unselected
│   ├── tertiary.pressed      # FoldPressable pressed background
│   └── disabled.disabled     # Disabled state
├── face.
│   ├── primary               # Main text, active tab icon fill
│   ├── secondary             # Secondary text
│   ├── tertiary              # Dim text (date labels)
│   ├── disabled              # Disabled text
│   └── inversePrimary        # Text on inverse buttons
└── border.
    ├── primary               # Tab bar top border (#E8BE11)
    ├── tertiary              # Pill borders, header divider
    └── focused               # Focus rings
```

### Typography Scale

16 text styles using Geist font family:

| Style | Font | Size | Line Height |
|---|---|---|---|
| `header-xl` | Geist-Regular | 40px | 44px |
| `header-lg` | Geist-Regular | 32px | 36px |
| `header-md` | Geist-Regular | 24px | 28px |
| `header-sm` | Geist-Regular | 20px | 24px |
| `header-xs` | Geist-Regular | 18px | 20px |
| `header-xxs` | Geist-Medium | 16px | 18px |
| `body-lg` | Geist-Regular | 16px | 24px |
| `body-lg-bold` | Geist-Medium | 16px | 24px |
| `body-md` | Geist-Regular | 14px | 20px |
| `body-md-bold` | Geist-Medium | 14px | 20px |
| `body-sm` | Geist-Regular | 12px | 16px |
| `body-sm-bold` | Geist-Medium | 12px | 16px |
| `caption` | Geist-Regular | 10px | 12px |
| `caption-bold` | Geist-SemiBold | 10px | 12px |
| `button-lg` | Geist-Medium | 16px | 16px |
| `button-sm` | Geist-Medium | 14px | 14px |

### Spacing Scale

```
none: 0    3xs: 2    xxs: 4    xs: 6     sm: 8
md: 12     lg: 16    xl: 20    xxl: 24   3xl: 32
4xl: 40    5xl: 48   6xl: 56   7xl: 64   8xl: 96
9xl: 128
```

### Using the Theme

```javascript
const theme = UnistylesRuntime.getTheme();

// Colors
theme.colors.face.primary
theme.colors.object.primary.bold.default

// Spacing
theme.spacing.xl  // 20
theme.spacing["3xl"]  // 32

// Typography (applied via FoldText)
theme.typography["header-md"]  // { fontFamily, fontSize, lineHeight }

// Radius
theme.radius.md  // 8

// Color utilities
theme.utils.color.adjustOpacity("rgba(0,0,0,1)", 0.5)  // rgba(0,0,0,0.5)
theme.utils.color.toHex("rgba(255,0,0,1)")  // #FF0000
```

---

## API & Data Fetching

### Endpoints

| Endpoint | Method | Response |
|---|---|---|
| `/v1/chart/bitcoin?time_range=1d` | GET | `ChartDataPoint[]` |
| `/v1/chart/bitcoin?time_range=1w` | GET | `ChartDataPoint[]` |
| `/v1/chart/bitcoin?time_range=1m` | GET | `ChartDataPoint[]` |
| `/v1/chart/bitcoin?time_range=1y` | GET | `ChartDataPoint[]` |
| `/v1/chart/bitcoin?time_range=all` | GET | `ChartDataPoint[]` |
| `/v1/exchange-rates` | GET | `{ data: { USD: { BTC: number } } }` |

Base URL: `process.env.EXPO_PUBLIC_API_URL` or `https://api.foldapp.com`

### Caching Strategy

```javascript
// Per-timeframe chart data
useQuery({
  queryKey: ["bitcoin-market-chart", timeframeValue],
  staleTime: 60 * 60 * 1000,          // Consider fresh for 1 hour
  refetchInterval: 5 * 60 * 1000,     // Re-fetch every 5 minutes
  refetchIntervalInBackground: true,   // Even when app is backgrounded
  placeholderData: (prev) => prev,     // Keep old data while fetching new
});

// Exchange rate
useQuery({
  queryKey: ["exchangeRate"],
  staleTime: 15 * 1000,               // Fresh for 15 seconds
});
```

### Prefetching

On mount, the app prefetches ALL timeframes in parallel so switching between 1D/1W/1M/1Y/ALL is instant:

```javascript
useEffect(() => {
  const timeframeValues = ["1w", "1m", "1y", "all"];
  await Promise.all(
    timeframeValues.map((tr) =>
      queryClient.prefetchQuery({
        queryKey: queryKeys.bitcoinChartKeys(tr.toUpperCase()),
        queryFn: () => getBitcoinChartData(tr),
        staleTime: 60 * 60 * 1000,
      })
    )
  );
}, []);
```

The default 1D data loads via `useQuery`, while the rest are prefetched. This means:
- First load: shows 1D data immediately
- Switching to 1W/1M/1Y/ALL: data already cached, morph animation plays instantly

---

## Currency Conversion System

### Units

```typescript
enum UNIT { BTC, MBTC, BITS, SATS, USD }
```

### Conversion Math (BigNumber.js)

```
BTC  = 1 BTC
mBTC = 0.001 BTC
bits = 0.000001 BTC
sats = 0.00000001 BTC
```

Conversion flow:
1. Convert source unit to BTC: `value * UNIT_MAP[fromUnit]`
2. Convert BTC to target unit: `btcValue / UNIT_MAP[toUnit]`
3. For USD conversions: multiply/divide by `btcToUsdRate`

BigNumber.js is configured with 20 decimal places and ROUND_HALF_UP to avoid floating-point precision issues with BTC values.

### Formatting

```javascript
formatValueToStringValue(value, format, options)
```

| Format | Example Output |
|---|---|
| `"usd"` | `$97,234.50` |
| `"btc"` | `₿0.00` or `₿0.00000000` (long) |
| `"sats"` | `100,000 sats` |
| `"mBTC"` | `1,000 mBTC` |

---

## Component Reference

### FoldText

Simple typography wrapper. Applies theme font styles and colors.

```jsx
<FoldText type="header-md" color={theme.colors.face.tertiary}>
  Bitcoin
</FoldText>
```

Props: `type` (FoldTextType), `color?` (string), `style?`, `children`, plus all `TextProps`.
Disables `allowFontScaling` for consistent sizing.

### FoldButton

Animated button with press scale (0.97x) and color interpolation.

```jsx
<FoldButton text="Buy" type="inverse" style={{ flex: 1 }} onPress={fn} />
```

Types: `primary`, `secondary`, `tertiary`, `destructive`, `inverse`
Sizes: `xs` (8/10), `sm` (12/10), `md` (16/14), `lg` (20/18) — horizontal/vertical padding
Text color: `inversePrimary` for inverse/destructive, `primary` otherwise, `disabled` when disabled.

### FoldPressable

Pressable wrapper with automatic minimum touch target enforcement and haptic feedback.

```jsx
<FoldPressable onPress={fn} hitSlop={10}>
  <ClockIcon />
</FoldPressable>
```

- Auto hitSlop: calculates padding to meet 44pt (iOS) / 48dp (Android) minimum
- Press opacity: 0.5 when pressed (unless `disableOpacityOnPress`)
- Optional pressed background (purple overlay behind content)
- Haptic: `selectionAsync()` on press and long press

### FoldConversionText

Converts and formats currency values. Fetches exchange rate if not provided.

```jsx
<FoldConversionText
  value={1}
  fromUnit={UNIT.BTC}
  toUnit={UNIT.USD}
  btcToUsdRate={97234}
  type="header-md"
/>
// Renders: "$97,234.00"
```

### FoldPillSelector

Timeframe selector pill with press animation and haptics.

```jsx
<FoldPillSelector
  text="1D"
  type="outline-active"  // selected state
  onPress={() => setTimeframe("1D")}
/>
```

Types: `active`, `pressed`, `default`, `outline`, `outline-active`
Uses `FOLD_BUTTON_SCALE` (0.97) and `FOLD_BUTTON_DURATION` (75ms) from FoldButton.

### FoldHeader

Production header bar with left/center/right layout using absolute positioning.

```jsx
<FoldHeader
  title="Optional Title"
  leftComponent={<MenuIcon />}
  rightComponent={<ClockIcon />}
  headerHeight={48}
/>
```

- Left/right icons are `position: absolute` with `marginLeft/Right: 20px`
- Center title has dynamic `maxWidth` based on left/right icon widths
- Supports progress bar, fade-in on scroll, and custom title components

### FoldTabView

Screen container with header bar and content area.

```jsx
<FoldTabView scrollEnabled={false} backgroundColor={theme.colors.object.primary.bold.default}>
  {children}
</FoldTabView>
```

- Header: 48px + safe area top inset, with MenuIcon (left) + ClockIcon + BellIcon (right)
- Content: `flex: 1`, uses `ScrollView` or plain `View` based on `scrollEnabled`
- Header is a **normal flow element** (not absolute positioned) — see [Gotchas](#gotchas--lessons-learned)

### FoldTabBar

Static bottom tab bar with 3 tabs.

```jsx
<FoldTabBar />
```

- Yellow background (`object.primary.bold.default` / `#FFDD33`)
- 1px top border (`border.primary` / `#E8BE11`)
- 48px height + safe area bottom inset
- Exchange tab shown as active (solid icon with `face.primary` fill)
- Bank and Shop tabs inactive (duo-tone icons with hardcoded `#7A6E53`)
- Light haptic feedback on press

### ArrowNarrowUpIcon

SVG arrow icon. Flipped via `scaleY: -1` for price decrease.

---

## Key Algorithms

### Catmull-Rom Spline Interpolation

Used in `chartSmoothing.ts` to create smooth curves through control points:

```
f(t) = 0.5 * (
  2*p1 +
  (-p0 + p2) * t +
  (2*p0 - 5*p1 + 4*p2 - p3) * t² +
  (-p0 + 3*p1 - 3*p2 + p3) * t³
)
```

Where p0-p3 are 4 adjacent control points and t is 0-1 between p1 and p2. This produces C1-continuous curves (smooth first derivative) through all data points.

### Catmull-Rom to Bezier Conversion (for SVG paths)

In `utils.ts`, control points for cubic Bezier curves are derived:

```javascript
cp1x = p1.x + ((p2.x - p0.x) / 6) * tension  // tension = 1.0
cp1y = p1.y + ((p2.y - p0.y) / 6) * tension
cp2x = p2.x - ((p3.x - p1.x) / 6) * tension
cp2y = p2.y - ((p3.y - p1.y) / 6) * tension
```

Output is an SVG path string: `M x0 y0 C cp1x cp1y, cp2x cp2y, x1 y1 ...`

### Gaussian Weighted Moving Average

5-point kernel applied in multiple passes:

```
weights = [1, 4, 6, 4, 1] / 16
smoothed[i] = (1*p[i-2] + 4*p[i-1] + 6*p[i] + 4*p[i+1] + 1*p[i+2]) / 16
```

- 0 passes = raw data (during scrubbing)
- 3 passes = maximum smoothing (idle view)
- First 2 and last 2 points are preserved (no smoothing at edges)

### Skeleton Shimmer (Dual-Wave)

Two orthogonal waves create a breathing shimmer effect:

```
Horizontal wave: travels right→left→right (3s cycle)
  hIntensity = max(0, 1 - |colX - hWaveCenter| / 150)

Vertical wave: travels bottom→top→bottom (3s cycle)
  vIntensity = max(0, 1 - |rowY - vWaveCenter| / 150)

Combined: intensity = max(hIntensity, vIntensity)
```

Color at each dot is interpolated between dark and light gold based on intensity, with 3 vertical gradient stops at positions [0, 0.45, 1].

---

## Constants & Magic Numbers

### Chart Layout

| Constant | Value | Location | Purpose |
|---|---|---|---|
| `TARGET_POINT_COUNT` | 288 | App.tsx | Points per dataset (matches 1D 5-min intervals in 24h) |
| `GRID_DOT_SPACING` | 8 | ChartBackgroundGrid, ChartSkeleton | Pixels between dots |
| `LOTTIE_SIZE` | 24 | AnimatedPulsingEndpoint | Pulsing dot dimensions |
| `dotMargin` | 14 | App.tsx (inline) | Vertical margin for chart dots |
| `LABEL_WIDTH` | 140 | App.tsx | Date label width for clamping |
| `HEADER_HEIGHT` | 48 | FoldTabView, FoldHeader, FoldTabBar | Header/tab bar height |
| `MIN_TOUCH_SIZE` | 44 (iOS) / 48 (Android) | FoldPressable | Minimum touch target |

### Animation

| Constant | Value | Location | Purpose |
|---|---|---|---|
| `ANIMATION_DURATION.range` | 600 | App.tsx | Timeframe switch morph |
| `ANIMATION_DURATION.interaction` | 150 | App.tsx | (defined but transition uses 200ms) |
| `interactionProgress duration` | 200 | AnimatedChartLine | Smooth→Detailed transition |
| `chartOpacity duration` | 300 | App.tsx | Chart fade-in |
| `tooltip opacity duration` | 50 | App.tsx (ToolTip) | Touch indicator appear/disappear |
| `FOLD_BUTTON_SCALE.PRESSED` | 0.97 | FoldButton | Button press scale |
| `FOLD_BUTTON_DURATION` | 75 | FoldButton | Button animation ms |
| `tension` | 1.0 | utils.ts | Catmull-Rom curve tension |
| `smoothingPasses` | 3 | utils.ts | Max gaussian smoothing passes |

### Grid Visual Effects

| Constant | Value | Location | Purpose |
|---|---|---|---|
| `ENDPOINT_FADE_RADIUS` | 60 | ChartBackgroundGrid | Dot fade from endpoint (1D) |
| `SCRUB_FADE_RADIUS` | 150 | ChartBackgroundGrid | Dot fade from crosshair |
| `CROSSHAIR_COLOR` | `rgba(232, 190, 17, 1)` | ChartBackgroundGrid | Yellow-400 |
| `YELLOW_FILL` | `rgba(255, 221, 51, 1)` | ChartBackgroundGrid | Yellow-300 |
| `SCRUBBED_LEFT_DOT_COLOR` | `#D1A300` | ChartBackgroundGrid | Darker gold |
| `WAVE_SIZE` | 150 | ChartSkeleton | Shimmer wave width |

### Data Fetching

| Constant | Value | Purpose |
|---|---|---|
| Chart stale time | 1 hour | Don't refetch if < 1h old |
| Chart refetch interval | 5 minutes | Background refresh |
| Exchange rate stale time | 15 seconds | More frequent rate updates |
| Haptic debounce (Android) | 80ms | Prevent buzzing |

---

## Gotchas & Lessons Learned

### FoldTabView Must NOT Use Absolute Header or Animated.View for Static Content

When FoldTabView was updated to match the original production code (with `position: absolute` header, `Animated.View` wrappers, and scroll tracking via `Animated.event`), the chart broke completely — gestures stopped working and the layout collapsed.

**Root cause**: The original FoldTabView in the Fodl app works because it's rendered inside Expo Router's `<Tabs>` navigator, which manages the screen lifecycle and gesture context. In our standalone app, FoldTabView is a direct child inside `GestureHandlerRootView` → providers → `View`. The combination of:
1. `position: absolute` header with `zIndex: 10`
2. Content area using `paddingTop` offset to dodge the floating header
3. `Animated.View` wrapper (even when no animation drives it)
4. `Animated.event` scroll listener creating native driver bindings

...caused the Skia canvas and Victory gesture handler to lose their layout measurements or gesture responder chain.

**Fix**: Use a simplified FoldTabView where the header is a **normal flow element** (not absolute), content is a plain `View` (not `Animated.View`) when `scrollEnabled={false}`, and no scroll tracking code is initialized. The visual result is identical — the layout proportions match production exactly.

**Rule**: When extracting components from a router-managed screen into a standalone app, simplify the container hierarchy. Floating headers and scroll-aware animations that work inside a navigation stack may break when used directly.

### Tab Bar Requires a Wrapping View

The `FoldTabBar` must be wrapped alongside `BitcoinChartScreen` in a `<View style={{ flex: 1 }}>`:

```jsx
// CORRECT
<View style={{ flex: 1 }}>
  <BitcoinChartScreen />  {/* flex: 1 via FoldTabView */}
  <FoldTabBar />           {/* fixed height */}
</View>

// WRONG - tab bar may not appear or chart may not size correctly
<BitcoinChartScreen />
<FoldTabBar />
```

Without the wrapper, the flex layout doesn't create a proper column for the tab bar to sit at the bottom.

### Tab Icon Colors Are Hardcoded in SVGs

The inactive tab icons (NavBankDuoIcon, NavTagDuoIcon, NavExchangeDuoIcon) have `fill="#7A6E53"` hardcoded in their SVG paths. The active exchange icon uses a `fill` prop:

```jsx
<NavExchangeSolidIcon fill={theme.colors.face.primary} />
```

If you change the theme's face.primary color, the active tab icon will update, but inactive icons will stay `#7A6E53` unless you modify the SVG files.

### FoldPressable Auto Hit Slop

FoldPressable automatically calculates hit slop to meet platform minimum touch targets (44pt iOS, 48dp Android). If you pass `hitSlop` explicitly, auto-calculation is skipped. The header icons use `hitSlop={10}` for this reason — they're already 24px icons with 8px padding, so the auto-calculation isn't needed and the explicit value provides a consistent touch area.

---

## What Was Removed vs. Original

### Removed from the original Fodl app:

| Feature | Why Removed |
|---|---|
| Authentication / session tokens | No user auth needed for chart |
| MMKV encrypted storage | Used for session, not needed |
| Datadog RUM / logging | Analytics not needed (removed from FoldButton + FoldPressable) |
| `fetchClient.ts` full HTTP client | Replaced with plain fetch |
| KYC guard modals | Not relevant to chart |
| Buy/Sell modal flows | Buttons are placeholders |
| Expo Router file-based routing | Single-screen app, static tab bar |
| Root layout with auth guards | No auth flow |
| `useInboxMessages` hook | No inbox in standalone |
| `useBitcoinRewards` hook | No rewards in standalone |
| BellRingingIcon (unread state) | Always shows BellIcon (read state) |
| RewardsChip component | No rewards system |
| FoldTabView scroll-animated header | Simplified to static header (see Gotchas) |
| FoldMaskText | Not used by chart screen |
| Environment variants (dev/preview/prod) | Single environment |
| Lefthook / Biome / TurboRepo | Dev tooling for monorepo |

### What was added that doesn't exist in original:

| Feature | Why Added |
|---|---|
| Mock data generator (seeded PRNG) | Fallback when API unavailable |
| `USE_LIVE_DATA` toggle | Easy switch between live/mock |
| Font loading via `expo-font` | Original uses asset linking in app config |
| `FoldTabBar` static component | Replaces Expo Router `<Tabs>` navigator |

### Original file locations (for sending changes back):

| Standalone File | Original Location |
|---|---|
| `App.tsx` (screen logic) | `apps/mobile/screens/(tabs)/BitcoinExchange.tsx` |
| `src/components/BitcoinChart/*` | `apps/mobile/components/BitcoinChart/*` |
| `src/theme/*` | `packages/ui/src/theme/*` |
| `src/api/api.ts` | `packages/ui/src/api/api.ts` + `packages/ui/src/utils/fetchClient.ts` |
| `src/hooks/useExchangeRate.ts` | `packages/ui/src/hooks/useExchangeRate.ts` |
| `src/utils/chartSmoothing.ts` | `packages/ui/src/utils/chartSmoothing.ts` |
| `src/utils/conversions.ts` | `packages/ui/src/utils/conversions.ts` |
| `src/utils/stringFormats.ts` | `packages/ui/src/utils/stringFormats.ts` |
| `src/components/FoldText.tsx` | `packages/ui/src/components/FoldComponents/FoldText.tsx` |
| `src/components/FoldButton.tsx` | `packages/ui/src/components/FoldComponents/FoldButton.tsx` |
| `src/components/FoldPressable.tsx` | `packages/ui/src/components/FoldComponents/FoldPressable.tsx` |
| `src/components/FoldHeader.tsx` | `packages/ui/src/components/FoldComponents/FoldHeader.tsx` |
| `src/components/FoldPillSelector.tsx` | `packages/ui/src/components/FoldComponents/FoldPillSelector.tsx` |
| `src/components/FoldConversionText.tsx` | `packages/ui/src/components/FoldComponents/FoldConversionText.tsx` |
| `src/components/FoldTabView.tsx` | `packages/ui/src/components/FoldComponents/FoldTabView.tsx` |
| `src/components/FoldTabBar.tsx` | `apps/mobile/app/(tabs)/_layout.tsx` (HapticTabBarButton + Tabs config) |
| `src/icons/MenuIcon.tsx` | `packages/ui/src/components/icons/MenuIcon.tsx` |
| `src/icons/ClockIcon.tsx` | `packages/ui/src/components/icons/ClockIcon.tsx` |
| `src/icons/BellIcon.tsx` | `packages/ui/src/components/icons/BellIcon.tsx` |
| `src/icons/ArrowNarrowUpIcon.tsx` | `packages/ui/src/components/icons/ArrowNarrowUpIcon.tsx` |
| `src/icons/NavBankDuoIcon.tsx` | `packages/ui/src/components/colorIcons/NavBankDuoIcon.tsx` |
| `src/icons/NavExchangeSolidIcon.tsx` | `packages/ui/src/components/icons/NavExchangeSolidIcon.tsx` |
| `src/icons/NavTagDuoIcon.tsx` | `packages/ui/src/components/colorIcons/NavTagDuoIcon.tsx` |

---

## Sending Changes Back to the Team

When you've finished vibe coding updates, here's how to get changes back into the main Fodl monorepo:

### 1. Chart Components (most likely to change)

Files in `src/components/BitcoinChart/` are **1:1 copies** of the originals. Any changes can be copied directly back to `apps/mobile/components/BitcoinChart/`.

### 2. Screen Logic

The main screen logic lives in `App.tsx` (the `BitcoinChartScreen` function). The original is `apps/mobile/screens/(tabs)/BitcoinExchange.tsx`. Key differences to reconcile:

- **Imports**: Change `./src/` paths back to `@fodl/ui/*` and `~/components/*`
- **Haptics**: Original uses `AndroidHaptics.Segment_Frequent_Tick` for API 34+
- **Buy/Sell**: Original opens modal flows with KYC guards
- **Exchange rate**: Original may use a different `btcConversionRate` source
- **Mock data / USE_LIVE_DATA**: Remove these — original always uses live data

### 3. Design System Components

`FoldButton`, `FoldPressable`, `FoldText`, etc. were simplified. If you modify these, note what was removed before copying back:

- `FoldButton`: missing Datadog `trackAction()` call
- `FoldPressable`: missing Datadog `DdRum.addAction()` call and `skipRumAction` prop
- `FoldTabView`: completely rewritten — original has scroll-animated floating header, inbox messages, rewards chip. Copy back only specific style/layout changes, not the whole file.
- `FoldTabBar`: doesn't exist in original — tab navigation is handled by Expo Router `<Tabs>` in `app/(tabs)/_layout.tsx`

### 4. Theme Changes

Theme files are identical to originals except `radius.ts` uses `Dimensions` instead of `UnistylesRuntime.screen.height`. If you modify colors/spacing/typography, those can go back directly.

### 5. Icons

All icon SVGs are exact copies. Any changes can go back directly to their original locations (see file mapping table above).
