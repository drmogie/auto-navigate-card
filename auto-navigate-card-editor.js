import { LitElement, html, css } from "https://unpkg.com/lit@2.8.0/index.js?module";

class AutoNavigateCardEditor extends LitElement {
  static properties = {
    hass: {},
    _config: { state: true },
  };

  constructor() {
    super();
    this._config = {};
  }

  setConfig(config) {
    this._config = { ...(config || {}) };
  }

  _emit() {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  _set(key, value) {
    const next = { ...(this._config || {}) };

    // Keep title even when empty so clearing hides it (title:"")
    if (key === "title") {
      next.title = value ?? "";
      this._config = next;
      this._emit();
      return;
    }

    if (value === "" || value === null || value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }

    if (key === "navigation_mode" && value !== "path") {
      delete next.navigation_path;
    }

    this._config = next;
    this._emit();
  }

  _onText(e) {
    const key = e.target?.dataset?.key;
    if (!key) return;
    this._set(key, e.target.value);
  }

  _onNumber(e) {
    const key = e.target?.dataset?.key;
    if (!key) return;

    const raw = e.target.value;
    if (raw === "") return this._set(key, "");

    const n = Number(raw);
    this._set(key, Number.isFinite(n) ? n : "");
  }

  _onSwitch(e) {
    const key = e.target?.dataset?.key;
    if (!key) return;
    this._set(key, !!e.target.checked);
  }

  _onRadio(e) {
    const key = e.target?.dataset?.key;
    if (!key) return;
    this._set(key, e.target.value);
  }

  _validatePath() {
    const mode = this._config.navigation_mode ?? "path";
    if (mode !== "path") return { invalid: false, msg: "" };

    const path = (this._config.navigation_path ?? "").trim();
    if (!path) return { invalid: false, msg: "" };

    if (!path.startsWith("/")) {
      return { invalid: true, msg: "Path must start with “/” (example: /lovelace/0)" };
    }
    return { invalid: false, msg: "" };
  }

  _validateNonNegative(key, label) {
    const val = this._config[key];
    if (val === undefined || val === null || val === "") return { invalid: false, msg: "" };
    if (typeof val === "number" && val < 0) return { invalid: true, msg: `${label} must be 0 or greater` };
    return { invalid: false, msg: "" };
  }

  render() {
    if (!this._config) return html``;

    const mode = this._config.navigation_mode ?? "path"; // default path
    const enableIdle = this._config.enable_idle ?? true;
    const useTheme = this._config.use_theme_colors ?? true;

    const pathCheck = this._validatePath();
    const delayCheck = this._validateNonNegative("navigation_delay_time", "Navigation delay");
    const idleCheck = this._validateNonNegative("idle_timeout", "Idle timeout");

    return html`
      <div class="section">
        <ha-textfield
          label="Title (leave empty to hide)"
          .value=${this._config.title ?? ""}
          data-key="title"
          @input=${this._onText}
        ></ha-textfield>
      </div>

      <hr />

      <div class="section">
        <div class="group-label">Navigation Mode</div>

        <div class="radio-row">
          ${["none", "back", "path"].map(
            (m) => html`
              <label class="radio-pill">
                <input
                  type="radio"
                  name="navmode"
                  value="${m}"
                  .checked=${mode === m}
                  data-key="navigation_mode"
                  @change=${this._onRadio}
                />
                <span>${m}</span>
              </label>
            `
          )}
        </div>

        ${mode === "path"
          ? html`
              <ha-textfield
                label="Navigation Path"
                placeholder="/lovelace/0"
                .value=${this._config.navigation_path ?? ""}
                data-key="navigation_path"
                .invalid=${pathCheck.invalid}
                .helper=${pathCheck.msg}
                @input=${this._onText}
              ></ha-textfield>
            `
          : ""}
      </div>

      <ha-textfield
        label="Navigation Delay (seconds)"
        type="number"
        min="0"
        .value=${String(this._config.navigation_delay_time ?? 30)}
        data-key="navigation_delay_time"
        .invalid=${delayCheck.invalid}
        .helper=${delayCheck.msg}
        @input=${this._onNumber}
      ></ha-textfield>

      <hr />

      <div class="section inline">
        <ha-switch
          .checked=${enableIdle}
          data-key="enable_idle"
          @change=${this._onSwitch}
        ></ha-switch>
        <div>Enable Idle Timeout</div>
      </div>

      ${enableIdle
        ? html`
            <ha-textfield
              label="Idle Timeout (seconds)"
              type="number"
              min="0"
              .value=${String(this._config.idle_timeout ?? 30)}
              data-key="idle_timeout"
              .invalid=${idleCheck.invalid}
              .helper=${idleCheck.msg}
              @input=${this._onNumber}
            ></ha-textfield>
          `
        : ""}

      <hr />

      <div class="section inline">
        <ha-switch
          .checked=${this._config.show_status ?? false}
          data-key="show_status"
          @change=${this._onSwitch}
        ></ha-switch>
        <div>Show Status Overlay</div>
      </div>

      <div class="section inline">
        <ha-switch
          .checked=${this._config.hide_progress ?? false}
          data-key="hide_progress"
          @change=${this._onSwitch}
        ></ha-switch>
        <div>Hide Progress Bar</div>
      </div>

      <hr />

      <div class="section inline">
        <ha-switch
          .checked=${useTheme}
          data-key="use_theme_colors"
          @change=${this._onSwitch}
        ></ha-switch>
        <div>Use Theme Colors</div>
      </div>

      ${!useTheme
        ? html`
            <ha-textfield
              label="Progress Foreground (CSS color)"
              .value=${this._config.progress_foreground ?? ""}
              data-key="progress_foreground"
              @input=${this._onText}
            ></ha-textfield>

            <ha-textfield
              label="Progress Background (CSS color)"
              .value=${this._config.progress_background ?? ""}
              data-key="progress_background"
              @input=${this._onText}
            ></ha-textfield>
          `
        : ""}

      <hr />

      <div class="section inline">
        <ha-switch
          .checked=${this._config.debug ?? false}
          data-key="debug"
          @change=${this._onSwitch}
        ></ha-switch>
        <div>Debug</div>
      </div>
    `;
  }

  static styles = css`
    .section {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 8px 0;
    }
    .inline {
      flex-direction: row;
      align-items: center;
      gap: 10px;
    }
    .group-label {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .radio-row {
      display: flex;
      flex-direction: row;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }
    .radio-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid var(--divider-color);
      cursor: pointer;
      user-select: none;
    }
    .radio-pill input {
      margin: 0;
    }
    hr {
      border: 0;
      border-top: 1px solid var(--divider-color);
      margin: 12px 0;
    }
  `;
}

customElements.define("auto-navigate-card-editor", AutoNavigateCardEditor);
