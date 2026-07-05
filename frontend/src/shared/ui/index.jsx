import React from "react";

// Toggle switch — used ~40 times across settings
export function Toggle({ value, onChange }) {
  const on = value !== false;
  return (
    <button type="button" onClick={() => onChange(!on)}
      className={`w-10 h-5 rounded-full transition-colors shrink-0 ${on ? "bg-blue-500" : "bg-slate-200"}`}>
      <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${on ? "translate-x-5" : "translate-x-0"}`}/>
    </button>
  );
}

// Labeled toggle row
export function ToggleRow({ label, value, onChange, className = "" }) {
  return (
    <div className={`flex items-center justify-between mb-1 ${className}`}>
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <Toggle value={value} onChange={onChange}/>
    </div>
  );
}

// Circular color picker
export function CircleColor({ value, onChange }) {
  return (
    <div className="relative h-6 w-6 rounded-full overflow-hidden border-2 border-slate-200 shrink-0 cursor-pointer" style={{backgroundColor: value}}>
      <input type="color" value={value?.startsWith("#") ? value : "#141414"} onChange={onChange} className="absolute opacity-0 inset-0 w-8 h-8 cursor-pointer" style={{margin: "-4px"}}/>
    </div>
  );
}

// Color picker with label + reset arrow
export function TextColorPicker({ label, colorKey, defaultColor, data, set }) {
  const hasChanged = data[colorKey] && data[colorKey] !== (defaultColor || "");
  return (
    <div className="flex items-center gap-3 mt-2">
      <span className="text-xs text-slate-500">{label}</span>
      <CircleColor value={data[colorKey] || defaultColor || "#141414"} onChange={e => set(colorKey, e.target.value)}/>
      {hasChanged && <button onClick={() => set(colorKey, defaultColor || "")} className="text-xs text-red-400 hover:text-red-600">↺</button>}
    </div>
  );
}

// Inline color with label
export function ColorDot({ label, value, defaultValue, onChange }) {
  return (
    <>
      <span className="text-xs text-slate-500">{label}</span>
      <CircleColor value={value || defaultValue} onChange={onChange}/>
    </>
  );
}

// ColorPicker with Text + BG colors and reset arrow
export function ColorPicker({ label, colorKey, bgKey, defaultColor, defaultBg, data, set }) {
  const colorChanged = data[colorKey] && data[colorKey] !== defaultColor;
  const bgChanged = data[bgKey] && data[bgKey] !== defaultBg;
  return (
    <div className="flex items-center gap-3 mt-2">
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
          Text
          <CircleColor value={data[colorKey] || defaultColor || "#141414"} onChange={e => set(colorKey, e.target.value)}/>
        </label>
        <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
          BG
          <CircleColor value={data[bgKey] || defaultBg || "#ffffff"} onChange={e => set(bgKey, e.target.value)}/>
        </label>
        {(colorChanged || bgChanged) && (
          <button onClick={() => { set(colorKey, defaultColor || ""); set(bgKey, defaultBg || ""); }}
            className="text-xs text-red-400 hover:text-red-600">↺</button>
        )}
      </div>
    </div>
  );
}
