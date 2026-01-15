import { LitElement, html, css } from "https://unpkg.com/lit@2.8.0/index.js?module";

const AUTO_NAVIGATE_CARD_VERSION = "2026.01-23";

class AutoNavigateCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      _config: { state: true },

      _idle: { state: true },
      _remaining: { state: true },
      _progress: { state: true },
      _stopped: { state: true },
      _paused: { state: true },

      _idleElapsed: { state: true },
      _navElapsed: { state: true },

      _pointerStart: { state: true },
      _pointerMoved: { state: true },

      _stopReason: { state: true }, // debug-only
    };
  }

  constructor() {
    super();

    // Runtime defaults (root install)
    this._config = {
      title: "",
      navigation_mode: "path", // default
      navigation_path: "",
      navigation_delay_time: 30,
      stop_after_navigation: false,

      enable_idle: true,
      idle_timeout: 30,

      hide_progress: false,
      show_status: false,

      use_theme_colors: true,
      progress_foreground: "rgba(8,8,8,.25)",
      progress_background: "rgba(12,12,12,.25)",

      debug: false,
      reset_on_view_change: true,
    };

    this._idle = true;
    this._remaining = 0;
    this._progress = 0;
    this._stopped = false;
    this._paused = false;

    this._idleElapsed = 0;
    this._navElapsed = 0;

    this._idleTimer = null;
    this._navTimer = null;

    this._pointerStart = false;
    this._pointerMoved = false;

    this._pointerStartX = 0;
    this._pointerStartY = 0;
    this._pointerMoveThreshold = 6;

    this._modeApplied = null;
    this._stopReason = "";

    // Back-loop detection state
    this._currentPath = window.location.pathname;
    this._recentPaths = [this._currentPath]; // last 3 unique
    this._lastNavAction = null; // { mode: "back"|"path", at: ms }

    this._onActivity = this._onActivity.bind(this);
    this._onLocationChanged = this._onLocationChanged.bind(this);
  }

  /* ───────── EDITOR HOOK (ROOT PATH) ───────── */
  static async getConfigElement() {
    await import("./auto-navigate-card-editor.js");
    return document.createElement("auto-navigate-card-editor");
  }

  static getStubConfig() {
    return {
      title: "",
      navigation_mode: "path",
      navigation_path: "",
      navigation_delay_time: 15,
      enable_idle: true,
      idle_timeout: 5,
      show_status: true,
      use_theme_colors: true,
      debug: false,
    };
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");

    const cfg = { ...config };

    // Back-compat: hide_title removed -> empty title hides
    if (cfg.hide_title === true && cfg.title == null) cfg.title = "";
    delete cfg.hide_title;

    this._config = { ...this._config, ...cfg };
    this._applyModeTransition(true);
  }

  connectedCallback() {
    super.connectedCallback();
    this._attachActivityListeners();
    window.addEventListener("location-changed", this._onLocationChanged);
    this._applyModeTransition(true);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._detachActivityListeners();
    window.removeEventListener("location-changed", this._onLocationChanged);
    this._clearTimers();
  }

  updated() {
    this._applyModeTransition(false);
    if (this._config.navigation_mode === "none") return;
  }

  /* ───────── location tracking + back-loop detection ───────── */

  _onLocationChanged() {
    const p = window.location.pathname;
    if (!p || p === this._currentPath) return;

    this._currentPath = p;

    // maintain last 3 unique paths
    const last = this._recentPaths[this._recentPaths.length - 1];
    if (p !== last) {
      this._recentPaths.push(p);
      while (this._recentPaths.length > 3) this._recentPaths.shift();
    }

    // Detect A -> B -> A shortly after a back action initiated by this card
    const a = this._recentPaths[this._recentPaths.length - 3];
    const b = this._recentPaths[this._recentPaths.length - 2];
    const c = this._recentPaths[this._recentPaths.length - 1];

    const now = Date.now();
    const lastNav = this._lastNavAction;

    if (
      lastNav &&
      lastNav.mode === "back" &&
      now - lastNav.at <= 6000 &&
      a &&
      b &&
      c &&
      a === c &&
      a !== b
    ) {
      this._setDisabledState(`back loop detected (${a} ↔ ${b})`);
      this._lastNavAction = null;
      return;
    }

    if (lastNav && now - lastNav.at > 6000) {
      this._lastNavAction = null;
    }
  }

  /* ───────── Mode handling ───────── */

  _applyModeTransition(initial) {
    const mode = this._config.navigation_mode;

    if (!initial && this._modeApplied === mode) return;
    this._modeApplied = mode;

    if (mode === "none") {
      this._setDisabledState("mode none");
      return;
    }

    this._resetAll();
  }

  _setDisabledState(reason = "") {
    this._clearTimers();
    this._stopped = true;
    this._paused = false;
    this._idle = false;

    this._progress = 0;
    this._remaining = 0;
    this._idleElapsed = 0;
    this._navElapsed = 0;

    this._stopReason = reason;
    this.requestUpdate();
  }

  /* ───────── Activity ───────── */

  _attachActivityListeners() {
    ["mousemove", "mousedown", "keydown", "touchstart", "wheel"].forEach((e) =>
      window.addEventListener(e, this._onActivity, { passive: true })
    );
  }

  _detachActivityListeners() {
    ["mousemove", "mousedown", "keydown", "touchstart", "wheel"].forEach((e) =>
      window.removeEventListener(e, this._onActivity)
    );
  }

  _onActivity() {
    if (this._config.navigation_mode === "none") return;
    if (this._paused || this._stopped) return;
    this._resetAll();
  }

  /* ───────── Tap-to-pause ───────── */

  _onPointerDown(ev) {
    if (this.hass?.editMode) return;
    if (this._config.navigation_mode === "none") return;

    this._pointerStart = true;
    this._pointerMoved = false;

    this._pointerStartX = ev?.clientX ?? 0;
    this._pointerStartY = ev?.clientY ?? 0;
  }

  _onPointerMove(ev) {
    if (!this._pointerStart) return;

    const dx = (ev?.clientX ?? 0) - this._pointerStartX;
    const dy = (ev?.clientY ?? 0) - this._pointerStartY;

    if (Math.hypot(dx, dy) > this._pointerMoveThreshold) {
      this._pointerMoved = true;
    }
  }

  _onPointerUp() {
    if (this.hass?.editMode) return;
    if (this._config.navigation_mode === "none") return;
    if (!this._pointerStart) return;

    if (!this._pointerMoved) this._togglePause();

    this._pointerStart = false;
    this._pointerMoved = false;
  }

  _togglePause() {
    if (this._config.navigation_mode === "none") return;

    // Unpause -> reset
    if (this._paused) {
      this._paused = false;
      this._resetAll();
      return;
    }

    // Pause -> freeze timers, record debug reason
    this._paused = true;
    this._clearTimers();
    this._stopReason = "paused by user";
    this.requestUpdate();
  }

  /* ───────── Timers ───────── */

  _resetAll() {
    if (this._config.navigation_mode === "none") return this._setDisabledState("mode none");

    this._clearTimers();
    this._paused = false;
    this._stopped = false;

    this._progress = 0;
    this._remaining = 0;
    this._idleElapsed = 0;
    this._navElapsed = 0;

    this._stopReason = "";

    if (this._config.enable_idle) {
      this._idle = true;
      this._startIdleTimer();
    } else {
      this._idle = false;
      this._startNavigationCountdown();
    }

    this.requestUpdate();
  }

  _clearTimers() {
    clearInterval(this._idleTimer);
    clearInterval(this._navTimer);
    this._idleTimer = null;
    this._navTimer = null;
  }

  _startIdleTimer() {
    this._idleTimer = setInterval(() => {
      if (this._paused || this._stopped) return;

      this._idleElapsed++;
      if (this._idleElapsed >= Number(this._config.idle_timeout || 0)) {
        this._idle = false;
        this._clearTimers();
        this._startNavigationCountdown();
      }

      this.requestUpdate();
    }, 1000);
  }

  _startNavigationCountdown() {
    const total = Number(this._config.navigation_delay_time || 0);
    this._remaining = total;

    if (total <= 0) {
      this._navigate();
      return;
    }

    this._navTimer = setInterval(() => {
      if (this._paused || this._stopped) return;

      this._remaining--;
      this._navElapsed++;
      this._progress = Math.max(0, Math.min(1, 1 - this._remaining / total));

      if (this._remaining <= 0) {
        this._clearTimers();
        this._navigate();
      }

      this.requestUpdate();
    }, 1000);
  }

  /* ───────── Navigation rules ─────────
     PATH:
       - null/undefined/empty -> STOP (same as current path)
       - same as current path -> STOP
       - any other path -> NAVIGATE
     BACK:
       - record action; loop detector can STOP if A->B->A bounce
  ───────── */

  _navigate() {
    if (this._paused) return;

    if (this._config.navigation_mode === "back") {
      this._lastNavAction = { mode: "back", at: Date.now() };
      history.back();
      return;
    }

    if (this._config.navigation_mode === "path") {
      const raw = this._config.navigation_path;
      const target = typeof raw === "string" ? raw.trim() : "";

      // null/undefined/empty => stop
      if (!target) {
        this._setDisabledState("empty path");
        return;
      }

      // same as current => stop
      if (target === window.location.pathname) {
        this._setDisabledState("same path");
        return;
      }

      this._lastNavAction = { mode: "path", at: Date.now() };
      history.pushState(null, "", target);
      window.dispatchEvent(new Event("location-changed"));
    }
  }

  /* ───────── Overlay helpers ───────── */

  _statusLabel() {
    if (this._paused) return "Paused";
    if (this._stopped) return "Stopped";
    if (this._idle) return "Idle";
    return "Running";
  }

  _modeLabel() {
    if (this._config.navigation_mode === "back") return "Navigate back…";
    if (this._config.navigation_mode === "path") {
      const t = (this._config.navigation_path || "").trim();
      return `Navigating to ${t}`;
    }
    return "";
  }

  _overlayText() {
    if (this._config.navigation_mode === "none") return "";

    const status = this._statusLabel();
    const isRunning = !this._idle && !this._paused && !this._stopped;
    if (!isRunning) return status;

    const modeText = this._modeLabel();
    return modeText ? `${status} • ${modeText}` : status;
  }

  render() {
    const showTitle = (this._config.title ?? "").trim() !== "";
    const modeNone = this._config.navigation_mode === "none";

    const showProgress = !modeNone && !this._config.hide_progress;
    const showOverlay = showProgress && this._config.show_status;

    const fgNormal = this._config.use_theme_colors
      ? "var(--primary-color)"
      : this._config.progress_foreground;

    const bgNormal = this._config.use_theme_colors
      ? "var(--divider-color)"
      : this._config.progress_background;

    // dimmed amber when paused
    const AMBER_FG_DIM = "rgba(255,193,7,0.65)";
    const AMBER_BG_DIM = "rgba(255,193,7,0.22)";

    const fg = this._paused ? AMBER_FG_DIM : fgNormal;
    const bg = this._paused ? AMBER_BG_DIM : bgNormal;

    const debugReason = this._config.debug && this._stopReason ? this._stopReason : "";

    return html`
      <ha-card
        @pointerdown=${this._onPointerDown}
        @pointermove=${this._onPointerMove}
        @pointerup=${this._onPointerUp}
      >
        ${showTitle ? html`<div class="title">${this._config.title}</div>` : ""}

        ${showProgress
          ? html`
              <div class="progress-bar" style="background:${bg}">
                <div
                  class="progress"
                  style="width:${this._progress * 100}%;background:${fg}"
                ></div>

                ${showOverlay
                  ? html`<div class="progress-label">${this._overlayText()}</div>`
                  : ""}
              </div>
            `
          : ""}

        ${this._config.debug
          ? html`
              <div class="debug">
                <div><b>Status:</b> ${this._statusLabel()}</div>
                <div><b>Mode:</b> ${this._config.navigation_mode}</div>
                <div><b>Idle:</b> ${this._idleElapsed}/${this._config.idle_timeout}s</div>
                <div>
                  <b>Remaining:</b>
                  ${this._remaining}/${this._config.navigation_delay_time}s
                </div>
                ${debugReason ? html`<div><b>Reason:</b> ${debugReason}</div>` : ""}
                <div style="opacity:.6;margin-top:4px">
                  v${AUTO_NAVIGATE_CARD_VERSION}
                </div>
              </div>
            `
          : ""}
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      padding: 12px;
      border-radius: 16px;
      box-sizing: border-box;
      cursor: pointer;
      user-select: none;
    }

    .title {
      padding-bottom: 10px;
      font-size: 16px;
      font-weight: 600;
      line-height: 1.2;
    }

    .progress-bar {
      position: relative;
      height: 18px;
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 10px;
    }

    .progress {
      height: 100%;
      transition: width 1s linear, background-color 0.15s linear;
    }

    .progress-label {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11.5px;
      font-weight: 700;
      pointer-events: none;
      padding: 0 10px;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--primary-text-color);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
    }

    .debug {
      font-size: 12px;
      opacity: 0.75;
    }
  `;
}

customElements.define("auto-navigate-card", AutoNavigateCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "auto-navigate-card",
  name: "Auto Navigate Card",
  description: "Automatically navigate after idle time or delay.",
  preview: true,
  version: AUTO_NAVIGATE_CARD_VERSION,
});
