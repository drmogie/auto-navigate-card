# Auto Navigate Card

[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-Lovelace-blue.svg)](https://www.home-assistant.io/)
[![HACS](https://img.shields.io/badge/HACS-Custom-blue.svg)](https://hacs.xyz/)
[![Version](https://img.shields.io/github/v/release/drmogie/auto-navigate-card?sort=semver)](https://github.com/drmogie/auto-navigate-card/releases)
[![License](https://img.shields.io/github/license/drmogie/auto-navigate-card)](https://github.com/drmogie/auto-navigate-card/blob/main/LICENSE)

A Home Assistant Lovelace custom card that automatically navigates after an idle timeout and/or countdown delay.  
Designed for wall panels, kiosks, and unattended dashboards.

Features include pause-on-tap, a progress bar with optional overlay text, loop detection, and detailed debug reasons for stop conditions.

---

## Screenshots

### Add to Dashboard

The card appears directly in the Lovelace **Add Card** dialog.

![Add Auto Navigate Card to Dashboard](images/add_to_dashboard.png)

---

### Configuration Editor

Configure everything visually — navigation mode, idle behavior, progress overlay, and debug options — without YAML.

![Auto Navigate Card Configuration](images/card_configuration.png)

---

## HACS Installation

### Add repository to HACS (one-click)

[![Open your Home Assistant instance and add this repository to HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](
https://my.home-assistant.io/redirect/hacs_repository/?owner=drmogie&repository=auto-navigate-card&category=plugin
)

### Install steps

1. HACS → **Frontend**
2. Find **Auto Navigate Card**
3. Install
4. Refresh the browser (hard refresh recommended)

#### Manual HACS steps (optional)
1. Open **HACS**
2. Go to **Frontend**
3. Open the three-dot menu (⋮) → **Custom repositories**
4. Add:
   - **Repository:** `https://github.com/drmogie/auto-navigate-card`
   - **Category:** `Dashboard`
5. Install **Auto Navigate Card**

---

## Add the Resource (Required)

After installing with **HACS**, add the Lovelace resource:

[![Open Home Assistant](https://my.home-assistant.io/badges/lovelace_resources.svg)](
https://my.home-assistant.io/redirect/lovelace_resources/
)

Add **this resource only**:
```yaml
resources:
  - url: /local/auto-navigate-card/auto-navigate-card.js
    type: module
```
---

## Options

### General

- **title** *(string, default `""`)*  
  Leave empty to hide the title area.

- **navigation_mode** *(string, default `path`)*  
  `none` | `back` | `path`

- **navigation_path** *(string)*  
  Used when `navigation_mode: path`.

- **navigation_delay_time** *(number, default `30`)*  
  Seconds before navigation runs.

---

### Navigation Mode Behavior

#### `navigation_mode: none`
- Timers disabled
- Card immediately enters **Stopped**

#### `navigation_mode: back`
- Uses browser history back
- Detects and stops **A → B → A** bounce loops
- Debug reason example:  
  `back loop detected (/a ↔ /b)`

#### `navigation_mode: path`
Uses `navigation_path` with strict stop rules:

| navigation_path value | Result |
|----------------------|--------|
| `null` / `undefined` | Stop |
| empty / whitespace | Stop |
| same as current path | Stop |
| any other path | Navigate |

The countdown always completes before stopping or navigating.

---

### Idle Behavior

| Option | Type | Default | Description |
|------|------|---------|-------------|
| `enable_idle` | boolean | `true` | Require idle time before countdown begins. |
| `idle_timeout` | number | `30` | Seconds of inactivity before countdown starts. |

---

### UI Options

| Option | Type | Default | Description |
|------|------|---------|-------------|
| `hide_progress` | boolean | `false` | Hides the progress bar. |
| `show_status` | boolean | `false` | Shows overlay text on the progress bar. |

**Overlay behavior**
- **Running** → `Running • Navigating to …`
- **Idle / Paused / Stopped** → state label only

---

### Colors

| Option | Type | Default | Description |
|------|------|---------|-------------|
| `use_theme_colors` | boolean | `true` | Use Home Assistant theme colors. |
| `progress_foreground` | string | theme | CSS color for progress foreground. |
| `progress_background` | string | theme | CSS color for progress background. |

Paused state automatically uses **dimmed amber** styling.

---

### Debug

| Option | Type | Default | Description |
|------|------|---------|-------------|
| `debug` | boolean | `false` | Shows debug panel with state, timers, reasons, and version. |

**Debug stop reasons include**
- `paused by user`
- `empty path`
- `same path`
- `mode none`
- `back loop detected (A ↔ B)`

---

## Options Reference (Quick Lookup)

### General

| Option | Type | Default | Description |
|------|------|---------|-------------|
| `title` | string | `""` | Card title. Leave empty to hide the title area. |
| `navigation_mode` | string | `path` | Navigation behavior: `none`, `back`, or `path`. |
| `navigation_path` | string | `""` | Target path when using path mode. |
| `navigation_delay_time` | number | `30` | Seconds before navigation runs after idle/countdown. |

---

### Navigation Mode Behavior

#### `navigation_mode: none`
- Disables timers
- Card immediately enters **Stopped**

#### `navigation_mode: back`
- Uses browser history back
- Detects and stops **A → B → A** bounce loops

#### `navigation_mode: path`

| navigation_path value | Result |
|----------------------|--------|
| `null` / `undefined` | Stop |
| empty / whitespace | Stop |
| same as current path | Stop |
| any other path | Navigate |

---

### Idle Timing

| Option | Type | Default | Description |
|------|------|---------|-------------|
| `enable_idle` | boolean | `true` | Require idle time before countdown begins. |
| `idle_timeout` | number | `30` | Seconds of inactivity before countdown starts. |

---

### UI & Display

| Option | Type | Default | Description |
|------|------|---------|-------------|
| `hide_progress` | boolean | `false` | Hides the progress bar. |
| `show_status` | boolean | `false` | Shows status overlay text on the progress bar. |

---

### Debug

| Option | Type | Default | Description |
|------|------|---------|-------------|
| `debug` | boolean | `false` | Shows debug panel with state, timers, reasons, and version. |


