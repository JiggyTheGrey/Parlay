# Design Guidelines: Bloodstrike Crypto Wagering Platform

## Design Approach

**Reference-Based Strategy**: Drawing inspiration from competitive gaming platforms (Faceit, Discord) and crypto betting sites (Stake.com, Rollbit) to create a bold, high-energy wagering experience that feels both trustworthy and exciting.

**Core Design Principles**:
- High contrast, bold typography for competitive gaming energy
- Clean data presentation for financial clarity and trust
- Smooth transitions that feel premium without being distracting
- Dark-dominant aesthetic typical of gaming/crypto platforms

---

## Typography System

**Primary Font**: Inter or DM Sans (via Google Fonts CDN)
**Accent Font**: Rajdhani or Exo 2 for headings (gaming feel)

**Hierarchy**:
- Hero Headlines: 4xl-6xl, 700-800 weight, tight tracking (-0.02em)
- Section Titles: 2xl-3xl, 700 weight
- Card Headers: xl-2xl, 600 weight
- Body Text: base-lg, 400-500 weight
- Data/Numbers: Tabular numbers, mono variant for crypto values
- Microcopy: sm-xs, 500 weight, uppercase for labels

---

## Layout & Spacing System

**Tailwind Spacing Primitives**: Use 2, 4, 6, 8, 12, 16, 24 units consistently
- Component padding: p-6 to p-8
- Section spacing: py-16 to py-24
- Card gaps: gap-6
- Form fields: space-y-4
- Inline elements: space-x-2 to space-x-4

**Container Strategy**:
- Max width: max-w-7xl for main content
- Dashboard layouts: max-w-screen-2xl for data density
- Forms: max-w-2xl centered

**Grid Patterns**:
- Team cards: 2-3 columns (md:grid-cols-2 lg:grid-cols-3)
- Match history: Single column with expansible rows
- Wallet overview: 2-column split (balance + recent transactions)

---

## Component Library

### Navigation
- **Top Nav**: Fixed header with logo left, wallet balance center-right, user profile right
- Include quick actions: "Create Match", "Deposit", notification bell
- Mobile: Hamburger menu with slide-out drawer

### Hero Section (Landing Page)
- **Image**: Full-width hero with Bloodstrike action screenshot (1920x800px recommended)
- Overlay gradient for text readability
- Primary CTA: "Create Team Challenge" (large, prominent)
- Secondary CTA: "How It Works"
- Live stats ticker: "X matches live" | "Y teams competing" | "Z wagered today"

### Dashboard Layout
**Sidebar** (desktop): 
- Navigation links with icons (Dashboard, Teams, Matches, Wallet, History)
- Sticky positioned, width: w-64

**Main Content Area**:
- Stats cards at top: 3-4 column grid showing Team Balance, Active Matches, Win Rate, Total Wagered
- Recent activity feed
- Quick actions panel

### Team Components
**Team Card**:
- Team avatar/logo placeholder (120x120px)
- Team name (xl, bold)
- Member count and member avatars (stacked circular thumbnails)
- Team balance (2xl, tabular)
- Win/loss record
- "Challenge Team" CTA button

**Team Detail View**:
- Hero banner with team name overlay
- Two-column layout: Roster left (member list with roles), Stats right (performance metrics)
- Match history table below

### Match Challenge Flow
**Create Challenge Modal**:
- Team selector dropdown (searchable)
- Wager amount input with balance display and validation
- Match format selector (game mode, best of X)
- Message to opponent (textarea)
- Full-width "Send Challenge" button

**Match Card** (pending/active):
- Two-team layout (Team A vs Team B) with VS badge center
- Wager amount prominently displayed (center, large)
- Match status badge (Pending, Active, Confirming, Complete)
- Timer for active matches
- Action buttons contextual to status

**Winner Confirmation Interface**:
- Split-screen: Both teams see same match details
- Each team has "Confirm Winner" section with radio buttons
- Visual indicator showing both teams' selections
- Admin override button (for disputes)
- Automatic payout trigger when both confirm

### Wallet Components
**Balance Display**:
- Large crypto amount (4xl, mono font)
- USD equivalent (lg, muted)
- Recent transactions preview (last 5)

**Deposit/Withdrawal UI** (mock):
- Tabbed interface (Deposit | Withdraw)
- QR code display for deposit address
- Copy address button with success feedback
- Withdrawal: Address input, amount slider, fee display
- Transaction status indicators

**Transaction History Table**:
- Columns: Date/Time, Type, Amount, Status, Match/Team Reference
- Expandable rows for transaction details
- Filter controls (date range, type)

### Forms
**Input Fields**:
- Floating labels or top-aligned labels
- Border focus states with smooth transitions
- Error messages inline below field
- Helper text in muted weight

**Buttons**:
- Primary: Full saturation, high contrast, px-8 py-3
- Secondary: Outlined variant with hover fill
- Danger: For withdrawals, confirmations
- Disabled state clearly distinguished

### Data Display
**Stats Cards**:
- Icon or graphic left
- Label (sm, uppercase, muted)
- Value (3xl-4xl, bold, tabular)
- Trend indicator (up/down arrow with percentage)

**Tables**:
- Striped rows for readability
- Hover state on rows
- Sortable column headers
- Sticky header for long tables
- Pagination at bottom

### Match History
**Timeline View**:
- Vertical timeline with match cards
- Date separators
- Win/loss visual indicators
- Expandable for full match details
- Filter sidebar (status, date range, team)

---

## Images

**Hero Image**: Bloodstrike game action screenshot showing intense team combat (full-width, 1920x800px minimum)

**Team Avatars**: Circular placeholders (120x120px) with upload functionality

**Match Status Graphics**: Victory/defeat badge graphics (can use icon libraries with custom styling)

**Background Patterns**: Subtle hexagon or circuit pattern overlays for depth (low opacity)

No floating elements - maintain grounded, purposeful layouts throughout.

---

## Animations

**Minimal, Purposeful Motion**:
- Micro-interactions: Button hover scale (scale-105), focus ring pulse
- Page transitions: Smooth fade-in for route changes (300ms)
- Balance updates: Count-up animation for numbers
- Match status changes: Slide-in notification banners
- NO scroll-triggered animations, NO parallax effects

---

## Accessibility Standards

- Maintain 4.5:1 contrast ratios minimum
- Focus indicators on all interactive elements
- Aria labels for icon-only buttons
- Keyboard navigation support throughout
- Form validation with clear error messaging
- Screen reader friendly table structures