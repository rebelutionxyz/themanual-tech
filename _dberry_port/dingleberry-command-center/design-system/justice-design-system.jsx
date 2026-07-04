/* @ds-bundle: {"format":3,"namespace":"TheLastWordDesignSystem_a9501e","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"CaseCard","sourcePath":"components/justice/CaseCard.jsx"},{"name":"EntityHeader","sourcePath":"components/justice/EntityHeader.jsx"},{"name":"EscalationLadder","sourcePath":"components/justice/EscalationLadder.jsx"},{"name":"EvidenceMeter","sourcePath":"components/justice/EvidenceMeter.jsx"},{"name":"PostType","sourcePath":"components/justice/PostType.jsx"},{"name":"TruthStatus","sourcePath":"components/justice/TruthStatus.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"251b0132a29b","components/core/Badge.jsx":"4ffbc185df2e","components/core/Button.jsx":"cabea437bdf4","components/core/Card.jsx":"6c13d6908fcb","components/core/Input.jsx":"80a396c257a2","components/core/Tag.jsx":"a897341c587e","components/justice/CaseCard.jsx":"07aa167defd4","components/justice/EntityHeader.jsx":"38f1df0c2844","components/justice/EscalationLadder.jsx":"35fd2fde52d8","components/justice/EvidenceMeter.jsx":"2d005e276e56","components/justice/PostType.jsx":"5d2fb851db74","components/justice/TruthStatus.jsx":"d2715a5a92ed","slides/deck-stage.js":"9436a2deeb46","ui_kits/ds-fallback.js":"10f2d87f8f9e","ui_kits/marketing/Marketing.jsx":"ce1932f46624","ui_kits/mobile-app/MobileScreens.jsx":"b2e153533184","ui_kits/mobile-app/ios-frame.jsx":"be3343be4b51","ui_kits/web-app/App.jsx":"f10c34e12eb5","ui_kits/web-app/Campaign.jsx":"5e75a8ff8a60","ui_kits/web-app/CaseFile.jsx":"02bfe1305aa0","ui_kits/web-app/Icons.jsx":"8e6947479364","ui_kits/web-app/Landing.jsx":"d906d673c253","ui_kits/web-app/Shell.jsx":"dcd4b0094b95","ui_kits/web-app/data.js":"d58d8b6088a5"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.TheLastWordDesignSystem_a9501e = window.TheLastWordDesignSystem_a9501e || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The Last Word — Avatar
 * Initials or image. Optional "standing" ring to mark a member's
 * credibility (forest = high standing).
 */

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const css = `
  .tlw-av{position:relative;display:inline-flex;align-items:center;justify-content:center;flex:none;
    border-radius:var(--radius-pill);background:var(--ink-900);color:var(--paper-0);overflow:hidden;
    font-family:var(--font-display);font-weight:700;letter-spacing:0;user-select:none;}
  .tlw-av img{width:100%;height:100%;object-fit:cover;display:block;}
  .tlw-av--ring{box-shadow:0 0 0 2px var(--paper-1),0 0 0 4px var(--forest-600);}
  .tlw-av--sm{width:28px;height:28px;font-size:11px;}
  .tlw-av--md{width:40px;height:40px;font-size:15px;}
  .tlw-av--lg{width:56px;height:56px;font-size:20px;}
  .tlw-av--xl{width:80px;height:80px;font-size:30px;}
  `;
  const el = document.createElement('style');
  el.id = 'tlw-av-styles';
  el.textContent = css;
  document.head.appendChild(el);
}
const PALETTE = ['#1B3A5B', '#2A323C', '#244B72', '#4A5562', '#122740'];
function pick(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = h * 31 + name.charCodeAt(i) >>> 0;
  return PALETTE[h % PALETTE.length];
}
function initials(name = '') {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '—';
}
function Avatar({
  name = '',
  src,
  size = 'md',
  ring = false,
  className = '',
  ...rest
}) {
  ensureStyles();
  const cls = ['tlw-av', `tlw-av--${size}`, ring ? 'tlw-av--ring' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls,
    style: !src ? {
      background: pick(name)
    } : undefined,
    title: name
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name
  }) : initials(name));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The Last Word — Badge
 * A small verdict / status marker. Affirmed (forest), Struck (oxblood),
 * Pending (stone), or neutral. Soft by default; solid for emphasis.
 */

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const css = `
  .tlw-badge{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 10px;
    font-family:var(--font-mono);font-weight:600;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;
    border-radius:var(--radius-pill);border:1px solid transparent;white-space:nowrap;line-height:1;}
  .tlw-badge__dot{width:6px;height:6px;border-radius:var(--radius-pill);background:currentColor;flex:none;}
  /* soft */
  .tlw-badge--soft.is-affirmed{background:var(--forest-100);color:var(--forest-700);border-color:var(--forest-300);}
  .tlw-badge--soft.is-struck{background:var(--oxblood-100);color:var(--oxblood-700);border-color:#D9B6AD;}
  .tlw-badge--soft.is-pending{background:var(--paper-3);color:var(--stone-700);border-color:var(--line-2);}
  .tlw-badge--soft.is-neutral{background:var(--paper-2);color:var(--stone-600);border-color:var(--line-1);}
  /* solid */
  .tlw-badge--solid.is-affirmed{background:var(--forest-600);color:var(--paper-0);}
  .tlw-badge--solid.is-struck{background:var(--oxblood-600);color:var(--paper-0);}
  .tlw-badge--solid.is-pending{background:var(--stone-500);color:var(--paper-0);}
  .tlw-badge--solid.is-neutral{background:var(--ink-900);color:var(--paper-0);}
  /* outline */
  .tlw-badge--outline{background:transparent;}
  .tlw-badge--outline.is-affirmed{color:var(--forest-700);border-color:var(--forest-300);}
  .tlw-badge--outline.is-struck{color:var(--oxblood-700);border-color:#D9B6AD;}
  .tlw-badge--outline.is-pending{color:var(--stone-700);border-color:var(--line-2);}
  .tlw-badge--outline.is-neutral{color:var(--stone-600);border-color:var(--line-2);}
  `;
  const el = document.createElement('style');
  el.id = 'tlw-badge-styles';
  el.textContent = css;
  document.head.appendChild(el);
}
const LABELS = {
  affirmed: 'Affirmed',
  struck: 'Struck',
  pending: 'Pending',
  neutral: ''
};
function Badge({
  children,
  verdict = 'neutral',
  variant = 'soft',
  dot = true,
  className = '',
  ...rest
}) {
  ensureStyles();
  const cls = ['tlw-badge', `tlw-badge--${variant}`, `is-${verdict}`, className].filter(Boolean).join(' ');
  const label = children != null ? children : LABELS[verdict];
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), dot ? /*#__PURE__*/React.createElement("span", {
    className: "tlw-badge__dot"
  }) : null, label);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The Last Word — Button
 * Declarative actions. Primary = forest (affirm/commit), secondary = ink outline,
 * ghost = quiet, danger = oxblood (strike/destroy).
 */

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const css = `
  .tlw-btn{--_h:40px;--_px:18px;--_fs:15px;display:inline-flex;align-items:center;justify-content:center;gap:8px;
    height:var(--_h);padding:0 var(--_px);font-family:var(--font-text);font-weight:600;font-size:var(--_fs);
    letter-spacing:-0.005em;line-height:1;border-radius:var(--radius-xs);border:1.5px solid transparent;
    cursor:pointer;white-space:nowrap;text-decoration:none;transition:background var(--dur-fast) var(--ease-decisive),
    border-color var(--dur-fast) var(--ease-decisive),color var(--dur-fast) var(--ease-decisive),transform var(--dur-instant) var(--ease-decisive);
    user-select:none;}
  .tlw-btn:active{transform:translateY(1px);}
  .tlw-btn:focus-visible{outline:none;box-shadow:var(--ring-focus);}
  .tlw-btn[disabled]{cursor:not-allowed;opacity:0.4;pointer-events:none;}
  .tlw-btn--sm{--_h:32px;--_px:12px;--_fs:13px;}
  .tlw-btn--lg{--_h:48px;--_px:24px;--_fs:16px;}
  .tlw-btn--full{display:flex;width:100%;}
  .tlw-btn--primary{background:var(--forest-600);color:var(--paper-0);}
  .tlw-btn--primary:hover{background:var(--forest-700);}
  .tlw-btn--secondary{background:var(--paper-0);color:var(--ink-900);border-color:var(--ink-900);}
  .tlw-btn--secondary:hover{background:var(--ink-900);color:var(--paper-0);}
  .tlw-btn--ghost{background:transparent;color:var(--ink-900);}
  .tlw-btn--ghost:hover{background:var(--paper-2);}
  .tlw-btn--danger{background:var(--oxblood-600);color:var(--paper-0);}
  .tlw-btn--danger:hover{background:var(--oxblood-700);}
  .tlw-btn__ico{display:inline-flex;width:1.05em;height:1.05em;}
  .tlw-btn__ico svg{width:100%;height:100%;display:block;}
  `;
  const el = document.createElement('style');
  el.id = 'tlw-btn-styles';
  el.textContent = css;
  document.head.appendChild(el);
}
function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  type = 'button',
  as = 'button',
  className = '',
  ...rest
}) {
  ensureStyles();
  const cls = ['tlw-btn', `tlw-btn--${variant}`, size !== 'md' ? `tlw-btn--${size}` : '', fullWidth ? 'tlw-btn--full' : '', className].filter(Boolean).join(' ');
  const Comp = as;
  const props = Comp === 'button' ? {
    type,
    disabled
  } : {};
  return /*#__PURE__*/React.createElement(Comp, _extends({
    className: cls
  }, props, rest), iconLeft ? /*#__PURE__*/React.createElement("span", {
    className: "tlw-btn__ico"
  }, iconLeft) : null, children, iconRight ? /*#__PURE__*/React.createElement("span", {
    className: "tlw-btn__ico"
  }, iconRight) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The Last Word — Card
 * A sheet of paper. Sharp corners, hairline border, low warm shadow.
 * `interactive` lifts slightly on hover; `tone` tints the left frame.
 */

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const css = `
  .tlw-card{background:var(--surface-card);border:1px solid var(--line-1);border-radius:var(--radius-sm);
    box-shadow:var(--shadow-1);transition:box-shadow var(--dur-base) var(--ease-decisive),transform var(--dur-base) var(--ease-decisive),border-color var(--dur-base) var(--ease-decisive);}
  .tlw-card--p0{padding:0;}
  .tlw-card--sm{padding:var(--space-4);}
  .tlw-card--md{padding:var(--space-6);}
  .tlw-card--lg{padding:var(--space-8);}
  .tlw-card--raised{box-shadow:var(--shadow-2);}
  .tlw-card--flat{box-shadow:none;}
  .tlw-card--interactive{cursor:pointer;}
  .tlw-card--interactive:hover{box-shadow:var(--shadow-3);transform:translateY(-2px);border-color:var(--line-2);}
  .tlw-card--frame{border-left-width:3px;}
  .tlw-card--frame.tone-affirmed{border-left-color:var(--forest-600);}
  .tlw-card--frame.tone-struck{border-left-color:var(--oxblood-600);}
  .tlw-card--frame.tone-pending{border-left-color:var(--stone-400);}
  `;
  const el = document.createElement('style');
  el.id = 'tlw-card-styles';
  el.textContent = css;
  document.head.appendChild(el);
}
function Card({
  children,
  padding = 'md',
  elevation = 'low',
  interactive = false,
  tone,
  as = 'div',
  className = '',
  ...rest
}) {
  ensureStyles();
  const elev = elevation === 'raised' ? 'tlw-card--raised' : elevation === 'flat' ? 'tlw-card--flat' : '';
  const cls = ['tlw-card', `tlw-card--${padding === 'none' ? 'p0' : padding}`, elev, interactive ? 'tlw-card--interactive' : '', tone ? `tlw-card--frame tone-${tone}` : '', className].filter(Boolean).join(' ');
  const Comp = as;
  return /*#__PURE__*/React.createElement(Comp, _extends({
    className: cls
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The Last Word — Input
 * Labeled text field. Hairline border, forest focus ring, sharp corners.
 * Supports leading adornment, hint, and error (oxblood) states.
 */

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const css = `
  .tlw-field{display:flex;flex-direction:column;gap:7px;font-family:var(--font-text);}
  .tlw-field__label{font-size:13px;font-weight:600;color:var(--ink-800);letter-spacing:0;}
  .tlw-field__req{color:var(--oxblood-600);margin-left:2px;}
  .tlw-field__box{display:flex;align-items:center;gap:9px;background:var(--surface-raised);
    border:1.5px solid var(--line-2);border-radius:var(--radius-xs);padding:0 13px;height:44px;
    transition:border-color var(--dur-fast) var(--ease-decisive),box-shadow var(--dur-fast) var(--ease-decisive);}
  .tlw-field__box:focus-within{border-color:var(--forest-600);box-shadow:var(--ring-focus);}
  .tlw-field--error .tlw-field__box{border-color:var(--oxblood-600);}
  .tlw-field--error .tlw-field__box:focus-within{box-shadow:0 0 0 3px rgba(122,42,34,0.25);}
  .tlw-field__ico{display:inline-flex;width:17px;height:17px;color:var(--stone-500);flex:none;}
  .tlw-field__ico svg{width:100%;height:100%;}
  .tlw-field input,.tlw-field textarea{flex:1;border:0;background:transparent;outline:none;width:100%;
    font-family:var(--font-text);font-size:15px;color:var(--ink-900);padding:0;}
  .tlw-field input::placeholder,.tlw-field textarea::placeholder{color:var(--stone-400);}
  .tlw-field--area .tlw-field__box{height:auto;padding:11px 13px;align-items:flex-start;}
  .tlw-field textarea{resize:vertical;min-height:84px;line-height:1.55;}
  .tlw-field__hint{font-size:12.5px;color:var(--text-muted);}
  .tlw-field--error .tlw-field__hint{color:var(--oxblood-600);}
  .tlw-field input:disabled,.tlw-field textarea:disabled{color:var(--stone-400);}
  .tlw-field--disabled .tlw-field__box{background:var(--paper-2);}
  `;
  const el = document.createElement('style');
  el.id = 'tlw-field-styles';
  el.textContent = css;
  document.head.appendChild(el);
}
function Input({
  label,
  hint,
  error,
  required = false,
  icon = null,
  multiline = false,
  rows = 3,
  disabled = false,
  id,
  className = '',
  ...rest
}) {
  ensureStyles();
  const fid = id || (label ? 'f-' + label.replace(/\s+/g, '-').toLowerCase() : undefined);
  const cls = ['tlw-field', multiline ? 'tlw-field--area' : '', error ? 'tlw-field--error' : '', disabled ? 'tlw-field--disabled' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", {
    className: cls,
    htmlFor: fid
  }, label ? /*#__PURE__*/React.createElement("span", {
    className: "tlw-field__label"
  }, label, required ? /*#__PURE__*/React.createElement("span", {
    className: "tlw-field__req"
  }, "*") : null) : null, /*#__PURE__*/React.createElement("span", {
    className: "tlw-field__box"
  }, icon ? /*#__PURE__*/React.createElement("span", {
    className: "tlw-field__ico"
  }, icon) : null, multiline ? /*#__PURE__*/React.createElement("textarea", _extends({
    id: fid,
    rows: rows,
    disabled: disabled
  }, rest)) : /*#__PURE__*/React.createElement("input", _extends({
    id: fid,
    disabled: disabled
  }, rest))), error || hint ? /*#__PURE__*/React.createElement("span", {
    className: "tlw-field__hint"
  }, error || hint) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The Last Word — Tag
 * A topic / category chip. Quiet by default; optional removable.
 */

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const css = `
  .tlw-tag{display:inline-flex;align-items:center;gap:7px;height:26px;padding:0 11px;
    font-family:var(--font-text);font-weight:600;font-size:12.5px;letter-spacing:0;line-height:1;
    color:var(--ink-800);background:var(--paper-0);border:1px solid var(--line-2);border-radius:var(--radius-pill);
    white-space:nowrap;cursor:default;transition:background var(--dur-fast) var(--ease-decisive),border-color var(--dur-fast) var(--ease-decisive);}
  .tlw-tag--button{cursor:pointer;}
  .tlw-tag--button:hover{background:var(--paper-2);border-color:var(--line-3);}
  .tlw-tag--active{background:var(--ink-900);border-color:var(--ink-900);color:var(--paper-0);}
  .tlw-tag__dot{width:7px;height:7px;border-radius:var(--radius-pill);flex:none;}
  .tlw-tag__x{display:inline-flex;margin-right:-3px;width:14px;height:14px;border-radius:var(--radius-pill);
    align-items:center;justify-content:center;font-size:13px;line-height:1;color:var(--stone-500);cursor:pointer;}
  .tlw-tag__x:hover{color:var(--oxblood-600);}
  `;
  const el = document.createElement('style');
  el.id = 'tlw-tag-styles';
  el.textContent = css;
  document.head.appendChild(el);
}
function Tag({
  children,
  color,
  active = false,
  onRemove,
  onClick,
  className = '',
  ...rest
}) {
  ensureStyles();
  const cls = ['tlw-tag', onClick ? 'tlw-tag--button' : '', active ? 'tlw-tag--active' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls,
    onClick: onClick
  }, rest), color ? /*#__PURE__*/React.createElement("span", {
    className: "tlw-tag__dot",
    style: {
      background: color
    }
  }) : null, children, onRemove ? /*#__PURE__*/React.createElement("span", {
    className: "tlw-tag__x",
    onClick: e => {
      e.stopPropagation();
      onRemove(e);
    }
  }, "\xD7") : null);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/justice/EntityHeader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * JUSTICE — EntityHeader
 * The NEUTRAL entity atom, pulled from its home realm (mostly Society).
 * Name only — accusations live in the Justice layer, never baked into the
 * entity. The "Neutral atom" marker + home-realm link keep that boundary clear.
 */

let _i = false;
function ensureStyles() {
  if (_i || typeof document === 'undefined') return;
  _i = true;
  const css = `
  .jx-ent{background:var(--navy-800);color:var(--text-on-navy);border-radius:var(--radius-md);overflow:hidden;position:relative;}
  .jx-ent__hc{position:absolute;inset:0;background-image:radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0);background-size:18px 18px;pointer-events:none;}
  .jx-ent__in{position:relative;padding:22px 26px;}
  .jx-ent__crumb{display:flex;align-items:center;gap:7px;font-family:var(--font-mono);font-size:11px;letter-spacing:0.03em;color:#9DB1C7;margin-bottom:14px;flex-wrap:wrap;}
  .jx-ent__crumb b{color:#C9D6E4;font-weight:500;}
  .jx-ent__sep{opacity:0.5;}
  .jx-ent__row{display:flex;align-items:center;gap:16px;}
  .jx-ent__hex{width:46px;height:46px;flex:none;display:flex;align-items:center;justify-content:center;
    border-radius:50%;background:var(--gold-600);box-shadow:0 0 0 3px rgba(212,182,94,0.35);
    font-family:var(--font-serif);font-weight:700;font-size:22px;color:#1a1305;}
  .jx-ent__name{font-family:var(--font-serif);font-weight:700;font-size:32px;line-height:1.05;letter-spacing:-0.01em;color:#fff;margin:0;}
  .jx-ent__neutral{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 10px;border-radius:var(--radius-pill);
    border:1px solid rgba(255,255,255,0.28);font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.08em;
    text-transform:uppercase;color:#CBD8E6;margin-top:8px;}
  .jx-ent__meta{display:flex;gap:22px;flex-wrap:wrap;margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.12);}
  .jx-ent__m{display:flex;flex-direction:column;gap:3px;}
  .jx-ent__mk{font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#8499AF;}
  .jx-ent__mv{font-family:var(--font-text);font-size:14px;font-weight:600;color:#E8EEF4;}
  .jx-ent__tags{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:16px;}
  .jx-ent__tlab{font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#8499AF;}
  .jx-ent__tag{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 11px;border-radius:var(--radius-pill);
    font-family:var(--font-text);font-size:12.5px;font-weight:600;background:rgba(255,255,255,0.08);
    border:1px solid rgba(255,255,255,0.16);color:#DCE6F0;cursor:default;}
  .jx-ent__tag .d{width:6px;height:6px;border-radius:99px;}
  `;
  const el = document.createElement('style');
  el.id = 'jx-ent-styles';
  el.textContent = css;
  document.head.appendChild(el);
}
const TAG_COLORS = {
  positive: 'var(--status-sourced)',
  negative: 'var(--status-fringe)',
  neutral: 'var(--silver-500)'
};
function EntityHeader({
  name,
  kind = 'Entity',
  sector,
  geo,
  realmPath = ['Society'],
  initial,
  contestedTags = [],
  className = '',
  ...rest
}) {
  ensureStyles();
  return /*#__PURE__*/React.createElement("header", _extends({
    className: ['jx-ent', className].filter(Boolean).join(' ')
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "jx-ent__hc"
  }), /*#__PURE__*/React.createElement("div", {
    className: "jx-ent__in"
  }, /*#__PURE__*/React.createElement("nav", {
    className: "jx-ent__crumb"
  }, realmPath.map((p, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 ? /*#__PURE__*/React.createElement("span", {
    className: "jx-ent__sep"
  }, "\u203A") : null, /*#__PURE__*/React.createElement("b", null, p))), name ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "jx-ent__sep"
  }, "\u203A"), /*#__PURE__*/React.createElement("b", null, name)) : null), /*#__PURE__*/React.createElement("div", {
    className: "jx-ent__row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "jx-ent__hex"
  }, initial || (name ? name[0] : '◇')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "jx-ent__name"
  }, name), /*#__PURE__*/React.createElement("span", {
    className: "jx-ent__neutral"
  }, "\xA7 Named party \xB7 no finding entered"))), /*#__PURE__*/React.createElement("div", {
    className: "jx-ent__meta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "jx-ent__m"
  }, /*#__PURE__*/React.createElement("span", {
    className: "jx-ent__mk"
  }, "Type"), /*#__PURE__*/React.createElement("span", {
    className: "jx-ent__mv"
  }, kind)), sector ? /*#__PURE__*/React.createElement("div", {
    className: "jx-ent__m"
  }, /*#__PURE__*/React.createElement("span", {
    className: "jx-ent__mk"
  }, "Sector"), /*#__PURE__*/React.createElement("span", {
    className: "jx-ent__mv"
  }, sector)) : null, geo ? /*#__PURE__*/React.createElement("div", {
    className: "jx-ent__m"
  }, /*#__PURE__*/React.createElement("span", {
    className: "jx-ent__mk"
  }, "Geo scope"), /*#__PURE__*/React.createElement("span", {
    className: "jx-ent__mv"
  }, geo)) : null), contestedTags.length ? /*#__PURE__*/React.createElement("div", {
    className: "jx-ent__tags"
  }, /*#__PURE__*/React.createElement("span", {
    className: "jx-ent__tlab"
  }, "Public designations \xB7"), contestedTags.map((t, i) => /*#__PURE__*/React.createElement("span", {
    className: "jx-ent__tag",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "d",
    style: {
      background: TAG_COLORS[t.lean] || TAG_COLORS.neutral
    }
  }), t.label))) : null));
}
Object.assign(__ds_scope, { EntityHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/justice/EntityHeader.jsx", error: String((e && e.message) || e) }); }

// components/justice/EscalationLadder.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * JUSTICE — EscalationLadder
 * The accountability loop, made legible: SEE → INVESTIGATE → EVIDENCE →
 * DEMAND (C&D) → ACT (class action) → PROSECUTE → OUTCOME. Shows where a
 * case sits and what the next rung is. Nodes are honeycomb cells.
 */

let _i = false;
function ensureStyles() {
  if (_i || typeof document === 'undefined') return;
  _i = true;
  const css = `
  .jx-ladder{display:flex;align-items:flex-start;width:100%;font-family:var(--font-text);}
  .jx-ladder__step{display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;position:relative;min-width:0;}
  .jx-ladder__rail{position:absolute;top:17px;left:-50%;width:100%;height:2px;background:var(--line-strong);z-index:0;}
  .jx-ladder__rail.is-done{background:var(--navy-600);}
  .jx-ladder__node{width:34px;height:34px;display:flex;align-items:center;justify-content:center;
    border-radius:50%;
    background:var(--paper-200);color:var(--slate-400);position:relative;z-index:1;
    font-family:var(--font-mono);font-weight:600;font-size:12px;}
  .jx-ladder__node.is-done{background:var(--navy-700);color:#fff;}
  .jx-ladder__node.is-current{background:var(--gold-600);color:#1a1305;}
  .jx-ladder__ring{position:absolute;width:46px;height:46px;z-index:0;border-radius:50%;background:var(--gold-100);}
  .jx-ladder__lab{font-family:var(--font-mono);font-size:10px;letter-spacing:0.05em;text-transform:uppercase;
    text-align:center;color:var(--text-faint);line-height:1.2;}
  .jx-ladder__lab.is-current{color:var(--gold-700);font-weight:700;}
  .jx-ladder__lab.is-done{color:var(--text-muted);}
  .jx-ladder--compact .jx-ladder__node{width:24px;height:24px;font-size:10px;}
  .jx-ladder--compact .jx-ladder__ring{width:32px;height:32px;}
  .jx-ladder--compact .jx-ladder__rail{top:12px;}
  `;
  const el = document.createElement('style');
  el.id = 'jx-ladder-styles';
  el.textContent = css;
  document.head.appendChild(el);
}
const RUNGS = [{
  key: 'see',
  label: 'Complaint'
}, {
  key: 'investigate',
  label: 'Investigation'
}, {
  key: 'evidence',
  label: 'Discovery'
}, {
  key: 'demand',
  label: 'Injunction'
}, {
  key: 'act',
  label: 'Class Action'
}, {
  key: 'prosecute',
  label: 'Trial'
}, {
  key: 'outcome',
  label: 'Judgment'
}];
function EscalationLadder({
  current = 'investigate',
  compact = false,
  showLabels = true,
  className = '',
  ...rest
}) {
  ensureStyles();
  const idx = typeof current === 'number' ? current : RUNGS.findIndex(r => r.key === current);
  const cls = ['jx-ladder', compact ? 'jx-ladder--compact' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), RUNGS.map((r, i) => {
    const done = i < idx,
      cur = i === idx;
    return /*#__PURE__*/React.createElement("div", {
      className: "jx-ladder__step",
      key: r.key
    }, i > 0 ? /*#__PURE__*/React.createElement("span", {
      className: 'jx-ladder__rail' + (i <= idx ? ' is-done' : '')
    }) : null, cur ? /*#__PURE__*/React.createElement("span", {
      className: "jx-ladder__ring"
    }) : null, /*#__PURE__*/React.createElement("span", {
      className: 'jx-ladder__node' + (done ? ' is-done' : cur ? ' is-current' : '')
    }, done ? '✓' : i + 1), showLabels ? /*#__PURE__*/React.createElement("span", {
      className: 'jx-ladder__lab' + (cur ? ' is-current' : done ? ' is-done' : '')
    }, r.label) : null);
  }));
}
EscalationLadder.RUNGS = RUNGS;
Object.assign(__ds_scope, { EscalationLadder });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/justice/EscalationLadder.jsx", error: String((e && e.message) || e) }); }

// components/justice/EvidenceMeter.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * JUSTICE — EvidenceMeter
 * The case's EVIDENTIARY STRENGTH — built only from on-record posts
 * (Evidence / Filing / Testimony). Deliberately separate from raw
 * engagement so the crowd layer never inflates the record.
 */

let _i = false;
function ensureStyles() {
  if (_i || typeof document === 'undefined') return;
  _i = true;
  const css = `
  .jx-eml{display:flex;flex-direction:column;gap:8px;font-family:var(--font-mono);}
  .jx-eml__top{display:flex;align-items:baseline;justify-content:space-between;}
  .jx-eml__lab{font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);font-weight:600;}
  .jx-eml__score{font-family:var(--font-serif);font-weight:700;font-size:18px;color:var(--ink-900);letter-spacing:0;}
  .jx-eml__score b{color:var(--gold-700);}
  .jx-eml__bar{display:flex;height:9px;border-radius:var(--radius-pill);overflow:hidden;background:var(--paper-200);}
  .jx-eml__seg{height:100%;}
  .jx-eml__seg--evidence{background:var(--post-evidence);}
  .jx-eml__seg--filing{background:var(--post-filing);}
  .jx-eml__seg--testimony{background:var(--post-testimony);}
  .jx-eml__legend{display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:var(--text-muted);}
  .jx-eml__k{display:inline-flex;align-items:center;gap:5px;}
  .jx-eml__sw{width:8px;height:8px;border-radius:2px;}
  `;
  const el = document.createElement('style');
  el.id = 'jx-eml-styles';
  el.textContent = css;
  document.head.appendChild(el);
}
function EvidenceMeter({
  evidence = 0,
  filings = 0,
  testimony = 0,
  size = 'md',
  showLegend = true,
  className = '',
  ...rest
}) {
  ensureStyles();
  const total = evidence + filings + testimony;
  // weighted strength: evidence 3, filing 2.5, testimony 2 (capped at 100)
  const raw = evidence * 3 + filings * 2.5 + testimony * 2;
  const score = Math.min(100, Math.round(raw));
  const t = total || 1;
  const cls = ['jx-eml', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "jx-eml__top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "jx-eml__lab"
  }, "Evidentiary strength"), /*#__PURE__*/React.createElement("span", {
    className: "jx-eml__score"
  }, /*#__PURE__*/React.createElement("b", null, score), "/100")), /*#__PURE__*/React.createElement("div", {
    className: "jx-eml__bar",
    role: "img",
    "aria-label": `Evidentiary strength ${score} of 100`
  }, /*#__PURE__*/React.createElement("div", {
    className: "jx-eml__seg jx-eml__seg--evidence",
    style: {
      width: evidence / t * 100 + '%'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "jx-eml__seg jx-eml__seg--filing",
    style: {
      width: filings / t * 100 + '%'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "jx-eml__seg jx-eml__seg--testimony",
    style: {
      width: testimony / t * 100 + '%'
    }
  })), showLegend ? /*#__PURE__*/React.createElement("div", {
    className: "jx-eml__legend"
  }, /*#__PURE__*/React.createElement("span", {
    className: "jx-eml__k"
  }, /*#__PURE__*/React.createElement("span", {
    className: "jx-eml__sw",
    style: {
      background: 'var(--post-evidence)'
    }
  }), evidence, " evidence"), /*#__PURE__*/React.createElement("span", {
    className: "jx-eml__k"
  }, /*#__PURE__*/React.createElement("span", {
    className: "jx-eml__sw",
    style: {
      background: 'var(--post-filing)'
    }
  }), filings, " motions"), /*#__PURE__*/React.createElement("span", {
    className: "jx-eml__k"
  }, /*#__PURE__*/React.createElement("span", {
    className: "jx-eml__sw",
    style: {
      background: 'var(--post-testimony)'
    }
  }), testimony, " testimony")) : null);
}
Object.assign(__ds_scope, { EvidenceMeter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/justice/EvidenceMeter.jsx", error: String((e && e.message) || e) }); }

// components/justice/PostType.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * JUSTICE — PostType
 * Post type drives visual weight AND whether it enters the evidentiary record.
 * Evidence / Filing / Testimony build the case; Opinion / Reaction are the
 * crowd layer and are visually distinct so they never pollute the record.
 */

let _i = false;
function ensureStyles() {
  if (_i || typeof document === 'undefined') return;
  _i = true;
  const css = `
  .jx-ptype{display:inline-flex;align-items:center;gap:6px;height:21px;padding:0 9px 0 8px;
    font-family:var(--font-mono);font-weight:600;font-size:10.5px;letter-spacing:0.07em;text-transform:uppercase;
    border-radius:var(--radius-xs);border:1px solid transparent;white-space:nowrap;line-height:1;}
  .jx-ptype__bar{width:3px;height:11px;border-radius:1px;background:currentColor;flex:none;}
  .jx-ptype--onrecord{box-shadow:none;}
  .jx-ptype.t-evidence{color:var(--post-evidence);background:#F3ECD9;border-color:#E2D2A6;}
  .jx-ptype.t-filing{color:var(--post-filing);background:var(--navy-100);border-color:#C3D4E6;}
  .jx-ptype.t-testimony{color:var(--post-testimony);background:#D8ECEB;border-color:#B4D7D5;}
  .jx-ptype.t-analysis{color:var(--post-analysis);background:#E2E3F3;border-color:#C7C9E6;}
  .jx-ptype.t-opinion{color:var(--post-opinion);background:var(--paper-100);border-color:var(--line-strong);}
  .jx-ptype.t-reaction{color:var(--slate-400);background:transparent;border-color:var(--line-strong);}
  .jx-ptype.t-question{color:#9A6212;background:var(--honey-100);border-color:#EAD09B;}
  `;
  const el = document.createElement('style');
  el.id = 'jx-ptype-styles';
  el.textContent = css;
  document.head.appendChild(el);
}
const META = {
  evidence: {
    label: 'Evidence',
    record: true
  },
  filing: {
    label: 'Motion',
    record: true
  },
  testimony: {
    label: 'Testimony',
    record: true
  },
  analysis: {
    label: 'Brief',
    record: false
  },
  opinion: {
    label: 'Statement',
    record: false
  },
  reaction: {
    label: 'Note',
    record: false
  },
  question: {
    label: 'Inquiry',
    record: false
  }
};
function PostType({
  type = 'analysis',
  bar = true,
  children,
  className = '',
  ...rest
}) {
  ensureStyles();
  const m = META[type] || META.analysis;
  const cls = ['jx-ptype', `t-${type}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), bar ? /*#__PURE__*/React.createElement("span", {
    className: "jx-ptype__bar"
  }) : null, children != null ? children : m.label);
}

/** Whether a post type enters the evidentiary record. */
PostType.entersRecord = type => !!(META[type] && META[type].record);
Object.assign(__ds_scope, { PostType });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/justice/PostType.jsx", error: String((e && e.message) || e) }); }

// components/justice/TruthStatus.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * JUSTICE — TruthStatus ("the kettle" / Discovery Ladder)
 * Shows where a claim stands — Sourced / Accepted / Emerging / Fringe /
 * Unsourced — WITHOUT the platform ruling on truth. Contested things are
 * shown honestly as contested, never hidden, never endorsed.
 */

let _i = false;
function ensureStyles() {
  if (_i || typeof document === 'undefined') return;
  _i = true;
  const css = `
  .jx-truth{display:inline-flex;align-items:center;gap:7px;height:22px;padding:0 10px;
    font-family:var(--font-mono);font-weight:600;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;
    border-radius:var(--radius-pill);border:1px solid transparent;white-space:nowrap;line-height:1;}
  .jx-truth__dot{width:7px;height:7px;border-radius:var(--radius-pill);background:currentColor;flex:none;}
  .jx-truth--soft.is-sourced{background:var(--status-sourced-tint);color:var(--status-sourced);border-color:#B9D9C8;}
  .jx-truth--soft.is-accepted{background:var(--status-accepted-tint);color:var(--status-accepted);border-color:#B9D0EC;}
  .jx-truth--soft.is-emerging{background:var(--status-emerging-tint);color:#9A6212;border-color:#EAD09B;}
  .jx-truth--soft.is-fringe{background:var(--status-fringe-tint);color:var(--status-fringe);border-color:#E6C0B0;}
  .jx-truth--soft.is-unsourced{background:var(--status-unsourced-tint);color:var(--slate-400);border-color:var(--line-strong);}
  .jx-truth--solid.is-sourced{background:var(--status-sourced);color:#fff;}
  .jx-truth--solid.is-accepted{background:var(--status-accepted);color:#fff;}
  .jx-truth--solid.is-emerging{background:var(--status-emerging);color:#fff;}
  .jx-truth--solid.is-fringe{background:var(--status-fringe);color:#fff;}
  .jx-truth--solid.is-unsourced{background:var(--status-unsourced);color:#fff;}
  .jx-truth--outline{background:transparent;}
  .jx-truth--outline.is-sourced{color:var(--status-sourced);border-color:#B9D9C8;}
  .jx-truth--outline.is-accepted{color:var(--status-accepted);border-color:#B9D0EC;}
  .jx-truth--outline.is-emerging{color:#9A6212;border-color:#EAD09B;}
  .jx-truth--outline.is-fringe{color:var(--status-fringe);border-color:#E6C0B0;}
  .jx-truth--outline.is-unsourced{color:var(--slate-400);border-color:var(--line-strong);}
  `;
  const el = document.createElement('style');
  el.id = 'jx-truth-styles';
  el.textContent = css;
  document.head.appendChild(el);
}
const LABELS = {
  sourced: 'Substantiated',
  accepted: 'On Record',
  emerging: 'Alleged',
  fringe: 'Disputed',
  unsourced: 'Unverified'
};
function TruthStatus({
  status = 'unsourced',
  variant = 'soft',
  dot = true,
  children,
  className = '',
  ...rest
}) {
  ensureStyles();
  const cls = ['jx-truth', `jx-truth--${variant}`, `is-${status}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), dot ? /*#__PURE__*/React.createElement("span", {
    className: "jx-truth__dot"
  }) : null, children != null ? children : LABELS[status]);
}
Object.assign(__ds_scope, { TruthStatus });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/justice/TruthStatus.jsx", error: String((e && e.message) || e) }); }

// components/justice/CaseCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * JUSTICE — CaseCard
 * A case summary for the landing/docket: target entity, truth status, where it
 * sits on the escalation ladder, evidentiary strength, geo, and a join CTA.
 * Composes Card + TruthStatus + EvidenceMeter + EscalationLadder.
 */

let _i = false;
function ensureStyles() {
  if (_i || typeof document === 'undefined') return;
  _i = true;
  const css = `
  .jx-case__head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;}
  .jx-case__target{display:inline-flex;align-items:center;gap:8px;font-family:var(--font-mono);font-size:11px;
    letter-spacing:0.04em;color:var(--text-muted);}
  .jx-case__hex{width:13px;height:13px;border-radius:50%;background:var(--navy-700);flex:none;}
  .jx-case__title{font-family:var(--font-serif);font-weight:700;font-size:21px;line-height:1.2;letter-spacing:-0.01em;
    color:var(--text-strong);margin:0 0 6px;text-wrap:balance;}
  .jx-case__sum{font-family:var(--font-text);font-size:14px;line-height:1.55;color:var(--text-muted);margin:0 0 16px;}
  .jx-case__ladder{margin:16px 0;}
  .jx-case__foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;
    padding-top:13px;border-top:1px solid var(--line);font-family:var(--font-mono);font-size:12px;color:var(--text-faint);}
  .jx-case__foot b{color:var(--text-muted);font-weight:600;}
  .jx-case__geo{display:inline-flex;align-items:center;gap:5px;}
  `;
  const el = document.createElement('style');
  el.id = 'jx-case-styles';
  el.textContent = css;
  document.head.appendChild(el);
}
function CaseCard({
  id,
  target,
  title,
  summary,
  status = 'emerging',
  rung = 'investigate',
  evidence = 0,
  filings = 0,
  testimony = 0,
  geo,
  joined,
  onOpen,
  className = '',
  ...rest
}) {
  ensureStyles();
  return /*#__PURE__*/React.createElement(__ds_scope.Card, _extends({
    padding: "md",
    interactive: !!onOpen,
    onClick: onOpen,
    className: className
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "jx-case__head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "jx-case__target"
  }, /*#__PURE__*/React.createElement("span", {
    className: "jx-case__hex"
  }), target ? /*#__PURE__*/React.createElement(React.Fragment, null, "Respondent \xB7 ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--ink-800)'
    }
  }, target)) : id || 'CASE'), /*#__PURE__*/React.createElement(__ds_scope.TruthStatus, {
    status: status
  })), /*#__PURE__*/React.createElement("h3", {
    className: "jx-case__title"
  }, title), summary ? /*#__PURE__*/React.createElement("p", {
    className: "jx-case__sum"
  }, summary) : null, /*#__PURE__*/React.createElement("div", {
    className: "jx-case__ladder"
  }, /*#__PURE__*/React.createElement(__ds_scope.EscalationLadder, {
    current: rung,
    compact: true,
    showLabels: false
  })), /*#__PURE__*/React.createElement(__ds_scope.EvidenceMeter, {
    evidence: evidence,
    filings: filings,
    testimony: testimony,
    showLegend: false
  }), /*#__PURE__*/React.createElement("div", {
    className: "jx-case__foot"
  }, geo ? /*#__PURE__*/React.createElement("span", {
    className: "jx-case__geo"
  }, "\u25C7 ", geo) : /*#__PURE__*/React.createElement("span", null), joined != null ? /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, joined.toLocaleString('en-US')), " organizing") : null, id ? /*#__PURE__*/React.createElement("span", null, id) : null));
}
Object.assign(__ds_scope, { CaseCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/justice/CaseCard.jsx", error: String((e && e.message) || e) }); }

// slides/deck-stage.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
/* BEGIN USAGE */
/**
 * <deck-stage> — reusable web component for HTML decks.
 *
 * Handles:
 *  (a) speaker notes — reads <script type="application/json" id="speaker-notes">
 *      and posts {slideIndexChanged: N} to the parent window on nav.
 *  (b) keyboard navigation — ←/→, PgUp/PgDn, Space, Home/End, number keys.
 *      On touch devices, tapping the left/right half of the stage goes
 *      prev/next — taps on links, buttons and other interactive slide
 *      content are left alone.
 *  (c) press R to reset to slide 0 (with a tasteful keyboard hint).
 *  (d) bottom-center overlay showing slide count + hints, fades out on idle.
 *  (e) auto-scaling — inner canvas is a fixed design size (default 1920×1080)
 *      scaled with `transform: scale()` to fit the viewport, letterboxed.
 *      Set the `noscale` attribute to render at authored size (1:1) — the
 *      PPTX exporter sets this so its DOM capture sees unscaled geometry.
 *  (f) print — `@media print` lays every slide out as its own page at the
 *      design size, so the browser's Print → Save as PDF produces a clean
 *      one-page-per-slide PDF with no extra setup.
 *  (g) thumbnail rail — resizable left-hand column of per-slide thumbnails
 *      (static clones). Click to navigate; ↑/↓ with a thumbnail focused to
 *      step between slides; drag to reorder; right-click for
 *      Skip / Move up / Move down / Duplicate / Delete (Delete opens a
 *      Cancel/Delete confirm dialog). Drag the rail's right edge to resize;
 *      width persists to
 *      localStorage. Skipped slides carry `data-deck-skip`, are dimmed in
 *      the rail, omitted from prev/next navigation, and hidden at print.
 *      The rail is suppressed in presenting mode, in the host's Preview
 *      mode (ViewerMode='none'), on `noscale`, on narrow viewports
 *      (≤640px), and via the `no-rail` attribute. Rail mutations dispatch
 *      a `deckchange`
 *      CustomEvent on the element: detail = {action, from, to, slide}.
 *
 * Slides are HIDDEN, not unmounted. Non-active slides stay in the DOM with
 * `visibility: hidden` + `opacity: 0`, so their state (videos, iframes,
 * form inputs, React trees) is preserved across navigation.
 *
 * Lifecycle event — the component dispatches a `slidechange` CustomEvent on
 * itself whenever the active slide changes (including the initial mount).
 * The event bubbles and composes out of shadow DOM, so you can listen on
 * the <deck-stage> element or on document:
 *
 *   document.querySelector('deck-stage').addEventListener('slidechange', (e) => {
 *     e.detail.index         // new 0-based index
 *     e.detail.previousIndex // previous index, or -1 on init
 *     e.detail.total         // total slide count
 *     e.detail.slide         // the new active slide element
 *     e.detail.previousSlide // the prior slide element, or null on init
 *     e.detail.reason        // 'init' | 'keyboard' | 'click' | 'tap' | 'api'
 *   });
 *
 * Persistence: none at the deck level. The host app keeps the current slide
 * in its own URL (?slide=) and re-delivers it via location.hash on load, so a
 * bare load with no hash always starts at slide 1.
 *
 * Usage:
 *   <style>deck-stage:not(:defined){visibility:hidden}</style>
 *   <deck-stage width="1920" height="1080">
 *     <section data-label="Title">...</section>
 *     <section data-label="Agenda">...</section>
 *   </deck-stage>
 *   <script src="deck-stage.js"></script>
 *
 * The :not(:defined) rule prevents a flash of the first slide at its
 * authored styles before this script runs and attaches the shadow root.
 *
 * Slides are the direct element children of <deck-stage>. Each slide is
 * automatically tagged with:
 *   - data-screen-label="NN Label"   (1-indexed, for comment flow)
 *   - data-om-validate="no_overflowing_text,no_overlapping_text,slide_sized_text"
 *
 * Speaker notes stay in sync because the component posts {slideIndexChanged: N}
 * to the parent — just include the #speaker-notes script tag if asked for notes.
 *
 * Authoring guidance:
 *   - Write slide bodies as static HTML inside <deck-stage>, with sizing via
 *     CSS custom properties in a <style> block rather than JS constants.
 *     Static slide markup is what lets the user click a heading in edit mode
 *     and retype it directly; a slide rendered through <script type="text/babel">,
 *     React, or a loop over a JS array has to round-trip every tweak through a
 *     chat message instead. Reach for script-generated slides only when the
 *     content genuinely needs interactive behaviour static HTML can't express.
 *   - Do NOT set position/inset/width/height on the slide <section> elements —
 *     the component absolutely positions every slotted child for you.
 *   - Entrance animations: make the visible end-state the base style and
 *     animate *from* hidden, so print and reduced-motion show content.
 *     Gate the animation on [data-deck-active] and the motion query, e.g.
 *     `@media (prefers-reduced-motion:no-preference){ [data-deck-active] .x{animation:fade-in .5s both} }`.
 *     Avoid infinite decorative loops on slide content.
 */
/* END USAGE */

(() => {
  const DESIGN_W_DEFAULT = 1920;
  const DESIGN_H_DEFAULT = 1080;
  const OVERLAY_HIDE_MS = 1800;
  const VALIDATE_ATTR = 'no_overflowing_text,no_overlapping_text,slide_sized_text';
  const FINE_POINTER_MQ = matchMedia('(hover: hover) and (pointer: fine)');
  const NARROW_MQ = matchMedia('(max-width: 640px)');
  // Slide-authored controls that should keep a tap instead of it navigating.
  const INTERACTIVE_SEL = 'a[href], button, input, select, textarea, summary, label, video[controls], audio[controls], [role="button"], [onclick], [tabindex]:not([tabindex^="-"]), [contenteditable]:not([contenteditable="false" i])';
  const pad2 = n => String(n).padStart(2, '0');

  // Label precedence: data-label → data-screen-label (number stripped) → first heading → "Slide".
  const getSlideLabel = el => {
    const explicit = el.getAttribute('data-label');
    if (explicit) return explicit;
    const existing = el.getAttribute('data-screen-label');
    if (existing) return existing.replace(/^\s*\d+\s*/, '').trim() || existing;
    const h = el.querySelector('h1, h2, h3, [data-title]');
    const t = h && (h.textContent || '').trim().slice(0, 40);
    if (t) return t;
    return 'Slide';
  };
  const stylesheet = `
    :host {
      position: fixed;
      inset: 0;
      display: block;
      background: #000;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
      overflow: hidden;
      -webkit-tap-highlight-color: transparent;
    }
    /* connectedCallback holds this until document.fonts.ready (capped 2s) so
     * the first visible paint has the deck's real typography + final rail
     * layout. opacity (not visibility) so the active slide can't un-hide
     * itself via the ::slotted([data-deck-active]) visibility:visible rule.
     * Only the stage/rail hide — the black :host background stays, so the
     * iframe doesn't flash the page's default white. */
    :host([data-fonts-pending]) .stage,
    :host([data-fonts-pending]) .rail { opacity: 0; pointer-events: none; }

    .stage {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .canvas {
      position: relative;
      transform-origin: center center;
      flex-shrink: 0;
      background: #fff;
      will-change: transform;
    }

    /* Slides live in light DOM (via <slot>) so authored CSS still applies.
       We absolutely position each slotted child to stack them. */
    ::slotted(*) {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      box-sizing: border-box !important;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      visibility: hidden;
    }
    ::slotted([data-deck-active]) {
      opacity: 1;
      pointer-events: auto;
      visibility: visible;
    }

    .overlay {
      position: fixed;
      left: 50%;
      bottom: 22px;
      transform: translate(-50%, 6px) scale(0.92);
      filter: blur(6px);
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      background: #000;
      color: #fff;
      border-radius: 999px;
      font-size: 12px;
      font-feature-settings: "tnum" 1;
      letter-spacing: 0.01em;
      opacity: 0;
      pointer-events: none;
      transition: opacity 260ms ease, transform 260ms cubic-bezier(.2,.8,.2,1), filter 260ms ease;
      transform-origin: center bottom;
      z-index: 2147483000;
      user-select: none;
    }
    .overlay[data-visible] {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, 0) scale(1);
      filter: blur(0);
    }

    .btn {
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      border: 0;
      margin: 0;
      padding: 0;
      color: inherit;
      font: inherit;
      cursor: default;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 28px;
      min-width: 28px;
      border-radius: 999px;
      color: rgba(255,255,255,0.72);
      transition: background 140ms ease, color 140ms ease;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
    .btn:active { background: rgba(255,255,255,0.18); }
    .btn:focus { outline: none; }
    .btn:focus-visible { outline: none; }
    .btn::-moz-focus-inner { border: 0; }
    .btn svg { width: 14px; height: 14px; display: block; }
    .btn.reset {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.02em;
      padding: 0 10px 0 12px;
      gap: 6px;
      color: rgba(255,255,255,0.72);
    }
    .btn.reset .kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-size: 10px;
      line-height: 1;
      color: rgba(255,255,255,0.88);
      background: rgba(255,255,255,0.12);
      border-radius: 4px;
    }

    .count {
      font-variant-numeric: tabular-nums;
      color: #fff;
      font-weight: 500;
      padding: 0 8px;
      min-width: 42px;
      text-align: center;
      font-size: 12px;
    }
    .count .sep { color: rgba(255,255,255,0.45); margin: 0 3px; font-weight: 400; }
    .count .total { color: rgba(255,255,255,0.55); }

    .divider {
      width: 1px;
      height: 14px;
      background: rgba(255,255,255,0.18);
      margin: 0 2px;
    }

    /* ── Thumbnail rail ──────────────────────────────────────────────────
       Fixed column on the left; each thumbnail is a static deep-clone of
       the light-DOM slide scaled into a 16:9 (or design-aspect) frame. The
       stage re-fits around it (see _fit); hidden during present / noscale
       / print so capture geometry and fullscreen output are unchanged. */
    .rail {
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      width: var(--deck-rail-w, 188px);
      background: #141414;
      border-right: 1px solid rgba(255,255,255,0.08);
      overflow-y: auto;
      overflow-x: hidden;
      padding: 12px 10px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 2147482500;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.18) transparent;
    }
    .rail::-webkit-scrollbar { width: 8px; }
    .rail::-webkit-scrollbar-track { background: transparent; margin: 2px; }
    .rail::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.18);
      border-radius: 4px;
      border: 2px solid transparent;
      background-clip: content-box;
    }
    .rail::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,0.28);
      border: 2px solid transparent;
      background-clip: content-box;
    }
    :host([no-rail]) .rail,
    :host([noscale]) .rail { display: none; }
    .rail[data-presenting] { display: none; }
    @media (max-width: 640px) {
      .rail, .rail-resize { display: none; }
    }
    /* User-driven show/hide (the TweaksPanel toggle) slides instead of
       popping. Transitions are gated on :host([data-rail-anim]) — set only
       for the 200ms around the toggle — so window-resize and rail-width
       drag (which also call _fit) don't lag behind the cursor. */
    .rail[data-user-hidden] { transform: translateX(-100%); }
    :host([data-rail-anim]) .rail { transition: transform 200ms cubic-bezier(.3,.7,.4,1); }
    :host([data-rail-anim]) .stage { transition: left 200ms cubic-bezier(.3,.7,.4,1); }
    :host([data-rail-anim]) .canvas { transition: transform 200ms cubic-bezier(.3,.7,.4,1); }
    /* transition shorthand replaces rather than merges — repeat the base
       .overlay opacity/transform/filter transitions so visibility changes
       during the 200ms toggle window still fade instead of popping. */
    :host([data-rail-anim]) .overlay {
      transition: margin-left 200ms cubic-bezier(.3,.7,.4,1),
                  opacity 260ms ease,
                  transform 260ms cubic-bezier(.2,.8,.2,1),
                  filter 260ms ease;
    }

    .thumb {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }
    .thumb .num {
      width: 16px;
      flex-shrink: 0;
      font-size: 11px;
      font-weight: 500;
      text-align: right;
      color: rgba(255,255,255,0.55);
      padding-top: 2px;
      font-variant-numeric: tabular-nums;
    }
    .thumb .frame {
      position: relative;
      flex: 1;
      min-width: 0;
      aspect-ratio: var(--deck-aspect);
      background: #fff;
      border-radius: 4px;
      outline: 2px solid transparent;
      outline-offset: 0;
      overflow: hidden;
      transition: outline-color 120ms ease;
    }
    .thumb:hover .frame { outline-color: rgba(255,255,255,0.25); }
    .thumb { outline: none; }
    .thumb:focus-visible .frame { outline-color: rgba(255,255,255,0.5); }
    .thumb[data-current] .num { color: #fff; }
    .thumb[data-current] .frame { outline-color: #D97757; }
    .thumb[data-dragging] { opacity: 0.35; }
    .thumb::before {
      content: '';
      position: absolute;
      left: 24px;
      right: 0;
      height: 3px;
      border-radius: 2px;
      background: #D97757;
      opacity: 0;
      pointer-events: none;
    }
    .thumb[data-drop="before"]::before { top: -8px; opacity: 1; }
    .thumb[data-drop="after"]::before { bottom: -8px; opacity: 1; }
    .thumb[data-skip] .frame { opacity: 0.35; }
    .thumb[data-skip] .frame::after {
      content: 'Skipped';
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.45);
      color: #fff;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.04em;
    }

    .ctxmenu {
      position: fixed;
      min-width: 150px;
      padding: 4px;
      background: #242424;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 7px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.45);
      z-index: 2147483100;
      display: none;
      font-size: 12px;
    }
    .ctxmenu[data-open] { display: block; }
    .ctxmenu button {
      display: block;
      width: 100%;
      appearance: none;
      border: 0;
      background: transparent;
      color: #e8e8e8;
      font: inherit;
      text-align: left;
      padding: 6px 10px;
      border-radius: 4px;
      cursor: pointer;
    }
    .ctxmenu button:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
    .ctxmenu button:disabled { opacity: 0.35; cursor: default; }
    .ctxmenu hr {
      border: 0;
      border-top: 1px solid rgba(255,255,255,0.1);
      margin: 4px 2px;
    }

    .rail-resize {
      position: fixed;
      left: calc(var(--deck-rail-w, 188px) - 3px);
      top: 0;
      bottom: 0;
      width: 6px;
      cursor: col-resize;
      z-index: 2147482600;
      touch-action: none;
    }
    .rail-resize:hover,
    .rail-resize[data-dragging] { background: rgba(255,255,255,0.12); }
    :host([no-rail]) .rail-resize,
    :host([noscale]) .rail-resize,
    .rail[data-presenting] + .rail-resize,
    .rail[data-user-hidden] + .rail-resize { display: none; }

    /* Delete-confirm popup — matches the SPA's ConfirmDialog layout
       (title + message body, depressed footer with Cancel / Delete). */
    .confirm-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 2147483200;
      display: none;
      align-items: center;
      justify-content: center;
    }
    .confirm-backdrop[data-open] { display: flex; }
    .confirm {
      width: 320px;
      max-width: calc(100vw - 32px);
      background: #2a2a2a;
      color: #e8e8e8;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.5);
      overflow: hidden;
      font-family: inherit;
      animation: deck-confirm-in 0.18s ease;
    }
    @keyframes deck-confirm-in {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    .confirm .body { padding: 20px 20px 16px; }
    .confirm .title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .confirm .msg { font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.65); }
    .confirm .footer {
      padding: 14px 20px;
      background: #1f1f1f;
      border-top: 1px solid rgba(255,255,255,0.08);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .confirm button {
      appearance: none;
      font: inherit;
      font-size: 13px;
      font-weight: 500;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
    }
    .confirm .cancel {
      background: transparent;
      border: 0;
      color: rgba(255,255,255,0.8);
    }
    .confirm .cancel:hover { background: rgba(255,255,255,0.08); }
    .confirm .danger {
      background: #c96442;
      border: 1px solid rgba(0,0,0,0.15);
      color: #fff;
      box-shadow: 0 1px 3px rgba(166,50,68,0.3), 0 2px 6px rgba(166,50,68,0.18);
    }
    .confirm .danger:hover { background: #b5563a; }

    /* ── Print: one page per slide, no chrome ────────────────────────────
       The screen layout stacks every slide at inset:0 inside a scaled
       canvas; for print we want them in document flow at the authored
       design size so the browser paginates one slide per sheet. The
       @page size is set from the width/height attributes via the inline
       <style id="deck-stage-print-page"> that connectedCallback injects
       into <head> (the @page at-rule has no effect inside shadow DOM). */
    @media print {
      :host {
        position: static;
        inset: auto;
        background: none;
        overflow: visible;
        color: inherit;
      }
      .stage { position: static; display: block; }
      .canvas {
        transform: none !important;
        width: auto !important;
        height: auto !important;
        background: none;
        will-change: auto;
      }
      ::slotted(*) {
        position: relative !important;
        inset: auto !important;
        width: var(--deck-design-w) !important;
        height: var(--deck-design-h) !important;
        box-sizing: border-box !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto;
        break-after: page;
        page-break-after: always;
        break-inside: avoid;
        overflow: hidden;
      }
      /* :last-child alone isn't enough once data-deck-skip hides the
         trailing slide(s) — the last *visible* slide still carries
         break-after:page and prints a blank sheet. _markLastVisible()
         maintains data-deck-last-visible on the last non-skipped slide. */
      ::slotted(*:last-child),
      ::slotted([data-deck-last-visible]) {
        break-after: auto;
        page-break-after: auto;
      }
      ::slotted([data-deck-skip]) { display: none !important; }
      .overlay, .rail, .rail-resize, .ctxmenu, .confirm-backdrop { display: none !important; }
    }
  `;
  class DeckStage extends HTMLElement {
    static get observedAttributes() {
      return ['width', 'height', 'noscale', 'no-rail'];
    }
    constructor() {
      super();
      this._root = this.attachShadow({
        mode: 'open'
      });
      this._index = 0;
      this._slides = [];
      this._notes = [];
      this._hideTimer = null;
      this._mouseIdleTimer = null;
      this._menuIndex = -1;
      this._onKey = this._onKey.bind(this);
      this._onResize = this._onResize.bind(this);
      this._onSlotChange = this._onSlotChange.bind(this);
      this._onMouseMove = this._onMouseMove.bind(this);
      this._onTap = this._onTap.bind(this);
      this._onMessage = this._onMessage.bind(this);
      // Capture-phase close so a click anywhere dismisses the menu, but
      // ignore clicks that land inside the menu itself — otherwise the
      // capture handler runs before the menu's own (bubble) handler and
      // clears _menuIndex out from under it.
      this._onDocClick = e => {
        if (this._menu && e.composedPath && e.composedPath().includes(this._menu)) return;
        this._closeMenu();
      };
    }
    get designWidth() {
      return parseInt(this.getAttribute('width'), 10) || DESIGN_W_DEFAULT;
    }
    get designHeight() {
      return parseInt(this.getAttribute('height'), 10) || DESIGN_H_DEFAULT;
    }
    connectedCallback() {
      // Presenter-view popup loads deckUrl?_snthumb=...#N for its prev/cur/
      // next thumbnails — the rail has no business rendering inside those
      // (wrong scale, and it offsets the stage so the thumb shows a gutter).
      if (/[?&]_snthumb=/.test(location.search)) this.setAttribute('no-rail', '');
      this._render();
      this._loadNotes();
      this._syncPrintPageRule();
      window.addEventListener('keydown', this._onKey);
      window.addEventListener('resize', this._onResize);
      window.addEventListener('mousemove', this._onMouseMove, {
        passive: true
      });
      window.addEventListener('message', this._onMessage);
      window.addEventListener('click', this._onDocClick, true);
      this.addEventListener('click', this._onTap);
      // Print lays every slide out as its own page, so [data-deck-active]-
      // gated entrance styles need the attribute on every slide (not just
      // the current one) or their content prints at the hidden base style.
      // The transient freeze style lands BEFORE the attributes so any
      // attribute-keyed transition fires at 0s (changing transition-
      // duration after a transition has started doesn't affect it).
      this._onBeforePrint = () => {
        if (this._freezeStyle) this._freezeStyle.remove();
        this._freezeStyle = document.createElement('style');
        this._freezeStyle.textContent = '*,*::before,*::after{transition-duration:0s !important}';
        document.head.appendChild(this._freezeStyle);
        this._slides.forEach(s => s.setAttribute('data-deck-active', ''));
      };
      this._onAfterPrint = () => {
        this._applyIndex({
          showOverlay: false,
          broadcast: false
        });
        if (this._freezeStyle) {
          this._freezeStyle.remove();
          this._freezeStyle = null;
        }
      };
      window.addEventListener('beforeprint', this._onBeforePrint);
      window.addEventListener('afterprint', this._onAfterPrint);
      // Initial collection + layout happens via slotchange, which fires on mount.
      this._enableRail();
      // Hold the stage hidden until webfonts are ready so the first visible
      // paint has the deck's real typography — the :not(:defined) guard in
      // the page HTML only covers custom-element upgrade, not font load.
      // Capped so a 404'd font URL can't blank the deck indefinitely.
      this.setAttribute('data-fonts-pending', '');
      const reveal = () => this.removeAttribute('data-fonts-pending');
      // rAF first: fonts.ready is a pre-resolved promise until layout has
      // resolved the slotted text's font-family and pushed a FontFace into
      // 'loading'. Reading it here in connectedCallback (parse-time) would
      // settle the race in a microtask before any font fetch starts.
      requestAnimationFrame(() => {
        Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 2000))]).then(reveal, reveal);
      });
    }
    _enableRail() {
      // Idempotent — older host builds still post __omelette_rail_enabled.
      // no-rail guard keeps the observers/stylesheet walk off the cheap path
      // for presenter-popup thumbnail iframes (up to 9 per view).
      if (this._railEnabled || this.hasAttribute('no-rail')) return;
      this._railEnabled = true;
      // Per-viewer preference — restored alongside rail width. Default on;
      // only a stored '0' (from the TweaksPanel toggle) hides it.
      this._railVisible = true;
      try {
        if (localStorage.getItem('deck-stage.railVisible') === '0') this._railVisible = false;
      } catch (e) {}
      // Live thumbnail updates: watch the light-DOM slides for content
      // edits and re-clone just the affected thumb(s), debounced. Ignore
      // the data-deck-* / data-screen-label / data-om-validate attributes
      // this component itself writes so nav and skip don't trigger
      // spurious refreshes.
      const OWN_ATTRS = /^data-(deck-|screen-label$|om-validate$)/;
      this._liveDirty = new Set();
      this._liveObserver = new MutationObserver(records => {
        for (const r of records) {
          if (r.type === 'attributes' && OWN_ATTRS.test(r.attributeName || '')) continue;
          let n = r.target;
          while (n && n.parentElement !== this) n = n.parentElement;
          if (n && this._slideSet && this._slideSet.has(n)) this._liveDirty.add(n);
        }
        if (this._liveDirty.size && !this._liveTimer) {
          this._liveTimer = setTimeout(() => {
            this._liveTimer = null;
            this._liveDirty.forEach(s => this._refreshThumb(s));
            this._liveDirty.clear();
          }, 200);
        }
      });
      this._liveObserver.observe(this, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true
      });
      // Lazy thumbnail materialization — clone the slide only when its
      // frame scrolls into (or near) the rail viewport. rootMargin gives
      // ~4 thumbs of pre-load so fast scrolling doesn't flash blanks.
      this._railObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting && e.target.__deckThumb) {
            this._materialize(e.target.__deckThumb);
          }
        });
      }, {
        root: this._rail,
        rootMargin: '400px 0px'
      });
      // Tweaks typically change CSS vars / attrs OUTSIDE <deck-stage>
      // (on <html>, <body>, a wrapper div, or a <style> tag), which
      // _liveObserver can't see. Re-snapshot author CSS (constructable
      // sheet is shared by reference, so one replaceSync updates every
      // thumb shadow root) and re-sync each thumb host's attrs + custom
      // properties. In-slide DOM mutations are _liveObserver's job.
      // Debounced so slider drags don't thrash.
      this._onTweakChange = () => {
        clearTimeout(this._tweakTimer);
        this._tweakTimer = setTimeout(() => {
          this._snapshotAuthorCss();
          // One getComputedStyle for the whole batch — each
          // getPropertyValue read below reuses the same computed style
          // as long as nothing invalidates layout between thumbs.
          const cs = getComputedStyle(this);
          (this._thumbs || []).forEach(t => {
            if (t.host) this._syncThumbHostAttrs(t.host, cs);
          });
        }, 120);
      };
      window.addEventListener('tweakchange', this._onTweakChange);
      this._snapshotAuthorCss();
      // Build the rail now that it's enabled — slotchange already fired,
      // so _renderRail's early-return skipped the initial build.
      this._syncRailHidden();
      this._renderRail();
      this._fit();
    }

    /** Snapshot document stylesheets into a constructable sheet that each
     *  thumbnail's nested shadow root adopts — so author CSS styles the
     *  cloned slide content without touching this component's chrome.
     *  Cross-origin sheets throw on .cssRules — skip them. Re-callable:
     *  the existing constructable sheet is reused via replaceSync so every
     *  already-adopted shadow root picks up the fresh CSS without re-adopt. */
    _snapshotAuthorCss() {
      // :root in an adopted sheet inside a shadow root matches nothing
      // (only the document root qualifies), so author rules like
      // `:root[data-voice="modern"] .serif` never reach the clones.
      // Rewrite :root → :host and mirror <html>'s data-*/class/lang onto
      // each thumb host (see _syncThumbHostAttrs) so the same selectors
      // match inside the thumbnail's shadow tree.
      const authorCss = Array.from(document.styleSheets).map(sh => {
        try {
          return Array.from(sh.cssRules).map(r => r.cssText).join('\n');
        } catch (e) {
          return '';
        }
      }).join('\n')
      // The shadow host is featureless outside the functional :host(...)
      // form, so any compound on :root — [attr], .class, #id, :pseudo —
      // must become :host(<compound>) not :host<compound>. Same for the
      // html type selector (Tailwind class-strategy dark mode emits
      // html.dark; Pico uses html[data-theme]), which has nothing to
      // match inside the thumb's shadow tree.
      .replace(/:root((?:\[[^\]]*\]|[.#][-\w]+|:[-\w]+(?:\([^)]*\))?)+)/g, ':host($1)').replace(/:root\b/g, ':host').replace(/(^|[\s,>~+(}])html((?:\[[^\]]*\]|[.#][-\w]+|:[-\w]+(?:\([^)]*\))?)+)(?![-\w])/g, '$1:host($2)').replace(/(^|[\s,>~+(}])html(?![-\w])/g, '$1:host');
      // Every custom property the author references. _syncThumbHostAttrs
      // mirrors each one's *computed* value at <deck-stage> onto the
      // thumb host so the live value wins over the :host default above
      // regardless of which ancestor the tweak wrote to (<html>, <body>,
      // a wrapper div, or the deck-stage element itself all inherit
      // down to getComputedStyle(this)).
      this._authorVars = new Set(authorCss.match(/--[\w-]+/g) || []);
      try {
        if (!this._adoptedSheet) this._adoptedSheet = new CSSStyleSheet();
        this._adoptedSheet.replaceSync(authorCss);
      } catch (e) {
        this._adoptedSheet = null;
        this._authorCss = authorCss;
      }
    }
    _syncThumbHostAttrs(host, cs) {
      const de = document.documentElement;
      // setAttribute overwrites but can't delete — an attr removed from
      // <html> (toggleAttribute off, classList emptied) would linger on
      // the host and :host([data-*]) / :host(.foo) rules would keep
      // matching. Remove stale mirrored attrs first; iterate backward
      // because removeAttribute mutates the live NamedNodeMap.
      for (let i = host.attributes.length - 1; i >= 0; i--) {
        const n = host.attributes[i].name;
        if ((n.startsWith('data-') || n === 'class' || n === 'lang') && !de.hasAttribute(n)) {
          host.removeAttribute(n);
        }
      }
      for (const a of de.attributes) {
        if (a.name.startsWith('data-') || a.name === 'class' || a.name === 'lang') {
          host.setAttribute(a.name, a.value);
        }
      }
      // The :root→:host rewrite in _snapshotAuthorCss pins each custom
      // property to its stylesheet default on the thumb host, shadowing
      // the live value that would otherwise inherit. Tweaks can write the
      // live value on any ancestor — <html>, <body>, a wrapper div, the
      // deck-stage element — so read it as the *computed* value at
      // <deck-stage> (which sees the whole inheritance chain) rather than
      // trying to guess which element the author wrote to. Inline on the
      // host beats the :host{} rule. remove-stale covers vars dropped
      // from the stylesheet between snapshots.
      const vars = this._authorVars || new Set();
      for (let i = host.style.length - 1; i >= 0; i--) {
        const p = host.style[i];
        if (p.startsWith('--') && !vars.has(p)) host.style.removeProperty(p);
      }
      const live = cs || getComputedStyle(this);
      vars.forEach(p => {
        const v = live.getPropertyValue(p);
        if (v) host.style.setProperty(p, v.trim());else host.style.removeProperty(p);
      });
    }
    disconnectedCallback() {
      window.removeEventListener('keydown', this._onKey);
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('mousemove', this._onMouseMove);
      window.removeEventListener('message', this._onMessage);
      window.removeEventListener('click', this._onDocClick, true);
      window.removeEventListener('beforeprint', this._onBeforePrint);
      window.removeEventListener('afterprint', this._onAfterPrint);
      if (this._freezeStyle) {
        this._freezeStyle.remove();
        this._freezeStyle = null;
      }
      this.removeEventListener('click', this._onTap);
      if (this._hideTimer) clearTimeout(this._hideTimer);
      if (this._mouseIdleTimer) clearTimeout(this._mouseIdleTimer);
      if (this._liveTimer) clearTimeout(this._liveTimer);
      if (this._tweakTimer) clearTimeout(this._tweakTimer);
      if (this._railAnimTimer) clearTimeout(this._railAnimTimer);
      if (this._scaleRaf) cancelAnimationFrame(this._scaleRaf);
      if (this._liveObserver) this._liveObserver.disconnect();
      if (this._railObserver) this._railObserver.disconnect();
      if (this._onTweakChange) window.removeEventListener('tweakchange', this._onTweakChange);
    }
    attributeChangedCallback() {
      if (this._canvas) {
        this._canvas.style.width = this.designWidth + 'px';
        this._canvas.style.height = this.designHeight + 'px';
        this._canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
        this._canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
        if (this._rail) {
          this._rail.style.setProperty('--deck-aspect', this.designWidth + '/' + this.designHeight);
        }
        this._fit();
        this._scaleThumbs();
        this._syncPrintPageRule();
      }
    }
    _render() {
      const style = document.createElement('style');
      style.textContent = stylesheet;
      const stage = document.createElement('div');
      stage.className = 'stage';
      const canvas = document.createElement('div');
      canvas.className = 'canvas';
      canvas.style.width = this.designWidth + 'px';
      canvas.style.height = this.designHeight + 'px';
      canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
      canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
      const slot = document.createElement('slot');
      slot.addEventListener('slotchange', this._onSlotChange);
      canvas.appendChild(slot);
      stage.appendChild(canvas);

      // Overlay: compact, solid black, with clickable controls.
      const overlay = document.createElement('div');
      overlay.className = 'overlay export-hidden';
      overlay.setAttribute('role', 'toolbar');
      overlay.setAttribute('aria-label', 'Deck controls');
      overlay.setAttribute('data-omelette-chrome', '');
      overlay.innerHTML = `
        <button class="btn prev" type="button" aria-label="Previous slide" title="Previous (←)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>
        </button>
        <span class="count" aria-live="polite"><span class="current">1</span><span class="sep">/</span><span class="total">1</span></span>
        <button class="btn next" type="button" aria-label="Next slide" title="Next (→)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
        </button>
        <span class="divider"></span>
        <button class="btn reset" type="button" aria-label="Reset to first slide" title="Reset (R)">Reset<span class="kbd">R</span></button>
      `;
      overlay.querySelector('.prev').addEventListener('click', () => this._advance(-1, 'click'));
      overlay.querySelector('.next').addEventListener('click', () => this._advance(1, 'click'));
      overlay.querySelector('.reset').addEventListener('click', () => this._go(0, 'click'));

      // Thumbnail rail + context menu. Thumbnails are populated in
      // _renderRail() after _collectSlides().
      const rail = document.createElement('div');
      rail.className = 'rail export-hidden';
      rail.setAttribute('data-omelette-chrome', '');
      rail.style.setProperty('--deck-aspect', this.designWidth + '/' + this.designHeight);
      // Edge auto-scroll while dragging a thumb near the rail's top/bottom
      // so off-screen drop targets are reachable. Native dragover fires
      // continuously while the pointer is stationary, so a per-event nudge
      // (ramped by edge proximity) is enough — no rAF loop needed.
      rail.addEventListener('dragover', e => {
        if (this._dragFrom == null) return;
        const r = rail.getBoundingClientRect();
        const EDGE = 40;
        const dt = e.clientY - r.top;
        const db = r.bottom - e.clientY;
        if (dt < EDGE) rail.scrollTop -= Math.ceil((EDGE - dt) / 3);else if (db < EDGE) rail.scrollTop += Math.ceil((EDGE - db) / 3);
      });
      const menu = document.createElement('div');
      menu.className = 'ctxmenu export-hidden';
      menu.setAttribute('data-omelette-chrome', '');
      menu.innerHTML = `
        <button type="button" data-act="skip">Skip slide</button>
        <button type="button" data-act="up">Move up</button>
        <button type="button" data-act="down">Move down</button>
        <button type="button" data-act="duplicate">Duplicate slide</button>
        <hr>
        <button type="button" data-act="delete">Delete slide</button>
      `;
      menu.addEventListener('click', e => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (!act) return;
        const i = this._menuIndex;
        this._closeMenu();
        if (act === 'skip') this._toggleSkip(i);else if (act === 'up') this._moveSlide(i, i - 1);else if (act === 'down') this._moveSlide(i, i + 1);else if (act === 'duplicate') this._duplicateSlide(i);else if (act === 'delete') this._openConfirm(i);
      });
      menu.addEventListener('contextmenu', e => e.preventDefault());

      // Rail resize handle — drag to set --deck-rail-w, persisted to
      // localStorage so the width survives reloads.
      const resize = document.createElement('div');
      resize.className = 'rail-resize export-hidden';
      resize.setAttribute('data-omelette-chrome', '');
      resize.addEventListener('pointerdown', e => {
        e.preventDefault();
        resize.setPointerCapture(e.pointerId);
        resize.setAttribute('data-dragging', '');
        const move = ev => this._setRailWidth(ev.clientX);
        const up = () => {
          resize.removeEventListener('pointermove', move);
          resize.removeEventListener('pointerup', up);
          resize.removeEventListener('pointercancel', up);
          resize.removeAttribute('data-dragging');
          try {
            localStorage.setItem('deck-stage.railWidth', String(this._railPx));
          } catch (err) {}
        };
        resize.addEventListener('pointermove', move);
        resize.addEventListener('pointerup', up);
        resize.addEventListener('pointercancel', up);
      });

      // Delete-confirm dialog — mirrors the SPA's ConfirmDialog layout.
      const confirm = document.createElement('div');
      confirm.className = 'confirm-backdrop export-hidden';
      confirm.setAttribute('data-omelette-chrome', '');
      confirm.innerHTML = `
        <div class="confirm" role="dialog" aria-modal="true">
          <div class="body">
            <div class="title">Delete slide?</div>
            <div class="msg">This slide will be removed from the deck.</div>
          </div>
          <div class="footer">
            <button type="button" class="cancel">Cancel</button>
            <button type="button" class="danger">Delete</button>
          </div>
        </div>
      `;
      confirm.addEventListener('click', e => {
        if (e.target === confirm) this._closeConfirm();
      });
      confirm.querySelector('.cancel').addEventListener('click', () => this._closeConfirm());
      confirm.querySelector('.danger').addEventListener('click', () => {
        const i = this._confirmIndex;
        this._closeConfirm();
        this._deleteSlide(i);
      });
      this._root.append(style, rail, resize, stage, overlay, menu, confirm);
      this._canvas = canvas;
      this._stage = stage;
      this._slot = slot;
      this._overlay = overlay;
      this._rail = rail;
      this._resize = resize;
      this._menu = menu;
      this._confirm = confirm;
      this._countEl = overlay.querySelector('.current');
      this._totalEl = overlay.querySelector('.total');

      // Restore persisted rail width.
      let rw = 188;
      try {
        const s = localStorage.getItem('deck-stage.railWidth');
        if (s) rw = parseInt(s, 10) || rw;
      } catch (err) {}
      this._setRailWidth(rw);
      this._syncRailHidden();
    }
    _setRailWidth(px) {
      const w = Math.max(120, Math.min(360, Math.round(px)));
      this._railPx = w;
      this.style.setProperty('--deck-rail-w', w + 'px');
      this._fit();
      // _scaleThumbs forces a sync layout (frame.offsetWidth) then writes
      // N transforms. During a resize drag this runs per-pointermove;
      // coalesce to one per frame.
      if (!this._scaleRaf) {
        this._scaleRaf = requestAnimationFrame(() => {
          this._scaleRaf = null;
          this._scaleThumbs();
        });
      }
    }

    /** @page must live in the document stylesheet — it's a no-op inside
     *  shadow DOM. Inject/update a single <head> style tag so the print
     *  sheet matches the design size and Save-as-PDF yields one slide per
     *  page with no margins. */
    _syncPrintPageRule() {
      const id = 'deck-stage-print-page';
      let tag = document.getElementById(id);
      if (!tag) {
        tag = document.createElement('style');
        tag.id = id;
        document.head.appendChild(tag);
      }
      tag.textContent = '@page { size: ' + this.designWidth + 'px ' + this.designHeight + 'px; margin: 0; } ' + '@media print { html, body { margin: 0 !important; padding: 0 !important; background: none !important; overflow: visible !important; height: auto !important; } ' + '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; } ' +
      // Jump authored animations/transitions to their end state so print
      // never captures mid-entrance — pairs with the beforeprint handler
      // in connectedCallback that sets data-deck-active on every slide.
      '*, *::before, *::after { animation-delay: -99s !important; animation-duration: .001s !important; ' + 'animation-iteration-count: 1 !important; animation-fill-mode: both !important; ' + 'animation-play-state: running !important; transition-duration: 0s !important; } }';
    }
    _onSlotChange() {
      // Rail mutations (delete/move/duplicate) already reconcile synchronously and
      // emit slidechange with reason 'api'; skip the async slotchange that
      // would otherwise re-broadcast with reason 'init'.
      if (this._squelchSlotChange) {
        this._squelchSlotChange = false;
        return;
      }
      this._collectSlides();
      this._restoreIndex();
      this._applyIndex({
        showOverlay: false,
        broadcast: true,
        reason: 'init'
      });
      this._fit();
    }
    _collectSlides() {
      const assigned = this._slot.assignedElements({
        flatten: true
      });
      this._slides = assigned.filter(el => {
        // Skip template/style/script nodes even if someone slots them.
        const tag = el.tagName;
        return tag !== 'TEMPLATE' && tag !== 'SCRIPT' && tag !== 'STYLE';
      });
      this._slideSet = new Set(this._slides);
      this._slides.forEach((slide, i) => {
        const n = i + 1;
        slide.setAttribute('data-screen-label', `${pad2(n)} ${getSlideLabel(slide)}`);

        // Validation attribute for comment flow / auto-checks.
        if (!slide.hasAttribute('data-om-validate')) {
          slide.setAttribute('data-om-validate', VALIDATE_ATTR);
        }
        slide.setAttribute('data-deck-slide', String(i));
      });
      if (this._totalEl) this._totalEl.textContent = String(this._slides.length || 1);
      if (this._index >= this._slides.length) this._index = Math.max(0, this._slides.length - 1);
      this._markLastVisible();
      this._renderRail();
    }

    /** Tag the last non-skipped slide so print CSS can drop its
     *  break-after (see the @media print comment above — :last-child
     *  alone matches a hidden skipped slide). */
    _markLastVisible() {
      let last = null;
      this._slides.forEach(s => {
        s.removeAttribute('data-deck-last-visible');
        if (!s.hasAttribute('data-deck-skip')) last = s;
      });
      if (last) last.setAttribute('data-deck-last-visible', '');
    }
    _loadNotes() {
      const tag = document.getElementById('speaker-notes');
      if (!tag) {
        this._notes = [];
        return;
      }
      try {
        const parsed = JSON.parse(tag.textContent || '[]');
        if (Array.isArray(parsed)) this._notes = parsed;
      } catch (e) {
        console.warn('[deck-stage] Failed to parse #speaker-notes JSON:', e);
        this._notes = [];
      }
    }
    _restoreIndex() {
      // The host's ?slide= param is delivered as a #<int> hash (1-indexed) on
      // the iframe src. No hash → slide 1; the deck itself keeps no position
      // state across loads.
      const h = (location.hash || '').match(/^#(\d+)$/);
      if (h) {
        const n = parseInt(h[1], 10) - 1;
        if (n >= 0 && n < this._slides.length) this._index = n;
      }
    }
    _applyIndex({
      showOverlay = true,
      broadcast = true,
      reason = 'init'
    } = {}) {
      if (!this._slides.length) return;
      const prev = this._prevIndex == null ? -1 : this._prevIndex;
      const curr = this._index;
      // Keep the iframe's own hash in sync so an in-iframe location.reload()
      // (reload banner path in viewer-handle.ts) lands on the current slide,
      // not the stale deep-link hash from initial load.
      try {
        history.replaceState(null, '', '#' + (curr + 1));
      } catch (e) {}
      this._slides.forEach((s, i) => {
        if (i === curr) s.setAttribute('data-deck-active', '');else s.removeAttribute('data-deck-active');
      });
      if (this._countEl) this._countEl.textContent = String(curr + 1);
      // Follow-scroll on every navigation (init deep-link, keyboard, click,
      // tap, external goTo) — the only time we *don't* want the rail to
      // track current is after a rail-internal mutation, where _renderRail
      // has already restored the user's scroll position and yanking back to
      // current would undo it.
      this._syncRail(reason !== 'mutation');
      if (broadcast) {
        // (1) Legacy: host-window postMessage for speaker-notes renderers.
        try {
          window.postMessage({
            slideIndexChanged: curr,
            deckTotal: this._slides.length,
            deckSkipped: this._skippedIndices()
          }, '*');
        } catch (e) {}

        // (2) In-page CustomEvent on the <deck-stage> element itself.
        //     Bubbles and composes out of shadow DOM so slide code can listen:
        //       document.querySelector('deck-stage').addEventListener('slidechange', e => {
        //         e.detail.index, e.detail.previousIndex, e.detail.total, e.detail.slide, e.detail.reason
        //       });
        const detail = {
          index: curr,
          previousIndex: prev,
          total: this._slides.length,
          slide: this._slides[curr] || null,
          previousSlide: prev >= 0 ? this._slides[prev] || null : null,
          reason: reason // 'init' | 'keyboard' | 'click' | 'tap' | 'api'
        };
        this.dispatchEvent(new CustomEvent('slidechange', {
          detail,
          bubbles: true,
          composed: true
        }));
      }
      this._prevIndex = curr;
      if (showOverlay) this._flashOverlay();
    }
    _flashOverlay() {
      // Host posts __omelette_presenting while in fullscreen/tab presentation
      // mode — suppress the nav footer entirely (both hover and slide-change
      // flash) so the audience sees clean slides.
      if (!this._overlay || this._presenting) return;
      this._overlay.setAttribute('data-visible', '');
      if (this._hideTimer) clearTimeout(this._hideTimer);
      this._hideTimer = setTimeout(() => {
        this._overlay.removeAttribute('data-visible');
      }, OVERLAY_HIDE_MS);
    }
    _railWidth() {
      // State-based, no offsetWidth: the first _fit() can run before the
      // rail has had layout on some load paths, and a 0 there paints the
      // slide full-width for one frame before the post-slotchange _fit()
      // corrects it.
      if (!this._railEnabled || !this._railVisible || this.hasAttribute('no-rail') || this.hasAttribute('noscale') || this._presenting || this._previewMode || NARROW_MQ.matches) return 0;
      return this._railPx || 0;
    }
    _fit() {
      if (!this._canvas) return;
      const stage = this._canvas.parentElement;
      // PPTX export sets noscale so the DOM capture sees authored-size
      // geometry — the scaled canvas is in shadow DOM, so the exporter's
      // resetTransformSelector can't reach .canvas.style.transform directly.
      if (this.hasAttribute('noscale')) {
        this._canvas.style.transform = 'none';
        if (stage) stage.style.left = '0';
        if (this._overlay) this._overlay.style.marginLeft = '0';
        return;
      }
      const rw = this._railWidth();
      if (stage) stage.style.left = rw + 'px';
      // Overlay is centred on the viewport via left:50% + translate(-50%);
      // marginLeft shifts the centre by rw/2 so it lands in the middle of
      // the [rw, innerWidth] stage region.
      if (this._overlay) this._overlay.style.marginLeft = rw / 2 + 'px';
      const vw = window.innerWidth - rw;
      const vh = window.innerHeight;
      const s = Math.min(vw / this.designWidth, vh / this.designHeight);
      this._canvas.style.transform = `scale(${s})`;
    }
    _onResize() {
      this._fit();
      // Crossing the narrow-viewport breakpoint reveals the rail — rerun the
      // thumbnail scale the same way _setRailWidth does.
      if (!this._scaleRaf) {
        this._scaleRaf = requestAnimationFrame(() => {
          this._scaleRaf = null;
          this._scaleThumbs();
        });
      }
    }
    _onMouseMove() {
      // Keep overlay visible while mouse moves; hide after idle.
      this._flashOverlay();
    }
    _onMessage(e) {
      const d = e.data;
      if (d && typeof d.__omelette_presenting === 'boolean') {
        this._presenting = d.__omelette_presenting;
        if (this._presenting && this._overlay) {
          this._overlay.removeAttribute('data-visible');
          if (this._hideTimer) clearTimeout(this._hideTimer);
        }
        this._syncRailHidden();
        this._closeMenu();
        this._closeConfirm();
        this._fit();
        this._scaleThumbs();
      }
      // Host's Preview segment (ViewerMode='none'): the rail's drag-reorder /
      // right-click skip-delete affordances are editing chrome, so hide it
      // while the user is just looking at the deck. Same hard-hide path as
      // presenting; independent of the user's _railVisible preference so
      // returning to Edit restores whatever they had.
      if (d && typeof d.__omelette_preview_mode === 'boolean') {
        if (d.__omelette_preview_mode === this._previewMode) return;
        this._previewMode = d.__omelette_preview_mode;
        this._syncRailHidden();
        this._closeMenu();
        this._closeConfirm();
        this._fit();
        this._scaleThumbs();
      }
      // Per-viewer show/hide, driven by the TweaksPanel's auto-injected
      // "Thumbnail rail" toggle (or any author script). Independent of
      // whether the Tweaks panel itself is open — closing the panel
      // doesn't change rail visibility. Persists alongside rail width.
      if (d && d.type === '__deck_rail_visible' && typeof d.on === 'boolean') {
        if (d.on === this._railVisible) return;
        this._railVisible = d.on;
        try {
          localStorage.setItem('deck-stage.railVisible', d.on ? '1' : '0');
        } catch (e) {}
        // Arm the transition, commit it, then flip state — otherwise the
        // browser coalesces both writes and nothing animates on show.
        this.setAttribute('data-rail-anim', '');
        void (this._rail && this._rail.offsetHeight);
        this._syncRailHidden();
        this._fit();
        this._scaleThumbs();
        clearTimeout(this._railAnimTimer);
        this._railAnimTimer = setTimeout(() => this.removeAttribute('data-rail-anim'), 220);
      }
      if (d && d.type === '__omelette_rail_enabled') this._enableRail();
    }
    _syncRailHidden() {
      if (!this._rail) return;
      // data-presenting is the hard hide (display:none) for flag-off,
      // presentation mode, and the host's Preview segment — instant, no
      // transition. data-user-hidden is the soft hide (translateX(-100%))
      // for the viewer's rail toggle, so show/hide slides under
      // :host([data-rail-anim]).
      const hard = !this._railEnabled || this._presenting || this._previewMode;
      if (hard) this._rail.setAttribute('data-presenting', '');else this._rail.removeAttribute('data-presenting');
      if (!this._railVisible) this._rail.setAttribute('data-user-hidden', '');else this._rail.removeAttribute('data-user-hidden');
      // translateX hide leaves thumbs (tabIndex=0) in the tab order —
      // inert keeps them unfocusable while the rail is off-screen.
      this._rail.inert = hard || !this._railVisible;
    }
    _onTap(e) {
      // Touch-only — keyboard + the overlay toolbar cover nav on desktop.
      if (FINE_POINTER_MQ.matches) return;
      // Only taps that land on the stage (slide content or letterbox); the
      // overlay / rail / menus are siblings with their own click handlers.
      const path = e.composedPath();
      if (!this._stage || !path.includes(this._stage)) return;
      // Let interactive slide content keep the tap. composedPath (not
      // e.target.closest) so we see through open shadow roots — a <button>
      // inside a slide-authored custom element retargets e.target to the
      // host but still appears in the composed path.
      if (e.defaultPrevented) return;
      for (const n of path) {
        if (n === this._stage) break;
        if (n.matches && n.matches(INTERACTIVE_SEL)) return;
      }
      e.preventDefault();
      const rw = this._railWidth();
      const mid = rw + (window.innerWidth - rw) / 2;
      this._advance(e.clientX < mid ? -1 : 1, 'tap');
    }
    _onKey(e) {
      // Ignore when the user is typing.
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      // Confirm dialog swallows nav keys while open; Escape cancels. Enter
      // is left to the focused button's native activation so Tab→Cancel
      // →Enter activates Cancel, not the window-level confirm path.
      if (this._confirm && this._confirm.hasAttribute('data-open')) {
        if (e.key === 'Escape') {
          this._closeConfirm();
          e.preventDefault();
        }
        return;
      }
      if (e.key === 'Escape' && this._menu && this._menu.hasAttribute('data-open')) {
        this._closeMenu();
        e.preventDefault();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      let handled = true;
      if (key === 'ArrowRight' || key === 'PageDown' || key === ' ' || key === 'Spacebar') {
        this._advance(1, 'keyboard');
      } else if (key === 'ArrowLeft' || key === 'PageUp') {
        this._advance(-1, 'keyboard');
      } else if (key === 'Home') {
        this._go(0, 'keyboard');
      } else if (key === 'End') {
        this._go(this._slides.length - 1, 'keyboard');
      } else if (key === 'r' || key === 'R') {
        this._go(0, 'keyboard');
      } else if (/^[0-9]$/.test(key)) {
        // 1..9 jump to that slide; 0 jumps to 10.
        const n = key === '0' ? 9 : parseInt(key, 10) - 1;
        if (n < this._slides.length) this._go(n, 'keyboard');
      } else {
        handled = false;
      }
      if (handled) {
        e.preventDefault();
        this._flashOverlay();
      }
    }
    _go(i, reason = 'api') {
      if (!this._slides.length) return;
      const clamped = Math.max(0, Math.min(this._slides.length - 1, i));
      if (clamped === this._index) {
        this._flashOverlay();
        return;
      }
      this._index = clamped;
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason
      });
    }

    /** Step forward/back skipping any slide marked data-deck-skip. Falls
     *  back to _go's clamp-at-ends behaviour (flash overlay) when there's
     *  nothing further in that direction. */
    _advance(dir, reason) {
      if (!this._slides.length) return;
      let i = this._index + dir;
      while (i >= 0 && i < this._slides.length && this._slides[i].hasAttribute('data-deck-skip')) {
        i += dir;
      }
      if (i < 0 || i >= this._slides.length) {
        this._flashOverlay();
        return;
      }
      this._go(i, reason);
    }

    // ── Thumbnail rail ────────────────────────────────────────────────────
    //
    // Thumbs are keyed by slide element and reused across _renderRail()
    // calls, so a reorder/delete is an O(changed) DOM shuffle instead of an
    // O(N) teardown-and-re-clone. Each thumb starts as a lightweight shell
    // (num + empty frame); the clone is materialized lazily by an
    // IntersectionObserver when the frame scrolls into (or near) view, so
    // only visible-ish slides pay the clone + image-decode cost.

    _renderRail() {
      if (!this._rail || !this._railEnabled) {
        this._thumbs = [];
        return;
      }
      // FLIP: record each *materialized* thumb's top before the reconcile.
      // Off-screen (non-materialized) thumbs don't need the animation and
      // skipping their getBoundingClientRect saves a forced layout per
      // off-screen thumb on large decks.
      const prevTops = new Map();
      (this._thumbs || []).forEach(({
        thumb,
        slide,
        host
      }) => {
        if (host) prevTops.set(slide, thumb.getBoundingClientRect().top);
      });
      const st = this._rail.scrollTop;

      // Reconcile: reuse thumbs that already exist for a slide, create
      // shells for new slides, drop thumbs for removed slides.
      const bySlide = new Map();
      (this._thumbs || []).forEach(t => bySlide.set(t.slide, t));
      const next = [];
      this._slides.forEach(slide => {
        let t = bySlide.get(slide);
        if (t) bySlide.delete(slide);else t = this._makeThumb(slide);
        next.push(t);
      });
      // Orphans — slides removed since last render.
      bySlide.forEach(t => {
        if (this._railObserver) this._railObserver.unobserve(t.frame);
        t.thumb.remove();
      });
      // Put thumbs into document order to match _slides. insertBefore on
      // an already-correctly-placed node is a no-op, so this is cheap
      // when nothing moved.
      next.forEach((t, i) => {
        const want = t.thumb;
        const at = this._rail.children[i];
        if (at !== want) this._rail.insertBefore(want, at || null);
        t.i = i;
        t.num.textContent = String(i + 1);
        if (t.slide.hasAttribute('data-deck-skip')) t.thumb.setAttribute('data-skip', '');else t.thumb.removeAttribute('data-skip');
      });
      this._thumbs = next;
      this._rail.scrollTop = st;
      if (prevTops.size) {
        const moved = [];
        this._thumbs.forEach(({
          thumb,
          slide
        }) => {
          const old = prevTops.get(slide);
          if (old == null) return;
          const dy = old - thumb.getBoundingClientRect().top;
          if (Math.abs(dy) < 1) return;
          thumb.style.transition = 'none';
          thumb.style.transform = `translateY(${dy}px)`;
          moved.push(thumb);
        });
        if (moved.length) {
          // Commit the inverted positions before flipping the transition
          // on — otherwise the browser coalesces both style writes and
          // nothing animates.
          void this._rail.offsetHeight;
          moved.forEach(t => {
            t.style.transition = 'transform 180ms cubic-bezier(.2,.7,.3,1)';
            t.style.transform = '';
          });
          setTimeout(() => moved.forEach(t => {
            t.style.transition = '';
          }), 220);
        }
      }
      requestAnimationFrame(() => this._scaleThumbs());
      this._syncRail(false);
    }

    /** Create a lightweight thumb shell for one slide. The clone is
     *  materialized later by the IntersectionObserver. Event handlers
     *  look up the thumb's *current* index (via _thumbs.indexOf) so the
     *  same element can be reused across reorders. */
    _makeThumb(slide) {
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      thumb.tabIndex = 0;
      const num = document.createElement('div');
      num.className = 'num';
      const frame = document.createElement('div');
      frame.className = 'frame';
      thumb.append(num, frame);
      const entry = {
        thumb,
        num,
        frame,
        slide,
        clone: null,
        host: null,
        i: -1
      };
      // entry.i is refreshed on every _renderRail reconcile pass, so
      // handlers read the thumb's current position without an O(N) scan.
      const idx = () => entry.i;
      thumb.addEventListener('click', () => this._go(idx(), 'click'));
      // ↑/↓ step through the rail when a thumb has focus. _go clamps at the
      // ends and _applyIndex→_syncRail scrolls the new current thumb into
      // view; we move focus to it (preventScroll — _syncRail already
      // scrolled) so a held key walks the whole list. stopPropagation keeps
      // this out of the window-level _onKey nav handler.
      thumb.addEventListener('keydown', e => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        e.stopPropagation();
        this._go(idx() + (e.key === 'ArrowDown' ? 1 : -1), 'keyboard');
        const cur = this._thumbs && this._thumbs[this._index];
        if (cur) cur.thumb.focus({
          preventScroll: true
        });
      });
      thumb.addEventListener('contextmenu', e => {
        e.preventDefault();
        this._openMenu(idx(), e.clientX, e.clientY);
      });
      thumb.draggable = true;
      thumb.addEventListener('dragstart', e => {
        this._dragFrom = idx();
        thumb.setAttribute('data-dragging', '');
        e.dataTransfer.effectAllowed = 'move';
        try {
          e.dataTransfer.setData('text/plain', String(this._dragFrom));
        } catch (err) {}
      });
      thumb.addEventListener('dragend', () => {
        thumb.removeAttribute('data-dragging');
        this._clearDrop();
        this._dragFrom = null;
      });
      thumb.addEventListener('dragover', e => {
        if (this._dragFrom == null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const r = thumb.getBoundingClientRect();
        this._setDrop(idx(), e.clientY < r.top + r.height / 2 ? 'before' : 'after');
      });
      thumb.addEventListener('drop', e => {
        if (this._dragFrom == null) return;
        e.preventDefault();
        const i = idx();
        const r = thumb.getBoundingClientRect();
        let to = e.clientY >= r.top + r.height / 2 ? i + 1 : i;
        if (this._dragFrom < to) to--;
        const from = this._dragFrom;
        this._clearDrop();
        this._dragFrom = null;
        if (to !== from) this._moveSlide(from, to);
      });
      if (this._railObserver) this._railObserver.observe(frame);
      frame.__deckThumb = entry;
      return entry;
    }

    /** Lazily build the clone for a thumb that has scrolled into view. */
    _materialize(entry) {
      if (entry.host) return;
      const dw = this.designWidth,
        dh = this.designHeight;
      let clone = entry.slide.cloneNode(true);
      clone.removeAttribute('id');
      clone.removeAttribute('data-deck-active');
      clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      // Neuter heavy media; replace <video> with its poster so the box
      // keeps a visual. <iframe>/<audio> become empty placeholders.
      clone.querySelectorAll('iframe, audio, object, embed').forEach(el => {
        el.removeAttribute('src');
        el.removeAttribute('srcdoc');
        el.removeAttribute('data');
        el.innerHTML = '';
      });
      clone.querySelectorAll('video').forEach(el => {
        if (!el.poster) {
          el.removeAttribute('src');
          el.innerHTML = '';
          return;
        }
        const img = document.createElement('img');
        img.src = el.poster;
        img.alt = '';
        img.style.cssText = el.style.cssText + ';object-fit:cover;width:100%;height:100%;';
        img.className = el.className;
        el.replaceWith(img);
      });
      // Images: defer decode and let the browser pick the smallest
      // srcset candidate for the ~140px thumb. Same-URL clones reuse the
      // slide's decoded bitmap (URL-keyed cache), so the remaining cost
      // is paint/composite — lazy+async keeps that off the main thread.
      clone.querySelectorAll('img').forEach(el => {
        el.loading = 'lazy';
        el.decoding = 'async';
        if (el.srcset) el.sizes = (this._railPx || 188) + 'px';
      });
      // Custom elements inside the slide would have their
      // connectedCallback fire when the clone is appended. Replace them
      // with inert boxes so a component-heavy deck doesn't run N copies
      // of each component's mount logic in the rail. Children are
      // preserved so layout-wrapper elements (<my-column><h2>…</h2>)
      // still show their authored content; the querySelectorAll NodeList
      // is static, so nested custom elements in the moved subtree are
      // still visited on later iterations.
      const neuter = el => {
        const box = document.createElement('div');
        box.style.cssText = (el.getAttribute('style') || '') + ';background:rgba(0,0,0,0.06);border:1px dashed rgba(0,0,0,0.15);';
        box.className = el.className;
        // Preserve theming/i18n hooks so [data-*] / :lang() / [dir]
        // descendant selectors still match the neutered root.
        for (const a of el.attributes) {
          const n = a.name;
          if (n.startsWith('data-') || n.startsWith('aria-') || n === 'lang' || n === 'dir' || n === 'role' || n === 'title') {
            box.setAttribute(n, a.value);
          }
        }
        while (el.firstChild) box.appendChild(el.firstChild);
        return box;
      };
      // querySelectorAll('*') returns descendants only — a custom-element
      // slide root (<my-slide>…</my-slide>) would slip through and upgrade
      // on append. Swap the root first.
      if (clone.tagName.includes('-')) clone = neuter(clone);
      clone.querySelectorAll('*').forEach(el => {
        if (el.tagName.includes('-')) el.replaceWith(neuter(el));
      });
      clone.style.cssText += ';position:absolute;top:0;left:0;transform-origin:0 0;' + 'pointer-events:none;width:' + dw + 'px;height:' + dh + 'px;' + 'box-sizing:border-box;overflow:hidden;visibility:visible;opacity:1;';
      const host = document.createElement('div');
      host.style.cssText = 'position:absolute;inset:0;';
      this._syncThumbHostAttrs(host);
      const sr = host.attachShadow({
        mode: 'open'
      });
      if (this._adoptedSheet) sr.adoptedStyleSheets = [this._adoptedSheet];else {
        const st = document.createElement('style');
        st.textContent = this._authorCss || '';
        sr.appendChild(st);
      }
      sr.appendChild(clone);
      entry.frame.appendChild(host);
      entry.host = host;
      entry.clone = clone;
      if (this._thumbScale) clone.style.transform = 'scale(' + this._thumbScale + ')';
      // Once materialized the IO callback is a no-op early-return —
      // unobserve so scroll doesn't keep firing it.
      if (this._railObserver) this._railObserver.unobserve(entry.frame);
    }

    /** Re-clone a single thumb (live-update path). No-op if the thumb
     *  hasn't been materialized yet — it'll pick up current content when
     *  it scrolls into view. */
    _refreshThumb(slide) {
      const entry = (this._thumbs || []).find(t => t.slide === slide);
      if (!entry || !entry.host) return;
      entry.host.remove();
      entry.host = entry.clone = null;
      this._materialize(entry);
    }
    _scaleThumbs() {
      if (!this._thumbs || !this._thumbs.length) return;
      // Every frame is the same width; if it reads 0 the rail is
      // display:none (noscale / no-rail / presenting / print) — leave the
      // clones as-is and re-run when the rail is revealed.
      const fw = this._thumbs[0].frame.offsetWidth;
      if (!fw) return;
      this._thumbScale = fw / this.designWidth;
      this._thumbs.forEach(({
        clone
      }) => {
        if (clone) clone.style.transform = 'scale(' + this._thumbScale + ')';
      });
    }
    _setDrop(i, where) {
      // dragover fires at pointer-event rate; touch only the previous
      // and new target rather than sweeping all N thumbs.
      const t = this._thumbs && this._thumbs[i];
      if (this._dropOn && this._dropOn !== t) {
        this._dropOn.thumb.removeAttribute('data-drop');
      }
      if (t) t.thumb.setAttribute('data-drop', where);
      this._dropOn = t || null;
    }
    _clearDrop() {
      if (this._dropOn) this._dropOn.thumb.removeAttribute('data-drop');
      this._dropOn = null;
    }
    _syncRail(follow) {
      if (!this._thumbs) return;
      this._thumbs.forEach(({
        thumb
      }, i) => {
        if (i === this._index) {
          thumb.setAttribute('data-current', '');
          if (follow && typeof thumb.scrollIntoView === 'function') {
            thumb.scrollIntoView({
              block: 'nearest'
            });
          }
        } else {
          thumb.removeAttribute('data-current');
        }
      });
    }
    _openMenu(i, x, y) {
      if (!this._menu) return;
      this._menuIndex = i;
      const slide = this._slides[i];
      const skip = slide && slide.hasAttribute('data-deck-skip');
      this._menu.querySelector('[data-act="skip"]').textContent = skip ? 'Unskip slide' : 'Skip slide';
      this._menu.querySelector('[data-act="up"]').disabled = i <= 0;
      this._menu.querySelector('[data-act="down"]').disabled = i >= this._slides.length - 1;
      this._menu.querySelector('[data-act="delete"]').disabled = this._slides.length <= 1;
      // Place, then clamp to viewport after it's measurable.
      this._menu.style.left = x + 'px';
      this._menu.style.top = y + 'px';
      this._menu.setAttribute('data-open', '');
      const r = this._menu.getBoundingClientRect();
      const nx = Math.min(x, window.innerWidth - r.width - 4);
      const ny = Math.min(y, window.innerHeight - r.height - 4);
      this._menu.style.left = Math.max(4, nx) + 'px';
      this._menu.style.top = Math.max(4, ny) + 'px';
    }
    _closeMenu() {
      if (this._menu) this._menu.removeAttribute('data-open');
      this._menuIndex = -1;
    }
    _openConfirm(i) {
      if (!this._confirm) return;
      this._confirmIndex = i;
      this._confirm.querySelector('.title').textContent = 'Delete slide ' + (i + 1) + '?';
      this._confirm.setAttribute('data-open', '');
      const btn = this._confirm.querySelector('.danger');
      if (btn && btn.focus) btn.focus();
    }
    _closeConfirm() {
      if (this._confirm) this._confirm.removeAttribute('data-open');
      this._confirmIndex = -1;
    }
    _emitDeckChange(detail) {
      this.dispatchEvent(new CustomEvent('deckchange', {
        detail,
        bubbles: true,
        composed: true
      }));
    }
    _deleteSlide(i) {
      const slide = this._slides[i];
      if (!slide || this._slides.length <= 1) return;
      const wasCurrent = i === this._index;
      if (i < this._index || wasCurrent && i === this._slides.length - 1) this._index--;
      this._squelchSlotChange = true;
      slide.remove();
      this._emitDeckChange({
        action: 'delete',
        from: i,
        slide
      });
      this._collectSlides();
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason: 'mutation'
      });
    }
    _duplicateSlide(i) {
      const slide = this._slides[i];
      if (!slide) return;
      const copy = slide.cloneNode(true);
      // Strip ids so the document stays valid (no duplicate-id collisions
      // with the original). Same treatment _materialize gives rail clones.
      copy.removeAttribute('id');
      copy.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      // Insert after the original and make the copy active so it's the one
      // on screen. _collectSlides re-derives data-screen-label / data-deck-*
      // attrs, so the cloned values are overwritten.
      this._index = i + 1;
      this._squelchSlotChange = true;
      this.insertBefore(copy, slide.nextSibling);
      this._emitDeckChange({
        action: 'duplicate',
        from: i,
        to: i + 1,
        slide: copy
      });
      this._collectSlides();
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason: 'mutation'
      });
    }
    _toggleSkip(i) {
      const slide = this._slides[i];
      if (!slide) return;
      const on = !slide.hasAttribute('data-deck-skip');
      if (on) slide.setAttribute('data-deck-skip', '');else slide.removeAttribute('data-deck-skip');
      if (this._thumbs && this._thumbs[i]) {
        if (on) this._thumbs[i].thumb.setAttribute('data-skip', '');else this._thumbs[i].thumb.removeAttribute('data-skip');
      }
      this._markLastVisible();
      this._emitDeckChange({
        action: on ? 'skip' : 'unskip',
        from: i,
        slide
      });
      // Re-broadcast so the presenter popup's prev/next thumbnails re-pick
      // the nearest non-skipped slide without waiting for a nav event.
      try {
        window.postMessage({
          slideIndexChanged: this._index,
          deckTotal: this._slides.length,
          deckSkipped: this._skippedIndices()
        }, '*');
      } catch (e) {}
    }
    _skippedIndices() {
      const out = [];
      for (let i = 0; i < this._slides.length; i++) {
        if (this._slides[i].hasAttribute('data-deck-skip')) out.push(i);
      }
      return out;
    }
    _moveSlide(i, j) {
      if (j < 0 || j >= this._slides.length || j === i) return;
      const slide = this._slides[i];
      const ref = j < i ? this._slides[j] : this._slides[j].nextSibling;
      // Track the active slide across the reorder so the same content
      // stays on screen.
      const cur = this._index;
      if (cur === i) this._index = j;else if (i < cur && j >= cur) this._index = cur - 1;else if (i > cur && j <= cur) this._index = cur + 1;
      this._squelchSlotChange = true;
      this.insertBefore(slide, ref);
      this._emitDeckChange({
        action: 'move',
        from: i,
        to: j,
        slide
      });
      this._collectSlides();
      this._applyIndex({
        showOverlay: false,
        broadcast: true,
        reason: 'mutation'
      });
    }

    // Public API ------------------------------------------------------------

    /** Current slide index (0-based). */
    get index() {
      return this._index;
    }
    /** Total slide count. */
    get length() {
      return this._slides.length;
    }
    /** Programmatically navigate. */
    goTo(i) {
      this._go(i, 'api');
    }
    next() {
      this._advance(1, 'api');
    }
    prev() {
      this._advance(-1, 'api');
    }
    reset() {
      this._go(0, 'api');
    }
  }
  if (!customElements.get('deck-stage')) {
    customElements.define('deck-stage', DeckStage);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "slides/deck-stage.js", error: String((e && e.message) || e) }); }

