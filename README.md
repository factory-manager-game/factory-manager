# Factory Manager

**A browser game about running an electronics factory and learning industrial engineering by playing.**
**یک بازی مدیریتی تحت وب: کارخانه را بچرخان و مفاهیم مهندسی صنایع را بازی‌کنان یاد بگیر.**

You run a small headphone and speaker plant for 30 working days. Buy materials, plan production batches, staff three machines, keep them healthy, control quality and deliver customer orders on time. The goal is to grow cash from $15,000 to $45,000 without going bankrupt or losing your customers.

Industrial-engineering concepts are built into the rules rather than explained in a lecture: **OEE**, **bottlenecks** (theory of constraints), **preventive maintenance**, **setup time and batching**, **quality control trade-offs**, **inventory holding cost** and **lead times**.

- Real-time, with pause and 1× / 2× / 4× speed
- Bilingual: Persian (RTL) and English
- Pure HTML, CSS and JavaScript: no build step, no libraries, no backend
- Desktop and mobile layouts

## How to run

Open `index.html` in a browser. That's it: the scripts are plain files, so it works straight from disk (`file://`).

Or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Shortcuts: `Space` pause/resume · `1` `2` `3` speed.

## Balance test

The simulation engine has no DOM dependency, so it runs in Node. `tests/simulate.js` plays hundreds of games with bot strategies and reports win rate, cash and score:

```bash
node tests/simulate.js 40     # or: npm test
```

Use it after every change to `js/config.js`.

## Project structure

```
index.html              page shell, loads scripts in order
css/style.css           all styles (dark dashboard, RTL/LTR, responsive)
js/
  config.js             every game number: prices, times, probabilities, scoring
  utils.js              seeded RNG, math and time helpers
  i18n.js               fa/en strings and number formatting
  engine/               simulation (no DOM, runs in Node too)
    state.js            game state shape, event log, money helpers
    production.js       machines, WIP buffers, wear, breakdowns, defects, setup
    market.js           material prices and deliveries, customer offers and orders
    finance.js          end-of-day settlement, KPIs (OEE, quality…), final score
    actions.js          every player action, validated
    engine.js           new game + time loop (one working minute per step)
  ui/                   presentation
    icons.js            inline SVG icon set
    charts.js           tiny canvas line chart
    render.js           panels, live updates, modals, toasts
    app.js              real-time loop, input handling
tests/simulate.js       headless balance test with bots
docs/GAME_DESIGN.md     rules and formulas (Persian)
```

**Architecture in one line:** the UI never changes the game directly. It calls functions in `FM.Actions`, the engine advances `state` minute by minute, and `render.js` reads `state` every frame.

This makes the two halves independently workable: engine and balancing on one side, interface and experience on the other.

## Rules and formulas

See [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) for the full rule set: process times, wear and breakdown formulas, QC detection, order generation, KPIs and scoring.

## Roadmap ideas

- Save / load game (state is already plain JSON)
- Difficulty levels and scenario presets
- Random events (supplier delay, power outage, rush order)
- Overtime shifts and worker skill
- Daily summary screen with what-went-wrong analysis

## Authors

Built by **Samyar** (industrial engineering) and **Mani ImaniSanjar — GeekMani** ([@mani-imani](https://github.com/mani-imani)) (computer engineering).