// ui_kits/ds-fallback.js
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* JUSTICE — committed runtime fallback (window.TLW). Regenerate from sources. */
window.TLW = window.TLW || {};
;
(function () {
  const React = window.React;

  /**
   * The Last Word — Button
   * Declarative actions. Primary = forest (affirm/commit), secondary = ink outline,
   * ghost = quiet, danger = oxblood (strike/destroy).
   */

  let _injected = false;
  function ensureStyles() {
    if (_injected || typeof document === 'undefined') return;
    _injected = true;
    const css = `
  .tlw-btn{--_h:40px;--_px:18px;--_fs:15px;display:inline-flex;align-items:center;justify-content:center;gap:8px;
    height:var(--_h);padding:0 var(--_px);font-family:var(--font-text);font-weight:600;font-size:var(--_fs);
    letter-spacing:-0.005em;line-height:1;border-radius:var(--radius-xs);border:1.5px solid transparent;
    cursor:pointer;white-space:nowrap;text-decoration:none;transition:background var(--dur-fast) var(--ease-decisive),
    border-color var(--dur-fast) var(--ease-decisive),color var(--dur-fast) var(--ease-decisive),transform var(--dur-instant) var(--ease-decisive);
    user-select:none;}
  .tlw-btn:active{transform:translateY(1px);}
  .tlw-btn:focus-visible{outline:none;box-shadow:var(--ring-focus);}
  .tlw-btn[disabled]{cursor:not-allowed;opacity:0.4;pointer-events:none;}
  .tlw-btn--sm{--_h:32px;--_px:12px;--_fs:13px;}
  .tlw-btn--lg{--_h:48px;--_px:24px;--_fs:16px;}
  .tlw-btn--full{display:flex;width:100%;}
  .tlw-btn--primary{background:var(--forest-600);color:var(--paper-0);}
  .tlw-btn--primary:hover{background:var(--forest-700);}
  .tlw-btn--secondary{background:var(--paper-0);color:var(--ink-900);border-color:var(--ink-900);}
  .tlw-btn--secondary:hover{background:var(--ink-900);color:var(--paper-0);}
  .tlw-btn--ghost{background:transparent;color:var(--ink-900);}
  .tlw-btn--ghost:hover{background:var(--paper-2);}
  .tlw-btn--danger{background:var(--oxblood-600);color:var(--paper-0);}
  .tlw-btn--danger:hover{background:var(--oxblood-700);}
  .tlw-btn__ico{display:inline-flex;width:1.05em;height:1.05em;}
  .tlw-btn__ico svg{width:100%;height:100%;display:block;}
  `;
    const el = document.createElement('style');
    el.id = 'tlw-btn-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }
  function Button({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    disabled = false,
    iconLeft = null,
    iconRight = null,
    type = 'button',
    as = 'button',
    className = '',
    ...rest
  }) {
    ensureStyles();
    const cls = ['tlw-btn', `tlw-btn--${variant}`, size !== 'md' ? `tlw-btn--${size}` : '', fullWidth ? 'tlw-btn--full' : '', className].filter(Boolean).join(' ');
    const Comp = as;
    const props = Comp === 'button' ? {
      type,
      disabled
    } : {};
    return /*#__PURE__*/React.createElement(Comp, _extends({
      className: cls
    }, props, rest), iconLeft ? /*#__PURE__*/React.createElement("span", {
      className: "tlw-btn__ico"
    }, iconLeft) : null, children, iconRight ? /*#__PURE__*/React.createElement("span", {
      className: "tlw-btn__ico"
    }, iconRight) : null);
  }
  window.TLW.Button = Button;
})();
;
(function () {
  const React = window.React;

  /**
   * The Last Word — Badge
   * A small verdict / status marker. Affirmed (forest), Struck (oxblood),
   * Pending (stone), or neutral. Soft by default; solid for emphasis.
   */

  let _injected = false;
  function ensureStyles() {
    if (_injected || typeof document === 'undefined') return;
    _injected = true;
    const css = `
  .tlw-badge{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 10px;
    font-family:var(--font-mono);font-weight:600;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;
    border-radius:var(--radius-pill);border:1px solid transparent;white-space:nowrap;line-height:1;}
  .tlw-badge__dot{width:6px;height:6px;border-radius:var(--radius-pill);background:currentColor;flex:none;}
  /* soft */
  .tlw-badge--soft.is-affirmed{background:var(--forest-100);color:var(--forest-700);border-color:var(--forest-300);}
  .tlw-badge--soft.is-struck{background:var(--oxblood-100);color:var(--oxblood-700);border-color:#D9B6AD;}
  .tlw-badge--soft.is-pending{background:var(--paper-3);color:var(--stone-700);border-color:var(--line-2);}
  .tlw-badge--soft.is-neutral{background:var(--paper-2);color:var(--stone-600);border-color:var(--line-1);}
  /* solid */
  .tlw-badge--solid.is-affirmed{background:var(--forest-600);color:var(--paper-0);}
  .tlw-badge--solid.is-struck{background:var(--oxblood-600);color:var(--paper-0);}
  .tlw-badge--solid.is-pending{background:var(--stone-500);color:var(--paper-0);}
  .tlw-badge--solid.is-neutral{background:var(--ink-900);color:var(--paper-0);}
  /* outline */
  .tlw-badge--outline{background:transparent;}
  .tlw-badge--outline.is-affirmed{color:var(--forest-700);border-color:var(--forest-300);}
  .tlw-badge--outline.is-struck{color:var(--oxblood-700);border-color:#D9B6AD;}
  .tlw-badge--outline.is-pending{color:var(--stone-700);border-color:var(--line-2);}
  .tlw-badge--outline.is-neutral{color:var(--stone-600);border-color:var(--line-2);}
  `;
    const el = document.createElement('style');
    el.id = 'tlw-badge-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }
  const LABELS = {
    affirmed: 'Affirmed',
    struck: 'Struck',
    pending: 'Pending',
    neutral: ''
  };
  function Badge({
    children,
    verdict = 'neutral',
    variant = 'soft',
    dot = true,
    className = '',
    ...rest
  }) {
    ensureStyles();
    const cls = ['tlw-badge', `tlw-badge--${variant}`, `is-${verdict}`, className].filter(Boolean).join(' ');
    const label = children != null ? children : LABELS[verdict];
    return /*#__PURE__*/React.createElement("span", _extends({
      className: cls
    }, rest), dot ? /*#__PURE__*/React.createElement("span", {
      className: "tlw-badge__dot"
    }) : null, label);
  }
  window.TLW.Badge = Badge;
})();
;
(function () {
  const React = window.React;

  /**
   * The Last Word — Tag
   * A topic / category chip. Quiet by default; optional removable.
   */

  let _injected = false;
  function ensureStyles() {
    if (_injected || typeof document === 'undefined') return;
    _injected = true;
    const css = `
  .tlw-tag{display:inline-flex;align-items:center;gap:7px;height:26px;padding:0 11px;
    font-family:var(--font-text);font-weight:600;font-size:12.5px;letter-spacing:0;line-height:1;
    color:var(--ink-800);background:var(--paper-0);border:1px solid var(--line-2);border-radius:var(--radius-pill);
    white-space:nowrap;cursor:default;transition:background var(--dur-fast) var(--ease-decisive),border-color var(--dur-fast) var(--ease-decisive);}
  .tlw-tag--button{cursor:pointer;}
  .tlw-tag--button:hover{background:var(--paper-2);border-color:var(--line-3);}
  .tlw-tag--active{background:var(--ink-900);border-color:var(--ink-900);color:var(--paper-0);}
  .tlw-tag__dot{width:7px;height:7px;border-radius:var(--radius-pill);flex:none;}
  .tlw-tag__x{display:inline-flex;margin-right:-3px;width:14px;height:14px;border-radius:var(--radius-pill);
    align-items:center;justify-content:center;font-size:13px;line-height:1;color:var(--stone-500);cursor:pointer;}
  .tlw-tag__x:hover{color:var(--oxblood-600);}
  `;
    const el = document.createElement('style');
    el.id = 'tlw-tag-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }
  function Tag({
    children,
    color,
    active = false,
    onRemove,
    onClick,
    className = '',
    ...rest
  }) {
    ensureStyles();
    const cls = ['tlw-tag', onClick ? 'tlw-tag--button' : '', active ? 'tlw-tag--active' : '', className].filter(Boolean).join(' ');
    return /*#__PURE__*/React.createElement("span", _extends({
      className: cls,
      onClick: onClick
    }, rest), color ? /*#__PURE__*/React.createElement("span", {
      className: "tlw-tag__dot",
      style: {
        background: color
      }
    }) : null, children, onRemove ? /*#__PURE__*/React.createElement("span", {
      className: "tlw-tag__x",
      onClick: e => {
        e.stopPropagation();
        onRemove(e);
      }
    }, "\xD7") : null);
  }
  window.TLW.Tag = Tag;
})();
;
(function () {
  const React = window.React;

  /**
   * The Last Word — Avatar
   * Initials or image. Optional "standing" ring to mark a member's
   * credibility (forest = high standing).
   */

  let _injected = false;
  function ensureStyles() {
    if (_injected || typeof document === 'undefined') return;
    _injected = true;
    const css = `
  .tlw-av{position:relative;display:inline-flex;align-items:center;justify-content:center;flex:none;
    border-radius:var(--radius-pill);background:var(--ink-900);color:var(--paper-0);overflow:hidden;
    font-family:var(--font-display);font-weight:700;letter-spacing:0;user-select:none;}
  .tlw-av img{width:100%;height:100%;object-fit:cover;display:block;}
  .tlw-av--ring{box-shadow:0 0 0 2px var(--paper-1),0 0 0 4px var(--forest-600);}
  .tlw-av--sm{width:28px;height:28px;font-size:11px;}
  .tlw-av--md{width:40px;height:40px;font-size:15px;}
  .tlw-av--lg{width:56px;height:56px;font-size:20px;}
  .tlw-av--xl{width:80px;height:80px;font-size:30px;}
  `;
    const el = document.createElement('style');
    el.id = 'tlw-av-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }
  const PALETTE = ['#1B3A5B', '#2A323C', '#244B72', '#4A5562', '#122740'];
  function pick(name = '') {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = h * 31 + name.charCodeAt(i) >>> 0;
    return PALETTE[h % PALETTE.length];
  }
  function initials(name = '') {
    const p = name.trim().split(/\s+/);
    return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '—';
  }
  function Avatar({
    name = '',
    src,
    size = 'md',
    ring = false,
    className = '',
    ...rest
  }) {
    ensureStyles();
    const cls = ['tlw-av', `tlw-av--${size}`, ring ? 'tlw-av--ring' : '', className].filter(Boolean).join(' ');
    return /*#__PURE__*/React.createElement("span", _extends({
      className: cls,
      style: !src ? {
        background: pick(name)
      } : undefined,
      title: name
    }, rest), src ? /*#__PURE__*/React.createElement("img", {
      src: src,
      alt: name
    }) : initials(name));
  }
  window.TLW.Avatar = Avatar;
})();
;
(function () {
  const React = window.React;

  /**
   * The Last Word — Card
   * A sheet of paper. Sharp corners, hairline border, low warm shadow.
   * `interactive` lifts slightly on hover; `tone` tints the left frame.
   */

  let _injected = false;
  function ensureStyles() {
    if (_injected || typeof document === 'undefined') return;
    _injected = true;
    const css = `
  .tlw-card{background:var(--surface-card);border:1px solid var(--line-1);border-radius:var(--radius-sm);
    box-shadow:var(--shadow-1);transition:box-shadow var(--dur-base) var(--ease-decisive),transform var(--dur-base) var(--ease-decisive),border-color var(--dur-base) var(--ease-decisive);}
  .tlw-card--p0{padding:0;}
  .tlw-card--sm{padding:var(--space-4);}
  .tlw-card--md{padding:var(--space-6);}
  .tlw-card--lg{padding:var(--space-8);}
  .tlw-card--raised{box-shadow:var(--shadow-2);}
  .tlw-card--flat{box-shadow:none;}
  .tlw-card--interactive{cursor:pointer;}
  .tlw-card--interactive:hover{box-shadow:var(--shadow-3);transform:translateY(-2px);border-color:var(--line-2);}
  .tlw-card--frame{border-left-width:3px;}
  .tlw-card--frame.tone-affirmed{border-left-color:var(--forest-600);}
  .tlw-card--frame.tone-struck{border-left-color:var(--oxblood-600);}
  .tlw-card--frame.tone-pending{border-left-color:var(--stone-400);}
  `;
    const el = document.createElement('style');
    el.id = 'tlw-card-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }
  function Card({
    children,
    padding = 'md',
    elevation = 'low',
    interactive = false,
    tone,
    as = 'div',
    className = '',
    ...rest
  }) {
    ensureStyles();
    const elev = elevation === 'raised' ? 'tlw-card--raised' : elevation === 'flat' ? 'tlw-card--flat' : '';
    const cls = ['tlw-card', `tlw-card--${padding === 'none' ? 'p0' : padding}`, elev, interactive ? 'tlw-card--interactive' : '', tone ? `tlw-card--frame tone-${tone}` : '', className].filter(Boolean).join(' ');
    const Comp = as;
    return /*#__PURE__*/React.createElement(Comp, _extends({
      className: cls
    }, rest), children);
  }
  window.TLW.Card = Card;
})();
;
(function () {
  const React = window.React;

  /**
   * The Last Word — Input
   * Labeled text field. Hairline border, forest focus ring, sharp corners.
   * Supports leading adornment, hint, and error (oxblood) states.
   */

  let _injected = false;
  function ensureStyles() {
    if (_injected || typeof document === 'undefined') return;
    _injected = true;
    const css = `
  .tlw-field{display:flex;flex-direction:column;gap:7px;font-family:var(--font-text);}
  .tlw-field__label{font-size:13px;font-weight:600;color:var(--ink-800);letter-spacing:0;}
  .tlw-field__req{color:var(--oxblood-600);margin-left:2px;}
  .tlw-field__box{display:flex;align-items:center;gap:9px;background:var(--surface-raised);
    border:1.5px solid var(--line-2);border-radius:var(--radius-xs);padding:0 13px;height:44px;
    transition:border-color var(--dur-fast) var(--ease-decisive),box-shadow var(--dur-fast) var(--ease-decisive);}
  .tlw-field__box:focus-within{border-color:var(--forest-600);box-shadow:var(--ring-focus);}
  .tlw-field--error .tlw-field__box{border-color:var(--oxblood-600);}
  .tlw-field--error .tlw-field__box:focus-within{box-shadow:0 0 0 3px rgba(122,42,34,0.25);}
  .tlw-field__ico{display:inline-flex;width:17px;height:17px;color:var(--stone-500);flex:none;}
  .tlw-field__ico svg{width:100%;height:100%;}
  .tlw-field input,.tlw-field textarea{flex:1;border:0;background:transparent;outline:none;width:100%;
    font-family:var(--font-text);font-size:15px;color:var(--ink-900);padding:0;}
  .tlw-field input::placeholder,.tlw-field textarea::placeholder{color:var(--stone-400);}
  .tlw-field--area .tlw-field__box{height:auto;padding:11px 13px;align-items:flex-start;}
  .tlw-field textarea{resize:vertical;min-height:84px;line-height:1.55;}
  .tlw-field__hint{font-size:12.5px;color:var(--text-muted);}
  .tlw-field--error .tlw-field__hint{color:var(--oxblood-600);}
  .tlw-field input:disabled,.tlw-field textarea:disabled{color:var(--stone-400);}
  .tlw-field--disabled .tlw-field__box{background:var(--paper-2);}
  `;
    const el = document.createElement('style');
    el.id = 'tlw-field-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }
  function Input({
    label,
    hint,
    error,
    required = false,
    icon = null,
    multiline = false,
    rows = 3,
    disabled = false,
    id,
    className = '',
    ...rest
  }) {
    ensureStyles();
    const fid = id || (label ? 'f-' + label.replace(/\s+/g, '-').toLowerCase() : undefined);
    const cls = ['tlw-field', multiline ? 'tlw-field--area' : '', error ? 'tlw-field--error' : '', disabled ? 'tlw-field--disabled' : '', className].filter(Boolean).join(' ');
    return /*#__PURE__*/React.createElement("label", {
      className: cls,
      htmlFor: fid
    }, label ? /*#__PURE__*/React.createElement("span", {
      className: "tlw-field__label"
    }, label, required ? /*#__PURE__*/React.createElement("span", {
      className: "tlw-field__req"
    }, "*") : null) : null, /*#__PURE__*/React.createElement("span", {
      className: "tlw-field__box"
    }, icon ? /*#__PURE__*/React.createElement("span", {
      className: "tlw-field__ico"
    }, icon) : null, multiline ? /*#__PURE__*/React.createElement("textarea", _extends({
      id: fid,
      rows: rows,
      disabled: disabled
    }, rest)) : /*#__PURE__*/React.createElement("input", _extends({
      id: fid,
      disabled: disabled
    }, rest))), error || hint ? /*#__PURE__*/React.createElement("span", {
      className: "tlw-field__hint"
    }, error || hint) : null);
  }
  window.TLW.Input = Input;
})();
;
(function () {
  const React = window.React;

  /**
   * JUSTICE — TruthStatus ("the kettle" / Discovery Ladder)
   * Shows where a claim stands — Sourced / Accepted / Emerging / Fringe /
   * Unsourced — WITHOUT the platform ruling on truth. Contested things are
   * shown honestly as contested, never hidden, never endorsed.
   */

  let _i = false;
  function ensureStyles() {
    if (_i || typeof document === 'undefined') return;
    _i = true;
    const css = `
  .jx-truth{display:inline-flex;align-items:center;gap:7px;height:22px;padding:0 10px;
    font-family:var(--font-mono);font-weight:600;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;
    border-radius:var(--radius-pill);border:1px solid transparent;white-space:nowrap;line-height:1;}
  .jx-truth__dot{width:7px;height:7px;border-radius:var(--radius-pill);background:currentColor;flex:none;}
  .jx-truth--soft.is-sourced{background:var(--status-sourced-tint);color:var(--status-sourced);border-color:#B9D9C8;}
  .jx-truth--soft.is-accepted{background:var(--status-accepted-tint);color:var(--status-accepted);border-color:#B9D0EC;}
  .jx-truth--soft.is-emerging{background:var(--status-emerging-tint);color:#9A6212;border-color:#EAD09B;}
  .jx-truth--soft.is-fringe{background:var(--status-fringe-tint);color:var(--status-fringe);border-color:#E6C0B0;}
  .jx-truth--soft.is-unsourced{background:var(--status-unsourced-tint);color:var(--slate-400);border-color:var(--line-strong);}
  .jx-truth--solid.is-sourced{background:var(--status-sourced);color:#fff;}
  .jx-truth--solid.is-accepted{background:var(--status-accepted);color:#fff;}
  .jx-truth--solid.is-emerging{background:var(--status-emerging);color:#fff;}
  .jx-truth--solid.is-fringe{background:var(--status-fringe);color:#fff;}
  .jx-truth--solid.is-unsourced{background:var(--status-unsourced);color:#fff;}
  .jx-truth--outline{background:transparent;}
  .jx-truth--outline.is-sourced{color:var(--status-sourced);border-color:#B9D9C8;}
  .jx-truth--outline.is-accepted{color:var(--status-accepted);border-color:#B9D0EC;}
  .jx-truth--outline.is-emerging{color:#9A6212;border-color:#EAD09B;}
  .jx-truth--outline.is-fringe{color:var(--status-fringe);border-color:#E6C0B0;}
  .jx-truth--outline.is-unsourced{color:var(--slate-400);border-color:var(--line-strong);}
  `;
    const el = document.createElement('style');
    el.id = 'jx-truth-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }
  const LABELS = {
    sourced: 'Substantiated',
    accepted: 'On Record',
    emerging: 'Alleged',
    fringe: 'Disputed',
    unsourced: 'Unverified'
  };
  function TruthStatus({
    status = 'unsourced',
    variant = 'soft',
    dot = true,
    children,
    className = '',
    ...rest
  }) {
    ensureStyles();
    const cls = ['jx-truth', `jx-truth--${variant}`, `is-${status}`, className].filter(Boolean).join(' ');
    return /*#__PURE__*/React.createElement("span", _extends({
      className: cls
    }, rest), dot ? /*#__PURE__*/React.createElement("span", {
      className: "jx-truth__dot"
    }) : null, children != null ? children : LABELS[status]);
  }
  window.TLW.TruthStatus = TruthStatus;
})();
;
(function () {
  const React = window.React;

  /**
   * JUSTICE — PostType
   * Post type drives visual weight AND whether it enters the evidentiary record.
   * Evidence / Filing / Testimony build the case; Opinion / Reaction are the
   * crowd layer and are visually distinct so they never pollute the record.
   */

  let _i = false;
  function ensureStyles() {
    if (_i || typeof document === 'undefined') return;
    _i = true;
    const css = `
  .jx-ptype{display:inline-flex;align-items:center;gap:6px;height:21px;padding:0 9px 0 8px;
    font-family:var(--font-mono);font-weight:600;font-size:10.5px;letter-spacing:0.07em;text-transform:uppercase;
    border-radius:var(--radius-xs);border:1px solid transparent;white-space:nowrap;line-height:1;}
  .jx-ptype__bar{width:3px;height:11px;border-radius:1px;background:currentColor;flex:none;}
  .jx-ptype--onrecord{box-shadow:none;}
  .jx-ptype.t-evidence{color:var(--post-evidence);background:#F3ECD9;border-color:#E2D2A6;}
  .jx-ptype.t-filing{color:var(--post-filing);background:var(--navy-100);border-color:#C3D4E6;}
  .jx-ptype.t-testimony{color:var(--post-testimony);background:#D8ECEB;border-color:#B4D7D5;}
  .jx-ptype.t-analysis{color:var(--post-analysis);background:#E2E3F3;border-color:#C7C9E6;}
  .jx-ptype.t-opinion{color:var(--post-opinion);background:var(--paper-100);border-color:var(--line-strong);}
  .jx-ptype.t-reaction{color:var(--slate-400);background:transparent;border-color:var(--line-strong);}
  .jx-ptype.t-question{color:#9A6212;background:var(--honey-100);border-color:#EAD09B;}
  `;
    const el = document.createElement('style');
    el.id = 'jx-ptype-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }
  const META = {
    evidence: {
      label: 'Evidence',
      record: true
    },
    filing: {
      label: 'Motion',
      record: true
    },
    testimony: {
      label: 'Testimony',
      record: true
    },
    analysis: {
      label: 'Brief',
      record: false
    },
    opinion: {
      label: 'Statement',
      record: false
    },
    reaction: {
      label: 'Note',
      record: false
    },
    question: {
      label: 'Inquiry',
      record: false
    }
  };
  function PostType({
    type = 'analysis',
    bar = true,
    children,
    className = '',
    ...rest
  }) {
    ensureStyles();
    const m = META[type] || META.analysis;
    const cls = ['jx-ptype', `t-${type}`, className].filter(Boolean).join(' ');
    return /*#__PURE__*/React.createElement("span", _extends({
      className: cls
    }, rest), bar ? /*#__PURE__*/React.createElement("span", {
      className: "jx-ptype__bar"
    }) : null, children != null ? children : m.label);
  }

  /** Whether a post type enters the evidentiary record. */
  PostType.entersRecord = type => !!(META[type] && META[type].record);
  window.TLW.PostType = PostType;
})();
;
(function () {
  const React = window.React;

  /**
   * JUSTICE — EvidenceMeter
   * The case's EVIDENTIARY STRENGTH — built only from on-record posts
   * (Evidence / Filing / Testimony). Deliberately separate from raw
   * engagement so the crowd layer never inflates the record.
   */

  let _i = false;
  function ensureStyles() {
    if (_i || typeof document === 'undefined') return;
    _i = true;
    const css = `
  .jx-eml{display:flex;flex-direction:column;gap:8px;font-family:var(--font-mono);}
  .jx-eml__top{display:flex;align-items:baseline;justify-content:space-between;}
  .jx-eml__lab{font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);font-weight:600;}
  .jx-eml__score{font-family:var(--font-serif);font-weight:700;font-size:18px;color:var(--ink-900);letter-spacing:0;}
  .jx-eml__score b{color:var(--gold-700);}
  .jx-eml__bar{display:flex;height:9px;border-radius:var(--radius-pill);overflow:hidden;background:var(--paper-200);}
  .jx-eml__seg{height:100%;}
  .jx-eml__seg--evidence{background:var(--post-evidence);}
  .jx-eml__seg--filing{background:var(--post-filing);}
  .jx-eml__seg--testimony{background:var(--post-testimony);}
  .jx-eml__legend{display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:var(--text-muted);}
  .jx-eml__k{display:inline-flex;align-items:center;gap:5px;}
  .jx-eml__sw{width:8px;height:8px;border-radius:2px;}
  `;
    const el = document.createElement('style');
    el.id = 'jx-eml-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }
  function EvidenceMeter({
    evidence = 0,
    filings = 0,
    testimony = 0,
    size = 'md',
    showLegend = true,
    className = '',
    ...rest
  }) {
    ensureStyles();
    const total = evidence + filings + testimony;
    // weighted strength: evidence 3, filing 2.5, testimony 2 (capped at 100)
    const raw = evidence * 3 + filings * 2.5 + testimony * 2;
    const score = Math.min(100, Math.round(raw));
    const t = total || 1;
    const cls = ['jx-eml', className].filter(Boolean).join(' ');
    return /*#__PURE__*/React.createElement("div", _extends({
      className: cls
    }, rest), /*#__PURE__*/React.createElement("div", {
      className: "jx-eml__top"
    }, /*#__PURE__*/React.createElement("span", {
      className: "jx-eml__lab"
    }, "Evidentiary strength"), /*#__PURE__*/React.createElement("span", {
      className: "jx-eml__score"
    }, /*#__PURE__*/React.createElement("b", null, score), "/100")), /*#__PURE__*/React.createElement("div", {
      className: "jx-eml__bar",
      role: "img",
      "aria-label": `Evidentiary strength ${score} of 100`
    }, /*#__PURE__*/React.createElement("div", {
      className: "jx-eml__seg jx-eml__seg--evidence",
      style: {
        width: evidence / t * 100 + '%'
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "jx-eml__seg jx-eml__seg--filing",
      style: {
        width: filings / t * 100 + '%'
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "jx-eml__seg jx-eml__seg--testimony",
      style: {
        width: testimony / t * 100 + '%'
      }
    })), showLegend ? /*#__PURE__*/React.createElement("div", {
      className: "jx-eml__legend"
    }, /*#__PURE__*/React.createElement("span", {
      className: "jx-eml__k"
    }, /*#__PURE__*/React.createElement("span", {
      className: "jx-eml__sw",
      style: {
        background: 'var(--post-evidence)'
      }
    }), evidence, " evidence"), /*#__PURE__*/React.createElement("span", {
      className: "jx-eml__k"
    }, /*#__PURE__*/React.createElement("span", {
      className: "jx-eml__sw",
      style: {
        background: 'var(--post-filing)'
      }
    }), filings, " motions"), /*#__PURE__*/React.createElement("span", {
      className: "jx-eml__k"
    }, /*#__PURE__*/React.createElement("span", {
      className: "jx-eml__sw",
      style: {
        background: 'var(--post-testimony)'
      }
    }), testimony, " testimony")) : null);
  }
  window.TLW.EvidenceMeter = EvidenceMeter;
})();
;
(function () {
  const React = window.React;

  /**
   * JUSTICE — EscalationLadder
   * The accountability loop, made legible: SEE → INVESTIGATE → EVIDENCE →
   * DEMAND (C&D) → ACT (class action) → PROSECUTE → OUTCOME. Shows where a
   * case sits and what the next rung is. Nodes are honeycomb cells.
   */

  let _i = false;
  function ensureStyles() {
    if (_i || typeof document === 'undefined') return;
    _i = true;
    const css = `
  .jx-ladder{display:flex;align-items:flex-start;width:100%;font-family:var(--font-text);}
  .jx-ladder__step{display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;position:relative;min-width:0;}
  .jx-ladder__rail{position:absolute;top:17px;left:-50%;width:100%;height:2px;background:var(--line-strong);z-index:0;}
  .jx-ladder__rail.is-done{background:var(--navy-600);}
  .jx-ladder__node{width:34px;height:34px;display:flex;align-items:center;justify-content:center;
    border-radius:50%;
    background:var(--paper-200);color:var(--slate-400);position:relative;z-index:1;
    font-family:var(--font-mono);font-weight:600;font-size:12px;}
  .jx-ladder__node.is-done{background:var(--navy-700);color:#fff;}
  .jx-ladder__node.is-current{background:var(--gold-600);color:#1a1305;}
  .jx-ladder__ring{position:absolute;width:46px;height:46px;z-index:0;border-radius:50%;background:var(--gold-100);}
  .jx-ladder__lab{font-family:var(--font-mono);font-size:10px;letter-spacing:0.05em;text-transform:uppercase;
    text-align:center;color:var(--text-faint);line-height:1.2;}
  .jx-ladder__lab.is-current{color:var(--gold-700);font-weight:700;}
  .jx-ladder__lab.is-done{color:var(--text-muted);}
  .jx-ladder--compact .jx-ladder__node{width:24px;height:24px;font-size:10px;}
  .jx-ladder--compact .jx-ladder__ring{width:32px;height:32px;}
  .jx-ladder--compact .jx-ladder__rail{top:12px;}
  `;
    const el = document.createElement('style');
    el.id = 'jx-ladder-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }
  const RUNGS = [{
    key: 'see',
    label: 'Complaint'
  }, {
    key: 'investigate',
    label: 'Investigation'
  }, {
    key: 'evidence',
    label: 'Discovery'
  }, {
    key: 'demand',
    label: 'Injunction'
  }, {
    key: 'act',
    label: 'Class Action'
  }, {
    key: 'prosecute',
    label: 'Trial'
  }, {
    key: 'outcome',
    label: 'Judgment'
  }];
  function EscalationLadder({
    current = 'investigate',
    compact = false,
    showLabels = true,
    className = '',
    ...rest
  }) {
    ensureStyles();
    const idx = typeof current === 'number' ? current : RUNGS.findIndex(r => r.key === current);
    const cls = ['jx-ladder', compact ? 'jx-ladder--compact' : '', className].filter(Boolean).join(' ');
    return /*#__PURE__*/React.createElement("div", _extends({
      className: cls
    }, rest), RUNGS.map((r, i) => {
      const done = i < idx,
        cur = i === idx;
      return /*#__PURE__*/React.createElement("div", {
        className: "jx-ladder__step",
        key: r.key
      }, i > 0 ? /*#__PURE__*/React.createElement("span", {
        className: 'jx-ladder__rail' + (i <= idx ? ' is-done' : '')
      }) : null, cur ? /*#__PURE__*/React.createElement("span", {
        className: "jx-ladder__ring"
      }) : null, /*#__PURE__*/React.createElement("span", {
        className: 'jx-ladder__node' + (done ? ' is-done' : cur ? ' is-current' : '')
      }, done ? '✓' : i + 1), showLabels ? /*#__PURE__*/React.createElement("span", {
        className: 'jx-ladder__lab' + (cur ? ' is-current' : done ? ' is-done' : '')
      }, r.label) : null);
    }));
  }
  EscalationLadder.RUNGS = RUNGS;
  window.TLW.EscalationLadder = EscalationLadder;
})();
;
(function () {
  const React = window.React;

  /**
   * JUSTICE — EntityHeader
   * The NEUTRAL entity atom, pulled from its home realm (mostly Society).
   * Name only — accusations live in the Justice layer, never baked into the
   * entity. The "Neutral atom" marker + home-realm link keep that boundary clear.
   */

  let _i = false;
  function ensureStyles() {
    if (_i || typeof document === 'undefined') return;
    _i = true;
    const css = `
  .jx-ent{background:var(--navy-800);color:var(--text-on-navy);border-radius:var(--radius-md);overflow:hidden;position:relative;}
  .jx-ent__hc{position:absolute;inset:0;background-image:radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0);background-size:18px 18px;pointer-events:none;}
  .jx-ent__in{position:relative;padding:22px 26px;}
  .jx-ent__crumb{display:flex;align-items:center;gap:7px;font-family:var(--font-mono);font-size:11px;letter-spacing:0.03em;color:#9DB1C7;margin-bottom:14px;flex-wrap:wrap;}
  .jx-ent__crumb b{color:#C9D6E4;font-weight:500;}
  .jx-ent__sep{opacity:0.5;}
  .jx-ent__row{display:flex;align-items:center;gap:16px;}
  .jx-ent__hex{width:46px;height:46px;flex:none;display:flex;align-items:center;justify-content:center;
    border-radius:50%;background:var(--gold-600);box-shadow:0 0 0 3px rgba(212,182,94,0.35);
    font-family:var(--font-serif);font-weight:700;font-size:22px;color:#1a1305;}
  .jx-ent__name{font-family:var(--font-serif);font-weight:700;font-size:32px;line-height:1.05;letter-spacing:-0.01em;color:#fff;margin:0;}
  .jx-ent__neutral{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 10px;border-radius:var(--radius-pill);
    border:1px solid rgba(255,255,255,0.28);font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.08em;
    text-transform:uppercase;color:#CBD8E6;margin-top:8px;}
  .jx-ent__meta{display:flex;gap:22px;flex-wrap:wrap;margin-top:18px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.12);}
  .jx-ent__m{display:flex;flex-direction:column;gap:3px;}
  .jx-ent__mk{font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#8499AF;}
  .jx-ent__mv{font-family:var(--font-text);font-size:14px;font-weight:600;color:#E8EEF4;}
  .jx-ent__tags{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:16px;}
  .jx-ent__tlab{font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#8499AF;}
  .jx-ent__tag{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 11px;border-radius:var(--radius-pill);
    font-family:var(--font-text);font-size:12.5px;font-weight:600;background:rgba(255,255,255,0.08);
    border:1px solid rgba(255,255,255,0.16);color:#DCE6F0;cursor:default;}
  .jx-ent__tag .d{width:6px;height:6px;border-radius:99px;}
  `;
    const el = document.createElement('style');
    el.id = 'jx-ent-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }
  const TAG_COLORS = {
    positive: 'var(--status-sourced)',
    negative: 'var(--status-fringe)',
    neutral: 'var(--silver-500)'
  };
  function EntityHeader({
    name,
    kind = 'Entity',
    sector,
    geo,
    realmPath = ['Society'],
    initial,
    contestedTags = [],
    className = '',
    ...rest
  }) {
    ensureStyles();
    return /*#__PURE__*/React.createElement("header", _extends({
      className: ['jx-ent', className].filter(Boolean).join(' ')
    }, rest), /*#__PURE__*/React.createElement("div", {
      className: "jx-ent__hc"
    }), /*#__PURE__*/React.createElement("div", {
      className: "jx-ent__in"
    }, /*#__PURE__*/React.createElement("nav", {
      className: "jx-ent__crumb"
    }, realmPath.map((p, i) => /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, i > 0 ? /*#__PURE__*/React.createElement("span", {
      className: "jx-ent__sep"
    }, "\u203A") : null, /*#__PURE__*/React.createElement("b", null, p))), name ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      className: "jx-ent__sep"
    }, "\u203A"), /*#__PURE__*/React.createElement("b", null, name)) : null), /*#__PURE__*/React.createElement("div", {
      className: "jx-ent__row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "jx-ent__hex"
    }, initial || (name ? name[0] : '◇')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
      className: "jx-ent__name"
    }, name), /*#__PURE__*/React.createElement("span", {
      className: "jx-ent__neutral"
    }, "\xA7 Named party \xB7 no finding entered"))), /*#__PURE__*/React.createElement("div", {
      className: "jx-ent__meta"
    }, /*#__PURE__*/React.createElement("div", {
      className: "jx-ent__m"
    }, /*#__PURE__*/React.createElement("span", {
      className: "jx-ent__mk"
    }, "Type"), /*#__PURE__*/React.createElement("span", {
      className: "jx-ent__mv"
    }, kind)), sector ? /*#__PURE__*/React.createElement("div", {
      className: "jx-ent__m"
    }, /*#__PURE__*/React.createElement("span", {
      className: "jx-ent__mk"
    }, "Sector"), /*#__PURE__*/React.createElement("span", {
      className: "jx-ent__mv"
    }, sector)) : null, geo ? /*#__PURE__*/React.createElement("div", {
      className: "jx-ent__m"
    }, /*#__PURE__*/React.createElement("span", {
      className: "jx-ent__mk"
    }, "Geo scope"), /*#__PURE__*/React.createElement("span", {
      className: "jx-ent__mv"
    }, geo)) : null), contestedTags.length ? /*#__PURE__*/React.createElement("div", {
      className: "jx-ent__tags"
    }, /*#__PURE__*/React.createElement("span", {
      className: "jx-ent__tlab"
    }, "Public designations \xB7"), contestedTags.map((t, i) => /*#__PURE__*/React.createElement("span", {
      className: "jx-ent__tag",
      key: i
    }, /*#__PURE__*/React.createElement("span", {
      className: "d",
      style: {
        background: TAG_COLORS[t.lean] || TAG_COLORS.neutral
      }
    }), t.label))) : null));
  }
  window.TLW.EntityHeader = EntityHeader;
})();
;
(function () {
  const React = window.React;
  const {
    Card
  } = window.TLW;
  const {
    TruthStatus
  } = window.TLW;
  const {
    EvidenceMeter
  } = window.TLW;
  const {
    EscalationLadder
  } = window.TLW;

  /**
   * JUSTICE — CaseCard
   * A case summary for the landing/docket: target entity, truth status, where it
   * sits on the escalation ladder, evidentiary strength, geo, and a join CTA.
   * Composes Card + TruthStatus + EvidenceMeter + EscalationLadder.
   */

  let _i = false;
  function ensureStyles() {
    if (_i || typeof document === 'undefined') return;
    _i = true;
    const css = `
  .jx-case__head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;}
  .jx-case__target{display:inline-flex;align-items:center;gap:8px;font-family:var(--font-mono);font-size:11px;
    letter-spacing:0.04em;color:var(--text-muted);}
  .jx-case__hex{width:13px;height:13px;border-radius:50%;background:var(--navy-700);flex:none;}
  .jx-case__title{font-family:var(--font-serif);font-weight:700;font-size:21px;line-height:1.2;letter-spacing:-0.01em;
    color:var(--text-strong);margin:0 0 6px;text-wrap:balance;}
  .jx-case__sum{font-family:var(--font-text);font-size:14px;line-height:1.55;color:var(--text-muted);margin:0 0 16px;}
  .jx-case__ladder{margin:16px 0;}
  .jx-case__foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;
    padding-top:13px;border-top:1px solid var(--line);font-family:var(--font-mono);font-size:12px;color:var(--text-faint);}
  .jx-case__foot b{color:var(--text-muted);font-weight:600;}
  .jx-case__geo{display:inline-flex;align-items:center;gap:5px;}
  `;
    const el = document.createElement('style');
    el.id = 'jx-case-styles';
    el.textContent = css;
    document.head.appendChild(el);
  }
  function CaseCard({
    id,
    target,
    title,
    summary,
    status = 'emerging',
    rung = 'investigate',
    evidence = 0,
    filings = 0,
    testimony = 0,
    geo,
    joined,
    onOpen,
    className = '',
    ...rest
  }) {
    ensureStyles();
    return /*#__PURE__*/React.createElement(Card, _extends({
      padding: "md",
      interactive: !!onOpen,
      onClick: onOpen,
      className: className
    }, rest), /*#__PURE__*/React.createElement("div", {
      className: "jx-case__head"
    }, /*#__PURE__*/React.createElement("span", {
      className: "jx-case__target"
    }, /*#__PURE__*/React.createElement("span", {
      className: "jx-case__hex"
    }), target ? /*#__PURE__*/React.createElement(React.Fragment, null, "Respondent \xB7 ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: 'var(--ink-800)'
      }
    }, target)) : id || 'CASE'), /*#__PURE__*/React.createElement(TruthStatus, {
      status: status
    })), /*#__PURE__*/React.createElement("h3", {
      className: "jx-case__title"
    }, title), summary ? /*#__PURE__*/React.createElement("p", {
      className: "jx-case__sum"
    }, summary) : null, /*#__PURE__*/React.createElement("div", {
      className: "jx-case__ladder"
    }, /*#__PURE__*/React.createElement(EscalationLadder, {
      current: rung,
      compact: true,
      showLabels: false
    })), /*#__PURE__*/React.createElement(EvidenceMeter, {
      evidence: evidence,
      filings: filings,
      testimony: testimony,
      showLegend: false
    }), /*#__PURE__*/React.createElement("div", {
      className: "jx-case__foot"
    }, geo ? /*#__PURE__*/React.createElement("span", {
      className: "jx-case__geo"
    }, "\u25C7 ", geo) : /*#__PURE__*/React.createElement("span", null), joined != null ? /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, joined.toLocaleString('en-US')), " organizing") : null, id ? /*#__PURE__*/React.createElement("span", null, id) : null));
  }
  window.TLW.CaseCard = CaseCard;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/ds-fallback.js", error: String((e && e.message) || e) }); }

// ui_kits/marketing/Marketing.jsx
try { (() => {
/* JUSTICE — Marketing site sections */

function Seal({
  size = 34
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 120 120",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "60",
    cy: "60",
    r: "54",
    fill: "#0C1826"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "44",
    y1: "52",
    x2: "76",
    y2: "52",
    stroke: "#B8902F",
    strokeWidth: "3.2",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "60",
    y1: "48",
    x2: "60",
    y2: "76",
    stroke: "#B8902F",
    strokeWidth: "3.2",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "49",
    y1: "76",
    x2: "71",
    y2: "76",
    stroke: "#B8902F",
    strokeWidth: "3.2",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "44",
    cy: "52",
    r: "3.6",
    fill: "#E5A23A"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "76",
    cy: "52",
    r: "3.6",
    fill: "#E5A23A"
  }));
}
function MNav() {
  const {
    Button
  } = window.DS;
  const Icon = window.TLWIcon;
  const links = ['The Docket', 'How it works', 'Cases', 'Standing'];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 20,
      background: 'rgba(247,249,251,0.85)',
      backdropFilter: 'saturate(160%) blur(10px)',
      borderBottom: '1px solid var(--line)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1240,
      margin: '0 auto',
      padding: '0 32px',
      height: 68,
      display: 'flex',
      alignItems: 'center',
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Seal, {
    size: 30
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 21,
      letterSpacing: '0.04em',
      color: 'var(--navy-800)'
    }
  }, "JUSTICE")), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: 24,
      marginLeft: 18
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 14.5,
      fontWeight: 500,
      color: 'var(--text-muted)',
      textDecoration: 'none'
    }
  }, l))), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 14.5,
      fontWeight: 600,
      color: 'var(--ink-900)',
      textDecoration: 'none'
    }
  }, "Sign in"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "gavel",
      size: 16
    })
  }, "Open a case")));
}
function MHero() {
  const {
    Button,
    CaseCard
  } = window.DS;
  const Icon = window.TLWIcon;
  const c = window.JX_DATA.CASES[0];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 1240,
      margin: '0 auto',
      padding: '72px 32px 56px',
      display: 'grid',
      gridTemplateColumns: '1.05fr 0.95fr',
      gap: 56,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 9,
      padding: '6px 13px',
      borderRadius: 999,
      border: '1px solid var(--line-strong)',
      background: 'var(--white)',
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      letterSpacing: '0.05em',
      color: 'var(--text-muted)',
      marginBottom: 26
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 99,
      background: 'var(--gold-600)'
    }
  }), " 318 active cases \xB7 2.4M organizing"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 70,
      lineHeight: 1.0,
      letterSpacing: '-0.02em',
      color: 'var(--ink-900)',
      margin: '0 0 22px'
    }
  }, "The people\u2019s", /*#__PURE__*/React.createElement("br", null), "court of record."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 20,
      lineHeight: 1.5,
      color: 'var(--text-muted)',
      margin: '0 0 32px',
      maxWidth: 480
    }
  }, "See something wrong. Build the case in the open. Move it through due process \u2014 from complaint to judgment. The court keeps the record; it never rules on the truth for you."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "gavel",
      size: 18
    })
  }, "Open a case"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "lg"
  }, "Browse the docket"))), /*#__PURE__*/React.createElement("div", {
    style: {
      transform: 'rotate(-1.2deg)'
    }
  }, /*#__PURE__*/React.createElement(CaseCard, {
    id: c.id,
    target: c.target,
    title: c.title,
    summary: c.summary,
    status: c.status,
    rung: c.rung,
    evidence: c.evidence,
    filings: c.filings,
    testimony: c.testimony,
    geo: c.geo,
    joined: c.joined
  })));
}
function MFlow() {
  const {
    EscalationLadder
  } = window.DS;
  const steps = [['Complaint', 'Someone names a wrong and files it to the public docket.'], ['Investigation', 'The public gathers and weighs evidence in the open.'], ['Discovery', 'On-record evidence, motions and testimony build the case.'], ['Injunction', 'A cease-and-desist demands the conduct stop, pending review.'], ['Class Action', 'Affected parties organize and join under shared counsel.'], ['Trial', 'The case is prosecuted; the record is tested.'], ['Judgment', 'An outcome is entered and stands as precedent.']];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--white)',
      borderTop: '1px solid var(--line)',
      borderBottom: '1px solid var(--line)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1240,
      margin: '0 auto',
      padding: '72px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--gold-700)',
      fontWeight: 600,
      marginBottom: 12
    }
  }, "Due process"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 42,
      letterSpacing: '-0.015em',
      color: 'var(--ink-900)',
      margin: '0 0 36px',
      maxWidth: 680
    }
  }, "Every case moves up the same ladder."), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 0 36px'
    }
  }, /*#__PURE__*/React.createElement(EscalationLadder, {
    current: "evidence"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 28,
      rowGap: 32
    }
  }, steps.map(([t, d], i) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      borderTop: '2px solid var(--navy-700)',
      paddingTop: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--text-faint)',
      marginBottom: 8
    }
  }, String(i + 1).padStart(2, '0')), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 20,
      color: 'var(--ink-900)',
      margin: '0 0 8px'
    }
  }, t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 14,
      lineHeight: 1.55,
      color: 'var(--text-muted)',
      margin: 0
    }
  }, d))))));
}
function MCases() {
  const {
    CaseCard,
    Button
  } = window.DS;
  const some = window.JX_DATA.CASES.slice(1, 4);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 1240,
      margin: '0 auto',
      padding: '72px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 32,
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--gold-700)',
      fontWeight: 600,
      marginBottom: 12
    }
  }, "On the docket now"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 42,
      letterSpacing: '-0.015em',
      color: 'var(--ink-900)',
      margin: 0
    }
  }, "Cases the public is building.")), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost"
  }, "See the full docket \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 20
    }
  }, some.map(c => /*#__PURE__*/React.createElement(CaseCard, {
    key: c.id,
    id: c.id,
    target: c.target,
    title: c.title,
    status: c.status,
    rung: c.rung,
    evidence: c.evidence,
    filings: c.filings,
    testimony: c.testimony,
    geo: c.geo,
    joined: c.joined
  }))));
}
function MCreed() {
  const {
    TruthStatus
  } = window.DS;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--navy-900)',
      color: 'var(--text-on-navy)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1240,
      margin: '0 auto',
      padding: '88px 32px',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 56,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--gold-400)',
      fontWeight: 600,
      marginBottom: 22
    }
  }, "We the People"), /*#__PURE__*/React.createElement("blockquote", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 42,
      lineHeight: 1.12,
      letterSpacing: '-0.015em',
      color: '#fff',
      margin: 0
    }
  }, "The court keeps the record. It does not rule on the truth for you \u2014 every claim is shown with where it stands, and every party is presumed innocent."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      color: 'rgba(232,238,244,0.6)',
      marginTop: 26,
      letterSpacing: '0.04em'
    }
  }, "\u2014 THE STANDARD OF JUSTICE, \xA71")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, [['sourced', 'Verified, cited — substantiated.'], ['accepted', 'Established and on the record.'], ['emerging', 'Alleged; under review.'], ['fringe', 'Disputed — shown openly, never hidden.'], ['unsourced', 'Unverified; no citation yet.']].map(([s, d]) => /*#__PURE__*/React.createElement("div", {
    key: s,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '12px 16px',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 'var(--radius-sm)'
    }
  }, /*#__PURE__*/React.createElement(TruthStatus, {
    status: s,
    variant: "solid"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 14,
      color: '#C9D6E4'
    }
  }, d))))));
}
function MCTA() {
  const {
    Button
  } = window.DS;
  const Icon = window.TLWIcon;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: 980,
      margin: '0 auto',
      padding: '92px 32px',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement(Seal, {
    size: 52
  })), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 56,
      letterSpacing: '-0.02em',
      lineHeight: 1.02,
      color: 'var(--ink-900)',
      margin: '0 0 20px'
    }
  }, "Hold power to the record."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 19,
      color: 'var(--text-muted)',
      margin: '0 auto 34px',
      maxWidth: 520,
      lineHeight: 1.5
    }
  }, "Join 2.4 million people building cases in the open \u2014 and keeping the record that lasts."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "gavel",
      size: 18
    })
  }, "Open a case"));
}
function MFooter() {
  const cols = [['Court', ['The Docket', 'Investigations', 'Class Actions', 'Judgments']], ['Standards', ['Claim status', 'Evidence', 'Standing', 'Due process']], ['Justice', ['About', 'How it works', 'Press', 'Contact']]];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--paper-100)',
      borderTop: '1px solid var(--line)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1240,
      margin: '0 auto',
      padding: '52px 32px 36px',
      display: 'grid',
      gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
      gap: 40
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement(Seal, {
    size: 26
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 19,
      letterSpacing: '0.04em',
      color: 'var(--navy-800)'
    }
  }, "JUSTICE")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-faint)',
      letterSpacing: '0.06em'
    }
  }, "WE THE PEOPLE")), cols.map(([h, items]) => /*#__PURE__*/React.createElement("div", {
    key: h
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--text-faint)',
      fontWeight: 600,
      marginBottom: 14
    }
  }, h), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, items.map(it => /*#__PURE__*/React.createElement("a", {
    key: it,
    href: "#",
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 14,
      color: 'var(--text-muted)',
      textDecoration: 'none'
    }
  }, it)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1240,
      margin: '0 auto',
      padding: '20px 32px',
      borderTop: '1px solid var(--line)',
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--text-faint)',
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Justice"), /*#__PURE__*/React.createElement("span", null, "The record stands.")));
}
function MarketingPage() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-canvas)'
    }
  }, /*#__PURE__*/React.createElement(MNav, null), /*#__PURE__*/React.createElement(MHero, null), /*#__PURE__*/React.createElement(MFlow, null), /*#__PURE__*/React.createElement(MCases, null), /*#__PURE__*/React.createElement(MCreed, null), /*#__PURE__*/React.createElement(MCTA, null), /*#__PURE__*/React.createElement(MFooter, null));
}
window.JX_MarketingPage = MarketingPage;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/Marketing.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/MobileScreens.jsx
try { (() => {
/* JUSTICE — Mobile App screens (Docket + Case File on a phone) */
const {
  useState: useStateMob
} = React;
function MSeal({
  size = 26
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 120 120",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "60",
    cy: "60",
    r: "54",
    fill: "#0C1826"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "44",
    y1: "52",
    x2: "76",
    y2: "52",
    stroke: "#B8902F",
    strokeWidth: "3.4",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "60",
    y1: "48",
    x2: "60",
    y2: "76",
    stroke: "#B8902F",
    strokeWidth: "3.4",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "49",
    y1: "76",
    x2: "71",
    y2: "76",
    stroke: "#B8902F",
    strokeWidth: "3.4",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "44",
    cy: "52",
    r: "3.8",
    fill: "#E5A23A"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "76",
    cy: "52",
    r: "3.8",
    fill: "#E5A23A"
  }));
}
function MHeader({
  onBack,
  label
}) {
  const Icon = window.TLWIcon;
  const {
    Avatar
  } = window.DS;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 5,
      background: 'var(--navy-900)',
      padding: '56px 18px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 11
    }
  }, onBack ? /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      border: 0,
      background: 'transparent',
      padding: 4,
      marginLeft: -4,
      cursor: 'pointer',
      color: '#C9D6E4'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevronLeft",
    size: 24
  })) : /*#__PURE__*/React.createElement(MSeal, {
    size: 26
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 18,
      letterSpacing: '0.04em',
      color: '#fff'
    }
  }, label || 'JUSTICE'), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), !onBack ? /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 20,
    style: {
      color: '#9DB1C7'
    }
  }) : null, !onBack ? /*#__PURE__*/React.createElement(Avatar, {
    name: "Jordan Pike",
    size: "sm",
    ring: true
  }) : null);
}
function MobileDocket({
  go
}) {
  const {
    CaseCard,
    Tag
  } = window.DS;
  const {
    CASES
  } = window.JX_DATA;
  const [f, setF] = useStateMob('All');
  const chips = ['All', 'Investigations', 'Class Actions', 'Prosecutions'];
  const map = {
    Investigations: 'investigations',
    'Class Actions': 'classactions',
    Prosecutions: 'prosecutions'
  };
  const list = CASES.filter(c => f === 'All' || c.branch === map[f]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100%',
      background: 'var(--paper-50)'
    }
  }, /*#__PURE__*/React.createElement(MHeader, null), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 16px 6px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--gold-700)',
      fontWeight: 600,
      marginBottom: 7
    }
  }, "318 active cases \xB7 2.4M"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 34,
      letterSpacing: '-0.015em',
      lineHeight: 1,
      color: 'var(--ink-900)',
      margin: 0
    }
  }, "The Docket")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      padding: '6px 16px 14px',
      overflowX: 'auto'
    }
  }, chips.map(c => /*#__PURE__*/React.createElement(Tag, {
    key: c,
    active: f === c,
    onClick: () => setF(c)
  }, c))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      padding: '0 16px 40px'
    }
  }, list.map(c => /*#__PURE__*/React.createElement(CaseCard, {
    key: c.id,
    id: c.id,
    target: c.target,
    title: c.title,
    status: c.status,
    rung: c.rung,
    evidence: c.evidence,
    filings: c.filings,
    testimony: c.testimony,
    geo: c.geo,
    joined: c.joined,
    onOpen: () => go('case', c)
  }))));
}
function MobileCaseFile({
  caseObj,
  go
}) {
  const {
    EntityHeader,
    TruthStatus,
    EscalationLadder,
    EvidenceMeter,
    PostType,
    Avatar,
    Button
  } = window.DS;
  const Icon = window.TLWIcon;
  const {
    PALANTIR,
    CASES,
    POSTS
  } = window.JX_DATA;
  const cs = caseObj || CASES[0];
  const isHero = cs.id === CASES[0].id;
  const [joined, setJoined] = useStateMob(false);
  const posts = POSTS.slice(0, 4);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100%',
      background: 'var(--paper-50)',
      paddingBottom: 30
    }
  }, /*#__PURE__*/React.createElement(MHeader, {
    onBack: () => go('docket'),
    label: "Case"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16
    }
  }, isHero ? /*#__PURE__*/React.createElement(EntityHeader, PALANTIR) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
      marginTop: isHero ? 18 : 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-faint)'
    }
  }, "CASE ", cs.id), /*#__PURE__*/React.createElement(TruthStatus, {
    status: cs.status
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 25,
      lineHeight: 1.12,
      letterSpacing: '-0.01em',
      color: 'var(--ink-900)',
      margin: '10px 0 0'
    }
  }, cs.title), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '18px 0',
      padding: 16,
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--white)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      fontWeight: 600,
      marginBottom: 14
    }
  }, "Where this case stands"), /*#__PURE__*/React.createElement(EscalationLadder, {
    current: cs.rung,
    showLabels: false
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement(EvidenceMeter, {
    evidence: cs.evidence,
    filings: cs.filings,
    testimony: cs.testimony,
    showLegend: false
  })), !joined ? /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    fullWidth: true,
    size: "lg",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "users",
      size: 17
    }),
    onClick: () => setJoined(true),
    className: ""
  }, "Join the class action") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginTop: 14,
      padding: '11px 13px',
      background: 'var(--status-sourced-tint)',
      border: '1px solid #B9D9C8',
      borderRadius: 'var(--radius-sm)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 17,
    style: {
      color: 'var(--status-sourced)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 13.5,
      fontWeight: 600,
      color: 'var(--status-sourced)'
    }
  }, "You're on the roster."))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--text-faint)',
      fontWeight: 600,
      marginBottom: 12
    }
  }, "The record"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, posts.map((p, i) => {
    const onRec = ['evidence', 'filing', 'testimony'].includes(p.type);
    const accent = {
      evidence: 'var(--post-evidence)',
      filing: 'var(--post-filing)',
      testimony: 'var(--post-testimony)'
    }[p.type] || 'var(--line-strong)';
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        border: '1px solid var(--line)',
        borderLeft: `3px solid ${accent}`,
        borderRadius: 'var(--radius-sm)',
        background: onRec ? 'var(--white)' : 'var(--paper-50)',
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 9,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(PostType, {
      type: p.type
    }), p.status ? /*#__PURE__*/React.createElement(TruthStatus, {
      status: p.status
    }) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        marginBottom: 9
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: p.author,
      size: "sm",
      ring: p.ring
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-text)',
        fontWeight: 700,
        fontSize: 13,
        color: 'var(--ink-900)'
      }
    }, p.author), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--text-faint)'
      }
    }, p.standing, " \xB7 ", p.when))), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-text)',
        fontSize: 13.5,
        lineHeight: 1.5,
        color: 'var(--text-body)',
        margin: 0
      }
    }, p.body));
  }))));
}
Object.assign(window, {
  JX_MobileDocket: MobileDocket,
  JX_MobileCaseFile: MobileCaseFile
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/MobileScreens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile-app/ios-frame.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports (to window): IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard
//
// Usage — wrap your screen content in <IOSDevice> to get the bezel, status bar
// and home indicator (props: title, dark, keyboard):
//
//   <IOSDevice title="Settings">
//     ...your screen content...
//   </IOSDevice>
//   <IOSDevice dark title="Search" keyboard>…</IOSDevice>
/* END USAGE */

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({
  dark = false,
  time = '9:41'
}) {
  const c = dark ? '#fff' : '#000';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 154,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '21px 24px 19px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 20,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '-apple-system, "SF Pro", system-ui',
      fontWeight: 590,
      fontSize: 17,
      lineHeight: '22px',
      color: c
    }
  }, time)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingTop: 1,
      paddingRight: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "12",
    viewBox: "0 0 19 12"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7.5",
    width: "3.2",
    height: "4.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.8",
    y: "5",
    width: "3.2",
    height: "7",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.6",
    y: "2.5",
    width: "3.2",
    height: "9.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.4",
    y: "0",
    width: "3.2",
    height: "12",
    rx: "0.7",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "12",
    viewBox: "0 0 17 12"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "10.5",
    r: "1.5",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "27",
    height: "13",
    viewBox: "0 0 27 13"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "23",
    height: "12",
    rx: "3.5",
    stroke: c,
    strokeOpacity: "0.35",
    fill: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "9",
    rx: "2",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z",
    fill: c,
    fillOpacity: "0.4"
  }))));
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({
  children,
  dark = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      minWidth: 44,
      borderRadius: 9999,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: dark ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({
  title = 'Title',
  dark = false,
  trailingIcon = true
}) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = content => /*#__PURE__*/React.createElement(IOSGlassPill, {
    dark: dark
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, content));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      paddingTop: 62,
      paddingBottom: 10,
      position: 'relative',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }
  }, pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "20",
    viewBox: "0 0 12 20",
    fill: "none",
    style: {
      marginLeft: -1
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 2L2 10l8 8",
    stroke: muted,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), trailingIcon && pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "6",
    viewBox: "0 0 22 6"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "3",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "3",
    r: "2.5",
    fill: muted
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px',
      fontFamily: '-apple-system, system-ui',
      fontSize: 34,
      fontWeight: 700,
      lineHeight: '41px',
      color: text,
      letterSpacing: 0.4
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({
  title,
  detail,
  icon,
  chevron = true,
  isLast = false,
  dark = false
}) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 52,
      padding: '0 16px',
      position: 'relative',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      letterSpacing: -0.43
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 7,
      background: icon,
      marginRight: 12,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      color: text
    }
  }, title), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      color: sec,
      marginRight: 6
    }
  }, detail), chevron && /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "14",
    viewBox: "0 0 8 14",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1l6 6-6 6",
    stroke: ter,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), !isLast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: icon ? 58 : 16,
      height: 0.5,
      background: sep
    }
  }));
}
function IOSList({
  header,
  children,
  dark = false
}) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return /*#__PURE__*/React.createElement("div", null, header && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '-apple-system, system-ui',
      fontSize: 13,
      color: hc,
      textTransform: 'uppercase',
      padding: '8px 36px 6px',
      letterSpacing: -0.08
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 26,
      margin: '0 16px',
      overflow: 'hidden'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
  title,
  keyboard = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: 48,
      overflow: 'hidden',
      position: 'relative',
      background: dark ? '#000' : '#F2F2F7',
      boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system, system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 11,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 126,
      height: 37,
      borderRadius: 24,
      background: '#000',
      zIndex: 50
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement(IOSStatusBar, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, title !== undefined && /*#__PURE__*/React.createElement(IOSNavBar, {
    title: title,
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, children), keyboard && /*#__PURE__*/React.createElement(IOSKeyboard, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 60,
      height: 34,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingBottom: 8,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 139,
      height: 5,
      borderRadius: 100,
      background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'
    }
  })));
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({
  dark = false
}) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: /*#__PURE__*/React.createElement("svg", {
      width: "19",
      height: "17",
      viewBox: "0 0 19 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z",
      fill: glyph
    })),
    del: /*#__PURE__*/React.createElement("svg", {
      width: "23",
      height: "17",
      viewBox: "0 0 23 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z",
      fill: "none",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 5l7 7M17 5l-7 7",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinecap: "round"
    })),
    ret: /*#__PURE__*/React.createElement("svg", {
      width: "20",
      height: "14",
      viewBox: "0 0 20 14"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M18 1v6H4m0 0l4-4M4 7l4 4",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))
  };
  const key = (content, {
    w,
    flex,
    ret,
    fs = 25,
    k
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      height: 42,
      borderRadius: 8.5,
      flex: flex ? 1 : undefined,
      width: w,
      minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs,
      fontWeight: 458,
      color: ret ? '#fff' : glyph
    }
  }, content);
  const row = (keys, pad = 0) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      justifyContent: 'center',
      padding: `0 ${pad}px`
    }
  }, keys.map(l => key(l, {
    flex: true,
    k: l
  })));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 15,
      borderRadius: 27,
      overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: dark ? '0 -2px 20px rgba(0,0,0,0.09)' : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      alignItems: 'center',
      padding: '8px 22px 13px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, ['"The"', 'the', 'to'].map((w, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 25,
      background: '#ccc',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      color: sugg,
      letterSpacing: -0.43,
      lineHeight: '22px'
    }
  }, w)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13,
      padding: '0 6.5px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], 20), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14.25,
      alignItems: 'center'
    }
  }, key(icons.shift, {
    w: 45,
    k: 'shift'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      flex: 1
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l, {
    flex: true,
    k: l
  }))), key(icons.del, {
    w: 45,
    k: 'del'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, key('ABC', {
    w: 92.25,
    fs: 18,
    k: 'abc'
  }), key('', {
    flex: true,
    k: 'space'
  }), key(icons.ret, {
    w: 92.25,
    ret: true,
    k: 'ret'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      width: '100%',
      position: 'relative'
    }
  }));
}
Object.assign(window, {
  IOSDevice,
  IOSStatusBar,
  IOSNavBar,
  IOSGlassPill,
  IOSList,
  IOSListRow,
  IOSKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile-app/ios-frame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/App.jsx
try { (() => {
/* JUSTICE — Web App: root (routing, shell, "Add to the record" composer) */
const {
  useState: useStateApp
} = React;
function Composer({
  open,
  onClose
}) {
  const {
    Button,
    Input,
    PostType,
    Tag
  } = window.DS;
  const Icon = window.TLWIcon;
  const [type, setType] = useStateApp('evidence');
  const types = ['evidence', 'filing', 'testimony', 'analysis', 'opinion', 'question'];
  const parties = ['Palantir', 'FDA', 'Dept. of Homeland Security'];
  if (!open) return null;
  const needsSource = ['evidence', 'filing'].includes(type);
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(12,24,38,0.5)',
      backdropFilter: 'blur(2px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: 580,
      maxWidth: '100%',
      background: 'var(--white)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--line-strong)',
      boxShadow: 'var(--shadow-pop)',
      padding: 26
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--gold-700)',
      fontWeight: 600
    }
  }, "Add to the record"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      border: 0,
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--slate-400)',
      padding: 2
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 20
  }))), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 25,
      color: 'var(--ink-900)',
      margin: '0 0 4px'
    }
  }, "File to the case."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 14,
      color: 'var(--text-muted)',
      margin: '0 0 20px'
    }
  }, "Pick a filing type. Evidence and motions require a source and enter the record."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--ink-800)',
      marginBottom: 9
    }
  }, "Filing type"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      marginBottom: 18
    }
  }, types.map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    onClick: () => setType(t),
    style: {
      border: 0,
      background: 'transparent',
      padding: 0,
      cursor: 'pointer',
      outline: type === t ? '2px solid var(--navy-600)' : 'none',
      outlineOffset: 2,
      borderRadius: 'var(--radius-xs)'
    }
  }, /*#__PURE__*/React.createElement(PostType, {
    type: t
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Statement",
    multiline: true,
    rows: 3,
    placeholder: "State the filing plainly. Be specific; cite what you can."
  }), needsSource ? /*#__PURE__*/React.createElement(Input, {
    label: "Source / exhibit",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "paperclip",
      size: 15
    }),
    placeholder: "URL, document, or filing reference \u2014 required",
    required: true
  }) : null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--ink-800)',
      marginBottom: 9
    }
  }, "Name the parties this concerns"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, parties.map(p => /*#__PURE__*/React.createElement(Tag, {
    key: p,
    color: "var(--navy-600)"
  }, p)), /*#__PURE__*/React.createElement(Tag, {
    onClick: () => {}
  }, "+ Add party")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: onClose
  }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "gavel",
      size: 16
    }),
    onClick: onClose
  }, "File to the record"))));
}
function App() {
  const [route, setRoute] = useStateApp('landing');
  const [branch, setBranch] = useStateApp('docket');
  const [composer, setComposer] = useStateApp(false);
  const Sidebar = window.JX_Sidebar,
    TopBar = window.JX_TopBar;
  function go(r, _m, b) {
    setRoute(r);
    if (b) setBranch(b);
    if (window.__main) window.__main.scrollTo(0, 0);
  }
  const inner = route === 'casefile' || route === 'campaign';
  const screen = route === 'campaign' ? /*#__PURE__*/React.createElement(window.JX_Campaign, {
    go: go
  }) : route === 'casefile' ? /*#__PURE__*/React.createElement(window.JX_CaseFile, {
    go: go,
    onCompose: () => setComposer(true)
  }) : /*#__PURE__*/React.createElement(window.JX_Landing, {
    go: go
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg-canvas)'
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    branch: inner ? null : branch,
    go: go
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    onOpen: () => setComposer(true),
    onBack: inner ? () => go('landing') : null,
    crumb: inner ? 'The Docket' : null
  }), /*#__PURE__*/React.createElement("main", {
    ref: el => window.__main = el,
    style: {
      flex: 1,
      overflowY: 'auto'
    }
  }, screen)), /*#__PURE__*/React.createElement(Composer, {
    open: composer,
    onClose: () => setComposer(false)
  }));
}
function boot() {
  const DS = window.TLW || window.TheLastWordDesignSystem_a9501e;
  if (!DS || !DS.CaseCard || !window.JX_Landing || !window.JX_CaseFile || !window.JX_Campaign || !window.JX_Sidebar) return setTimeout(boot, 30);
  window.DS = DS;
  ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
}
boot();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Campaign.jsx
try { (() => {
/* JUSTICE — Web App: Class Action / Campaign view (accountability rung "Act") */
const {
  useState: useStateCmp
} = React;
function StateBar({
  st,
  n,
  max
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--ink-800)',
      width: 26
    }
  }, st), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 8,
      background: 'var(--paper-100)',
      borderRadius: 99,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: n / max * 100 + '%',
      height: '100%',
      background: 'var(--navy-600)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-faint)',
      width: 42,
      textAlign: 'right'
    }
  }, n.toLocaleString('en-US')));
}
function Campaign({
  go
}) {
  const {
    EscalationLadder,
    TruthStatus,
    Avatar,
    Button,
    Tag
  } = window.DS;
  const Icon = window.TLWIcon;
  const c = window.JX_DATA.CAMPAIGN;
  const [joined, setJoined] = useStateCmp(false);
  const count = c.joined + (joined ? 1 : 0);
  const pct = Math.round(count / c.goal * 100);
  const maxSt = Math.max(...c.states.map(s => s.n));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1080,
      margin: '0 auto',
      padding: '30px 36px 80px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      height: 24,
      padding: '0 12px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--navy-700)',
      color: '#fff',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "users",
    size: 13
  }), " Class Action"), /*#__PURE__*/React.createElement(TruthStatus, {
    status: c.status
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--text-faint)'
    }
  }, "CASE ", c.caseId, " \xB7 Respondent \xB7 ", c.target)), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 36,
      lineHeight: 1.08,
      letterSpacing: '-0.015em',
      color: 'var(--ink-900)',
      margin: '0 0 12px',
      maxWidth: 820
    }
  }, c.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 16,
      color: 'var(--text-muted)',
      maxWidth: 720,
      lineHeight: 1.55,
      margin: 0
    }
  }, c.summary), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      padding: '20px 22px',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--white)',
      boxShadow: 'var(--shadow-1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      fontWeight: 600,
      marginBottom: 16
    }
  }, "Where this case stands"), /*#__PURE__*/React.createElement(EscalationLadder, {
    current: c.rung
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr',
      gap: 22,
      marginTop: 22,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--navy-300)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--navy-100)',
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 30,
      color: 'var(--navy-800)'
    }
  }, count.toLocaleString('en-US')), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--navy-600)'
    }
  }, "of ", c.goal.toLocaleString('en-US'), " goal \xB7 ", pct, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 10,
      background: 'rgba(27,58,91,0.14)',
      borderRadius: 99,
      overflow: 'hidden',
      margin: '12px 0 6px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: pct + '%',
      height: '100%',
      background: 'var(--navy-700)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 13.5,
      color: 'var(--navy-700)',
      marginBottom: 18
    }
  }, "plaintiffs joined across ", c.states.length, " states"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, c.roster.slice(0, 6).map((n, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      marginLeft: i ? -8 : 0,
      border: '2px solid var(--navy-100)',
      borderRadius: 99
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: n,
    size: "sm"
  })))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--navy-600)'
    }
  }, "+", (count - 6).toLocaleString('en-US'), " organizing")), !joined ? /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    fullWidth: true,
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "gavel",
      size: 18
    }),
    onClick: () => setJoined(true)
  }, "Join the class action") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 14px',
      background: 'var(--status-sourced-tint)',
      border: '1px solid #B9D9C8',
      borderRadius: 'var(--radius-sm)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 18,
    style: {
      color: 'var(--status-sourced)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--status-sourced)'
    }
  }, "You're on the roster. Counsel will be in touch.")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--navy-600)',
      marginTop: 12,
      lineHeight: 1.5
    }
  }, "Lead counsel \xB7 ", c.leadCounsel, /*#__PURE__*/React.createElement("br", null), "Filed ", c.filed, " \xB7 next hearing ", c.nextHearing)), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--white)',
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      fontWeight: 600,
      marginBottom: 14
    }
  }, "Plaintiffs by state"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, c.states.map(s => /*#__PURE__*/React.createElement(StateBar, {
    key: s.st,
    st: s.st,
    n: s.n,
    max: maxSt
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22,
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--white)',
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      fontWeight: 600
    }
  }, "Linked to the record"), /*#__PURE__*/React.createElement("button", {
    onClick: () => go('casefile'),
    style: {
      border: 0,
      background: 'transparent',
      cursor: 'pointer',
      fontFamily: 'var(--font-text)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--navy-700)'
    }
  }, "Open case file \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, c.exhibits.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '11px 13px',
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--paper-50)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "fileText",
    size: 16,
    style: {
      color: 'var(--gold-700)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      color: 'var(--ink-800)'
    }
  }, e.ref), /*#__PURE__*/React.createElement(TruthStatus, {
    status: e.status
  }))))));
}
window.JX_Campaign = Campaign;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Campaign.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/CaseFile.jsx
try { (() => {
/* JUSTICE — Web App: Case File (the hero) */
const {
  useState: useStateCF
} = React;
function PostCard({
  p
}) {
  const {
    PostType,
    TruthStatus,
    Avatar
  } = window.DS;
  const Icon = window.TLWIcon;
  const onRecord = ['evidence', 'filing', 'testimony'].includes(p.type);
  const accent = {
    evidence: 'var(--post-evidence)',
    filing: 'var(--post-filing)',
    testimony: 'var(--post-testimony)'
  }[p.type] || 'var(--line-strong)';
  const [v, setV] = useStateCF(p.votes);
  const [up, setUp] = useStateCF(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--line)',
      borderLeft: `3px solid ${accent}`,
      borderRadius: 'var(--radius-sm)',
      background: onRecord ? 'var(--white)' : 'var(--paper-50)',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 11,
      boxShadow: onRecord ? 'var(--shadow-1)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(PostType, {
    type: p.type
  }), p.status ? /*#__PURE__*/React.createElement(TruthStatus, {
    status: p.status
  }) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-faint)'
    }
  }, p.when)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: p.author,
    size: "sm",
    ring: p.ring
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-text)',
      fontWeight: 700,
      fontSize: 13.5,
      color: 'var(--ink-900)'
    }
  }, p.author), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      color: 'var(--text-faint)'
    }
  }, p.standing))), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 14.5,
      lineHeight: 1.55,
      color: 'var(--text-body)',
      margin: 0
    }
  }, p.body), p.source ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 11px',
      background: 'var(--paper-100)',
      borderRadius: 'var(--radius-xs)',
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--navy-700)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "paperclip",
    size: 13
  }), " ", p.source) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setUp(!up);
      setV(up ? v - 1 : v + 1);
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      border: `1px solid ${up ? accent : 'var(--line-strong)'}`,
      background: up ? accent : 'transparent',
      color: up ? '#fff' : 'var(--text-muted)',
      borderRadius: 'var(--radius-pill)',
      padding: '4px 11px',
      cursor: 'pointer',
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      fontWeight: 600
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "arrowUp",
    size: 14
  }), " ", v.toLocaleString('en-US')), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--text-faint)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message",
    size: 13
  }), " Respond"), !onRecord ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-faint)'
    }
  }, "\xB7 off the record") : null));
}
function CaseFile({
  go,
  onCompose
}) {
  const {
    EntityHeader,
    TruthStatus,
    EscalationLadder,
    EvidenceMeter,
    Button
  } = window.DS;
  const Icon = window.TLWIcon;
  const {
    PALANTIR,
    CASES,
    POSTS
  } = window.JX_DATA;
  const cs = CASES[0];
  const [filter, setFilter] = useStateCF('All');
  const filters = ['All', 'On the record', 'Evidence', 'Motion', 'Testimony', 'Crowd'];
  const recordTypes = ['evidence', 'filing', 'testimony'];
  const posts = POSTS.filter(p => {
    if (filter === 'All') return true;
    if (filter === 'On the record') return recordTypes.includes(p.type);
    if (filter === 'Crowd') return !recordTypes.includes(p.type);
    if (filter === 'Evidence') return p.type === 'evidence';
    if (filter === 'Motion') return p.type === 'filing';
    if (filter === 'Testimony') return p.type === 'testimony';
    return true;
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1080,
      margin: '0 auto',
      padding: '28px 36px 80px'
    }
  }, /*#__PURE__*/React.createElement(EntityHeader, PALANTIR), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--text-faint)'
    }
  }, "CASE ", cs.id), /*#__PURE__*/React.createElement(TruthStatus, {
    status: cs.status
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--text-faint)'
    }
  }, "\u25C7 ", cs.geo)), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 34,
      lineHeight: 1.1,
      letterSpacing: '-0.015em',
      color: 'var(--ink-900)',
      margin: '10px 0 0',
      maxWidth: 820
    }
  }, cs.title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 16,
      color: 'var(--text-muted)',
      maxWidth: 720,
      lineHeight: 1.55,
      margin: '12px 0 0'
    }
  }, cs.summary), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      padding: 22,
      border: '1px solid var(--line)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--white)',
      boxShadow: 'var(--shadow-1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      fontWeight: 600,
      marginBottom: 16
    }
  }, "Where this case stands"), /*#__PURE__*/React.createElement(EscalationLadder, {
    current: cs.rung
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 28,
      alignItems: 'flex-end',
      marginTop: 24,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 260
    }
  }, /*#__PURE__*/React.createElement(EvidenceMeter, {
    evidence: cs.evidence,
    filings: cs.filings,
    testimony: cs.testimony
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "users",
      size: 17
    }),
    onClick: () => go && go('campaign')
  }, "Join the class action"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 16
    }),
    onClick: onCompose
  }, "Add to the record"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      paddingTop: 14,
      borderTop: '1px solid var(--line)',
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--text-faint)'
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--text-muted)'
    }
  }, cs.joined.toLocaleString('en-US')), " organizing \xB7 next rung: ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--gold-700)'
    }
  }, "Injunction"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      margin: '30px 0 16px',
      flexWrap: 'wrap'
    }
  }, filters.map(f => /*#__PURE__*/React.createElement(window.DS.Tag, {
    key: f,
    active: filter === f,
    onClick: () => setFilter(f)
  }, f))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, posts.map((p, i) => /*#__PURE__*/React.createElement(PostCard, {
    key: i,
    p: p
  }))));
}
window.JX_CaseFile = CaseFile;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/CaseFile.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Icons.jsx
try { (() => {
/* The Last Word — Icons (Lucide path data, MIT). Stroke style, 24px grid. */

const ICONS = {
  gavel: '<path d="m14.5 12.5-8 8a2.12 2.12 0 1 1-3-3l8-8"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  landmark: '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  arrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  arrowDown: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  fileText: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  paperclip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  quote: '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>',
  trending: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>'
};
function Icon({
  name,
  size = 18,
  stroke = 2,
  fill = 'none',
  className = '',
  style
}) {
  const inner = ICONS[name] || '';
  return /*#__PURE__*/React.createElement("svg", {
    className: className,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: fill,
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      display: 'block',
      flex: 'none',
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: inner
    }
  });
}
window.TLWIcon = Icon;
window.TLW_ICONS = ICONS;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Icons.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Landing.jsx
try { (() => {
/* JUSTICE — Web App: The Docket (landing) */
const {
  useState: useStateLd
} = React;
function Landing({
  go
}) {
  const {
    CaseCard,
    Tag
  } = window.DS;
  const Icon = window.TLWIcon;
  const {
    CASES
  } = window.JX_DATA;
  const [f, setF] = useStateLd('All');
  const filters = ['All', 'Investigations', 'Class Actions', 'Prosecutions'];
  const map = {
    Investigations: 'investigations',
    'Class Actions': 'classactions',
    Prosecutions: 'prosecutions'
  };
  const list = CASES.filter(c => f === 'All' || c.branch === map[f]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1120,
      margin: '0 auto',
      padding: '34px 40px 72px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--gold-700)',
      fontWeight: 600,
      marginBottom: 8
    }
  }, "318 active cases \xB7 2.4M organizing"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 44,
      letterSpacing: '-0.02em',
      lineHeight: 1,
      color: 'var(--ink-900)',
      margin: '0 0 10px'
    }
  }, "The Docket"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 16,
      color: 'var(--text-muted)',
      margin: 0,
      maxWidth: 560,
      lineHeight: 1.5
    }
  }, "See something wrong, build the case in the open, and move it through due process. The court records the evidence \u2014 it never rules on the truth for you.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 22,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      height: 40,
      padding: '0 13px',
      background: 'var(--white)',
      border: '1px solid var(--line-strong)',
      borderRadius: 'var(--radius-xs)',
      minWidth: 260
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 16,
    style: {
      color: 'var(--slate-400)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Search by party, case, or geo\u2026",
    style: {
      border: 0,
      background: 'transparent',
      outline: 'none',
      flex: 1,
      fontFamily: 'var(--font-text)',
      fontSize: 14,
      color: 'var(--ink-900)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), filters.map(x => /*#__PURE__*/React.createElement(Tag, {
    key: x,
    active: f === x,
    onClick: () => setF(x)
  }, x))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 18
    }
  }, list.map(c => /*#__PURE__*/React.createElement(CaseCard, {
    key: c.id,
    id: c.id,
    target: c.target,
    title: c.title,
    summary: c.summary,
    status: c.status,
    rung: c.rung,
    evidence: c.evidence,
    filings: c.filings,
    testimony: c.testimony,
    geo: c.geo,
    joined: c.joined,
    onOpen: () => go(c.branch === 'classactions' ? 'campaign' : 'casefile')
  }))));
}
window.JX_Landing = Landing;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Landing.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/Shell.jsx
try { (() => {
/* JUSTICE — Web App: Shell (navy war-room sidebar, top bar) */
const {
  useState: useStateShell
} = React;
function JxLogo() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "30",
    height: "30",
    viewBox: "0 0 120 120",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "60",
    cy: "60",
    r: "50",
    fill: "#0C1826",
    stroke: "#B8902F",
    strokeWidth: "3"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "44",
    y1: "52",
    x2: "76",
    y2: "52",
    stroke: "#B8902F",
    strokeWidth: "3.2",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "60",
    y1: "48",
    x2: "60",
    y2: "76",
    stroke: "#B8902F",
    strokeWidth: "3.2",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "49",
    y1: "76",
    x2: "71",
    y2: "76",
    stroke: "#B8902F",
    strokeWidth: "3.2",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "44",
    cy: "52",
    r: "3.6",
    fill: "#E5A23A"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "76",
    cy: "52",
    r: "3.6",
    fill: "#E5A23A"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 19,
      letterSpacing: '0.04em',
      color: '#fff',
      lineHeight: 1
    }
  }, "JUSTICE"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 8.5,
      letterSpacing: '0.2em',
      color: 'var(--gold-400)',
      textTransform: 'uppercase',
      marginTop: 3
    }
  }, "We the People")));
}
function BranchItem({
  icon,
  label,
  count,
  active,
  onClick
}) {
  const Icon = window.TLWIcon;
  const [h, setH] = useStateShell(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      width: '100%',
      padding: '9px 12px',
      border: 0,
      cursor: 'pointer',
      textAlign: 'left',
      borderRadius: 'var(--radius-xs)',
      fontFamily: 'var(--font-text)',
      fontWeight: active ? 700 : 500,
      fontSize: 14,
      color: active ? '#fff' : '#AEC0D4',
      background: active ? 'rgba(184,144,47,0.16)' : h ? 'rgba(255,255,255,0.05)' : 'transparent',
      borderLeft: active ? '2px solid #C9A227' : '2px solid transparent'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 17,
    stroke: active ? 2.2 : 1.8,
    style: {
      color: active ? 'var(--gold-400)' : '#7E93A9'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: active ? 'var(--gold-400)' : '#5E748C'
    }
  }, count));
}
function Sidebar({
  branch,
  go
}) {
  const Icon = window.TLWIcon;
  const {
    BRANCHES
  } = window.JX_DATA;
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 256,
      flex: 'none',
      height: '100%',
      boxSizing: 'border-box',
      background: 'var(--navy-900)',
      display: 'flex',
      flexDirection: 'column',
      padding: '22px 16px 16px',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.035) 1px, transparent 0)',
      backgroundSize: '20px 20px',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      padding: '0 6px 22px'
    }
  }, /*#__PURE__*/React.createElement(JxLogo, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: 38,
      padding: '0 12px',
      borderRadius: 'var(--radius-xs)',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.10)',
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 16,
    style: {
      color: '#7E93A9'
    }
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Search entities, cases, geo\u2026",
    style: {
      border: 0,
      background: 'transparent',
      outline: 'none',
      flex: 1,
      fontFamily: 'var(--font-text)',
      fontSize: 13,
      color: '#E8EEF4'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      padding: '0 8px 10px',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: '#5E748C'
    }
  }, "Due Process"), /*#__PURE__*/React.createElement("nav", {
    style: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, BRANCHES.map(b => /*#__PURE__*/React.createElement(BranchItem, {
    key: b.key,
    icon: b.icon,
    label: b.label,
    count: b.count,
    active: branch === b.key,
    onClick: () => go('landing', null, b.key)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 'var(--radius-sm)',
      padding: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield",
    size: 14,
    style: {
      color: 'var(--gold-400)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: '#7E93A9'
    }
  }, "Your standing")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontWeight: 700,
      fontSize: 24,
      color: '#fff'
    }
  }, "7,240"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-text)',
      fontSize: 12,
      color: '#7E93A9'
    }
  }, "Verified contributor \xB7 Denver, CO")));
}
function TopBar({
  onOpen,
  onBack,
  crumb
}) {
  const Icon = window.TLWIcon;
  const {
    Button,
    Avatar
  } = window.DS;
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height: 62,
      flex: 'none',
      boxSizing: 'border-box',
      borderBottom: '1px solid var(--line)',
      background: 'var(--white)',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '0 24px'
    }
  }, onBack ? /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      border: 0,
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-text)',
      fontSize: 14,
      fontWeight: 600,
      padding: '6px 8px',
      marginLeft: -8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "chevronLeft",
    size: 18
  }), " ", crumb || 'Back') : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--text-faint)'
    }
  }, "Due Process"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--text-muted)'
    }
  }, "Complaint \u2192 Investigation \u2192 Discovery \u2192 Injunction \u2192 Class Action \u2192 Trial \u2192 Judgment")), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    iconLeft: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 17
    }),
    onClick: onOpen
  }, "Open a case"), /*#__PURE__*/React.createElement("button", {
    style: {
      border: 0,
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--ink-700)',
      padding: 6,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 20,
    stroke: 1.9
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 5,
      right: 6,
      width: 7,
      height: 7,
      borderRadius: 99,
      background: 'var(--gold-600)',
      border: '1.5px solid var(--white)'
    }
  })), /*#__PURE__*/React.createElement(Avatar, {
    name: "Jordan Pike",
    size: "md",
    ring: true
  }));
}
Object.assign(window, {
  JX_Sidebar: Sidebar,
  JX_TopBar: TopBar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/Shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web-app/data.js
try { (() => {
/* JUSTICE — case data. Accountability cases attach to neutral entity atoms.
   The platform never rules on truth; claims carry a Discovery-Ladder status. */

const BRANCHES = [{
  key: 'docket',
  label: 'The Docket',
  icon: 'home',
  count: 318
}, {
  key: 'investigations',
  label: 'Investigations',
  icon: 'search',
  count: 239
}, {
  key: 'filings',
  label: 'Filings & Motions',
  icon: 'fileText',
  count: 142
}, {
  key: 'classactions',
  label: 'Class Actions',
  icon: 'users',
  count: 93
}, {
  key: 'prosecutions',
  label: 'Prosecutions',
  icon: 'gavel',
  count: 50
}, {
  key: 'judgments',
  label: 'Judgments',
  icon: 'shield',
  count: 64
}];

/* The hero entity — neutral atom, home realm = Society. */
const PALANTIR = {
  name: 'Palantir',
  kind: 'Corporation',
  sector: 'Big Tech',
  geo: 'National · Global',
  realmPath: ['Public Registry', 'Corporations'],
  contestedTags: [{
    label: 'Surveillance',
    lean: 'negative'
  }, {
    label: 'Defense contractor',
    lean: 'neutral'
  }, {
    label: 'Innovator',
    lean: 'positive'
  }]
};
const CASES = [{
  id: 'JX-PALANTIR-014',
  target: 'Palantir',
  title: 'Mass-surveillance contracts and the capture of public agencies',
  summary: 'An investigation into government data contracts and revolving-door hiring across agencies.',
  status: 'emerging',
  rung: 'evidence',
  branch: 'investigations',
  evidence: 18,
  filings: 3,
  testimony: 7,
  geo: 'National · US',
  joined: 2480
}, {
  id: 'JX-PHARMA-061',
  target: 'Big Pharma',
  title: 'Opioid marketing and the suppression of internal safety data',
  summary: 'Pattern case linking marketing playbooks across manufacturers.',
  status: 'sourced',
  rung: 'prosecute',
  branch: 'prosecutions',
  evidence: 41,
  filings: 12,
  testimony: 19,
  geo: 'National · US',
  joined: 9120
}, {
  id: 'JX-WEF-022',
  target: 'World Economic Forum',
  title: 'Influence of unelected bodies on national policy',
  summary: 'Contested analysis of advisory channels and revolving-door appointments.',
  status: 'fringe',
  rung: 'investigate',
  branch: 'investigations',
  evidence: 6,
  filings: 0,
  testimony: 4,
  geo: 'International',
  joined: 5340
}, {
  id: 'JX-WALMART-008',
  target: 'Walmart',
  title: 'Wage-theft class action across distribution centers',
  summary: 'Active class action with joined plaintiffs in nine states.',
  status: 'accepted',
  rung: 'act',
  branch: 'classactions',
  evidence: 22,
  filings: 8,
  testimony: 31,
  geo: 'National · US',
  joined: 14200
}, {
  id: 'JX-FDA-039',
  target: 'FDA',
  title: 'Advisory-panel conflicts of interest in fast-track approvals',
  summary: 'Investigation into disclosed and undisclosed financial ties.',
  status: 'emerging',
  rung: 'demand',
  branch: 'investigations',
  evidence: 14,
  filings: 2,
  testimony: 5,
  geo: 'National · US',
  joined: 3010
}];

/* Post stream for the Palantir case file. Type drives weight + record status. */
const POSTS = [{
  type: 'evidence',
  author: 'Dana Reyes',
  standing: 'Verified · 9.2k',
  when: '2h ago',
  votes: 412,
  body: 'FOIA release: 2019–2024 contract line-items between the agency and the vendor, including the data-integration scope.',
  source: 'foia.gov/release/4821 · PDF, 214 pp',
  status: 'sourced',
  geo: 'National · US'
}, {
  type: 'filing',
  author: 'Equal Liberties Project',
  standing: 'Org · verified',
  when: '5h ago',
  votes: 288,
  body: 'Cease & Desist issued demanding suspension of biometric data-sharing pending audit. Filed and served.',
  source: 'Filing JX-F-2231 · status: served',
  status: 'accepted',
  rung: 'demand'
}, {
  type: 'testimony',
  author: 'Anon — verified former staff',
  standing: 'Whistleblower',
  when: '1d ago',
  votes: 631,
  ring: true,
  body: 'Internal tooling let analysts join datasets across agencies without a per-query warrant check. I flagged it twice; the tickets were closed.',
  status: 'emerging'
}, {
  type: 'analysis',
  author: 'Marcus Vale',
  standing: '4.1k standing',
  when: '8h ago',
  votes: 140,
  body: 'Mapping the revolving door: six named officials moved between the agency and the vendor in 4 years. This fits the Institutional Capture pattern.',
  status: 'emerging'
}, {
  type: 'opinion',
  author: 'J. Okonkwo',
  standing: '820 standing',
  when: '6h ago',
  votes: 54,
  body: 'Procurement at this scale should never be sole-sourced. This is the real story.',
  status: 'unsourced'
}, {
  type: 'reaction',
  author: 'R. Singh',
  standing: '210 standing',
  when: '3h ago',
  votes: 12,
  body: 'Following. This needs daylight.',
  status: 'unsourced'
}];

/* Class-action campaign detail (Walmart wage-theft case). */
const CAMPAIGN = {
  caseId: 'JX-WALMART-008',
  target: 'Walmart',
  title: 'Wage-theft class action across distribution centers',
  summary: 'A certified class action alleging unpaid overtime and off-the-clock work across nine states. Joined plaintiffs are organizing under shared counsel.',
  status: 'accepted',
  rung: 'act',
  joined: 14200,
  goal: 20000,
  filed: '2025-11-02',
  nextHearing: '2026-07-14',
  leadCounsel: 'Okafor · Reyes · Lindqvist LLP',
  states: [{
    st: 'CA',
    n: 3120
  }, {
    st: 'TX',
    n: 2480
  }, {
    st: 'FL',
    n: 1890
  }, {
    st: 'IL',
    n: 1340
  }, {
    st: 'OH',
    n: 1110
  }, {
    st: 'GA',
    n: 980
  }, {
    st: 'PA',
    n: 870
  }, {
    st: 'AZ',
    n: 760
  }, {
    st: 'NC',
    n: 650
  }],
  roster: ['Ana M.', 'Devon P.', 'Grace O.', 'Hassan R.', 'Lena K.', 'Marcus V.', 'Priya S.', 'Tom B.'],
  exhibits: [{
    ref: 'EX-114 · timeclock audit (9 sites)',
    status: 'sourced'
  }, {
    ref: 'EX-121 · payroll variance report',
    status: 'sourced'
  }, {
    ref: 'MOT-08 · motion to certify class',
    status: 'accepted'
  }]
};
window.JX_DATA = {
  BRANCHES,
  PALANTIR,
  CASES,
  POSTS,
  CAMPAIGN
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web-app/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.CaseCard = __ds_scope.CaseCard;

__ds_ns.EntityHeader = __ds_scope.EntityHeader;

__ds_ns.EscalationLadder = __ds_scope.EscalationLadder;

__ds_ns.EvidenceMeter = __ds_scope.EvidenceMeter;

__ds_ns.PostType = __ds_scope.PostType;

__ds_ns.TruthStatus = __ds_scope.TruthStatus;

})();
