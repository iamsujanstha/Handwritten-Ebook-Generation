import React, { useState, useEffect } from "react";
import { 
  Image as ImageIcon, 
  Trash2, 
  Check, 
  Palette, 
  BookOpen, 
  Layers, 
  Sliders, 
  Eye, 
  ExternalLink,
  FileText,
  Compass,
  Cpu,
  Bookmark,
  Atom
} from "lucide-react";
import { useNotebookStore } from "../store/useNotebookStore";
import { generateCoverPageHtml, sanitizeCoverImageUrl } from "../lib/coverGenerator";
import { CoverPageConfig } from "../types";
import { AutoSaveIndicator } from "./AutoSaveIndicator";

const COLOR_SWATCHES = [
  { name: "Ink Blue", hex: "#1c4b82" },
  { name: "Amber Bronze", hex: "#b45309" },
  { name: "Forest Emerald", hex: "#047857" },
  { name: "Ruby Crimson", hex: "#b91c1c" },
  { name: "Deep Violet", hex: "#4338ca" },
  { name: "Slate Carbon", hex: "#0f172a" },
];

const TEMPLATES: { id: CoverPageConfig["template"]; label: string; desc: string; iconBg: string }[] = [
  { 
    id: "notebook", 
    label: "Field Notebook", 
    desc: "Ruled paper with red margin line, Patrick Hand typography & sketch plate",
    iconBg: "bg-amber-100 text-amber-900 border-amber-300"
  },
  { 
    id: "blueprint", 
    label: "Engineering Blueprint", 
    desc: "Dark cyan technical grid, CAD linework & approved specs block",
    iconBg: "bg-sky-950 text-sky-400 border-sky-600"
  },
  { 
    id: "minimal", 
    label: "Modern Minimalist", 
    desc: "Crisp white canvas, high negative space & architectural layout",
    iconBg: "bg-slate-100 text-slate-800 border-slate-300"
  },
  { 
    id: "vintage", 
    label: "Vintage Hardcover", 
    desc: "Antique espresso bookcloth, warm gold foil accents & cameo frame",
    iconBg: "bg-stone-900 text-amber-300 border-amber-600"
  },
  { 
    id: "modern", 
    label: "Bold Editorial", 
    desc: "Vibrant accent banner, bold typography & high-contrast card",
    iconBg: "bg-indigo-50 text-indigo-700 border-indigo-300"
  },
];

const createEmblemDataUri = (svgStr: string) => 
  `data:image/svg+xml;utf8,${encodeURIComponent(svgStr.trim())}`;

// Curated Zero-AI Vector Emblems (rendered with 0 Gemini quota)
const PRESET_EMBLEMS = [
  {
    id: "drafting",
    name: "Engineering Compass",
    desc: "Architectural & Technical Drafting",
    icon: Compass,
    svg: createEmblemDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400"><circle cx="200" cy="200" r="180" fill="none" stroke="#1c4b82" stroke-width="4" stroke-dasharray="8 6"/><circle cx="200" cy="200" r="150" fill="none" stroke="#1c4b82" stroke-width="2"/><circle cx="200" cy="200" r="12" fill="#1c4b82"/><line x1="200" y1="20" x2="200" y2="380" stroke="#1c4b82" stroke-width="1.5" stroke-dasharray="4 4"/><line x1="20" y1="200" x2="380" y2="200" stroke="#1c4b82" stroke-width="1.5" stroke-dasharray="4 4"/><path d="M200 60 L140 330 M200 60 L260 330 M150 250 L250 250" fill="none" stroke="#1c4b82" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="200" cy="60" r="16" fill="#1c4b82"/></svg>`)
  },
  {
    id: "system",
    name: "Systems & Circuits",
    desc: "Network Nodes & Architecture",
    icon: Cpu,
    svg: createEmblemDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400"><rect x="40" y="40" width="320" height="320" rx="16" fill="none" stroke="#1c4b82" stroke-width="4"/><rect x="120" y="120" width="160" height="160" rx="8" fill="none" stroke="#1c4b82" stroke-width="5"/><circle cx="200" cy="200" r="36" fill="#1c4b82" fill-opacity="0.1" stroke="#1c4b82" stroke-width="4"/><path d="M120 160 H60 M120 200 H60 M120 240 H60 M280 160 H340 M280 200 H340 M280 240 H340 M160 120 V60 M200 120 V60 M240 120 V60 M160 280 V340 M200 280 V340 M240 280 V340" stroke="#1c4b82" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="160" r="6" fill="#1c4b82"/><circle cx="60" cy="200" r="6" fill="#1c4b82"/><circle cx="60" cy="240" r="6" fill="#1c4b82"/><circle cx="340" cy="160" r="6" fill="#1c4b82"/><circle cx="340" cy="200" r="6" fill="#1c4b82"/><circle cx="340" cy="240" r="6" fill="#1c4b82"/></svg>`)
  },
  {
    id: "knowledge",
    name: "Open Manual",
    desc: "Documentation & Reference",
    icon: Bookmark,
    svg: createEmblemDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400"><circle cx="200" cy="200" r="170" fill="none" stroke="#1c4b82" stroke-width="3"/><path d="M200 130 C160 100 100 100 70 120 V300 C100 280 160 280 200 310 C240 280 300 280 330 300 V120 C300 100 240 100 200 130 Z" fill="none" stroke="#1c4b82" stroke-width="6" stroke-linejoin="round"/><line x1="200" y1="130" x2="200" y2="310" stroke="#1c4b82" stroke-width="5"/><line x1="100" y1="160" x2="175" y2="160" stroke="#1c4b82" stroke-width="3" stroke-linecap="round"/><line x1="100" y1="200" x2="175" y2="200" stroke="#1c4b82" stroke-width="3" stroke-linecap="round"/><line x1="100" y1="240" x2="160" y2="240" stroke="#1c4b82" stroke-width="3" stroke-linecap="round"/><line x1="225" y1="160" x2="300" y2="160" stroke="#1c4b82" stroke-width="3" stroke-linecap="round"/><line x1="225" y1="200" x2="300" y2="200" stroke="#1c4b82" stroke-width="3" stroke-linecap="round"/><line x1="225" y1="240" x2="285" y2="240" stroke="#1c4b82" stroke-width="3" stroke-linecap="round"/></svg>`)
  },
  {
    id: "science",
    name: "Atomic Research",
    desc: "Physics, Science & Calculations",
    icon: Atom,
    svg: createEmblemDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400"><circle cx="200" cy="200" r="28" fill="#1c4b82"/><ellipse cx="200" cy="200" rx="160" ry="60" fill="none" stroke="#1c4b82" stroke-width="4" transform="rotate(0 200 200)"/><ellipse cx="200" cy="200" rx="160" ry="60" fill="none" stroke="#1c4b82" stroke-width="4" transform="rotate(60 200 200)"/><ellipse cx="200" cy="200" rx="160" ry="60" fill="none" stroke="#1c4b82" stroke-width="4" transform="rotate(120 200 200)"/><circle cx="60" cy="200" r="10" fill="#1c4b82"/><circle cx="280" cy="338" r="10" fill="#1c4b82"/><circle cx="280" cy="62" r="10" fill="#1c4b82"/></svg>`)
  }
];

export const CoverEditor: React.FC = () => {
  const { coverConfig, updateCoverConfig, title } = useNotebookStore();

  const [scale, setScale] = useState<number>(0.75);

  // Normalize legacy unencoded SVG in state if present
  useEffect(() => {
    if (coverConfig.imageUrl) {
      const sanitized = sanitizeCoverImageUrl(coverConfig.imageUrl);
      if (sanitized && sanitized !== coverConfig.imageUrl) {
        updateCoverConfig({ imageUrl: sanitized });
      }
    }
  }, [coverConfig.imageUrl, updateCoverConfig]);

  // Sync title from store if cover title is empty
  useEffect(() => {
    if (!coverConfig.title && title) {
      updateCoverConfig({ title });
    }
  }, [title, coverConfig.title, updateCoverConfig]);

  // Construct iframe document
  const coverHtml = generateCoverPageHtml(coverConfig);
  const iframeDoc = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Cover Preview</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Patrick+Hand&family=Patrick+Hand+SC&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          body, html {
            margin: 0;
            padding: 0;
            background: transparent;
            font-family: 'Patrick Hand', cursive, sans-serif;
            display: flex;
            justify-content: center;
          }
          img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        ${coverHtml}
      </body>
    </html>
  `;

  // Open Preview in new tab
  const handleOpenPreviewTab = () => {
    const blob = new Blob([iframeDoc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-100">
      {/* LEFT: Customizer Form */}
      <div className="w-[440px] xl:w-[480px] bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto shadow-sm">
        
        {/* Top Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase">Cover Page Designer</h2>
                  <AutoSaveIndicator compact />
                </div>
                <p className="text-xs text-slate-500">Customize title, template & AI cover art</p>
              </div>
            </div>

            {/* Toggle Switch */}
            <label className="flex items-center cursor-pointer select-none">
              <span className="text-xs font-semibold text-slate-600 mr-2">
                {coverConfig.enabled ? "Active" : "Disabled"}
              </span>
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={coverConfig.enabled}
                  onChange={(e) => updateCoverConfig({ enabled: e.target.checked })}
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${coverConfig.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${coverConfig.enabled ? 'transform translate-x-4' : ''}`}></div>
              </div>
            </label>
          </div>
        </div>

        <div className="p-6 space-y-6">
          
          {/* SECTION 1: Cover Typography & Metadata */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Book Information
              </span>
              {title && title !== coverConfig.title && (
                <button 
                  type="button"
                  onClick={() => updateCoverConfig({ title })}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium underline"
                >
                  Sync notebook title
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Book Title</label>
              <input
                type="text"
                value={coverConfig.title}
                onChange={(e) => updateCoverConfig({ title: e.target.value })}
                placeholder="Engineering Systems Manual"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Subtitle / Tagline</label>
              <textarea
                rows={2}
                value={coverConfig.subtitle}
                onChange={(e) => updateCoverConfig({ subtitle: e.target.value })}
                placeholder="Architecture, Implementation Protocols & Field Reference"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">Author / Team</label>
                  {coverConfig.author && (
                    <button
                      type="button"
                      onClick={() => updateCoverConfig({ author: "" })}
                      className="text-[10px] text-slate-400 hover:text-red-500 font-medium transition-colors"
                      title="Clear author"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={coverConfig.author}
                  onChange={(e) => updateCoverConfig({ author: e.target.value })}
                  placeholder="Optional (leave blank to omit)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">Edition / Date</label>
                  {coverConfig.edition && (
                    <button
                      type="button"
                      onClick={() => updateCoverConfig({ edition: "" })}
                      className="text-[10px] text-slate-400 hover:text-red-500 font-medium transition-colors"
                      title="Clear edition"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={coverConfig.edition}
                  onChange={(e) => updateCoverConfig({ edition: e.target.value })}
                  placeholder="Optional (leave blank to omit)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* SECTION 2: Design Template */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
              <Layers className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Cover Design Template
            </span>

            <div className="grid grid-cols-1 gap-2.5">
              {TEMPLATES.map((tmpl) => {
                const isSelected = coverConfig.template === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => updateCoverConfig({ template: tmpl.id })}
                    className={`flex items-start text-left p-3 rounded-lg border-2 transition-all ${
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-md border flex items-center justify-center font-bold text-xs shrink-0 mr-3 ${tmpl.iconBg}`}>
                      {tmpl.label.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{tmpl.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{tmpl.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent Color Picker */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700 flex items-center">
              <Palette className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Accent Color
            </label>
            <div className="flex items-center space-x-2">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch.hex}
                  type="button"
                  title={swatch.name}
                  onClick={() => updateCoverConfig({ accentColor: swatch.hex })}
                  style={{ backgroundColor: swatch.hex }}
                  className={`w-7 h-7 rounded-full transition-transform border-2 ${
                    coverConfig.accentColor === swatch.hex 
                      ? 'border-slate-900 scale-110 shadow-md ring-2 ring-indigo-300' 
                      : 'border-white hover:scale-105 shadow-sm'
                  }`}
                />
              ))}
              <input
                type="color"
                value={coverConfig.accentColor || "#1c4b82"}
                onChange={(e) => updateCoverConfig({ accentColor: e.target.value })}
                className="w-7 h-7 p-0 rounded-full border border-slate-300 cursor-pointer overflow-hidden"
                title="Custom color"
              />
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* SECTION 3: Zero-AI Artwork & Emblem Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Cover Artwork & Emblem
              </span>
              {coverConfig.imageUrl && (
                <button
                  type="button"
                  onClick={() => updateCoverConfig({ imageUrl: "" })}
                  className="text-xs text-red-600 hover:text-red-700 flex items-center"
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Remove Image
                </button>
              )}
            </div>

            {/* Current Image Preview (if present) */}
            {coverConfig.imageUrl ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center space-x-3">
                <div className="w-16 h-20 bg-white rounded overflow-hidden shrink-0 border border-slate-300 flex items-center justify-center p-1.5">
                  <img src={sanitizeCoverImageUrl(coverConfig.imageUrl)} alt="Cover Preview" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-800 truncate">Artwork Attached</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Rendered on Page 1 of the exported ebook.</p>
                  <div className="mt-2 flex space-x-2">
                    <button
                      type="button"
                      onClick={() => updateCoverConfig({ imageUrl: "" })}
                      className="text-[11px] px-2 py-1 bg-white border border-red-200 hover:bg-red-50 rounded text-red-600 font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center">
                <p className="text-xs text-slate-600 font-medium">No graphic selected</p>
                <p className="text-[11px] text-slate-400">The cover renders with clean architectural typography framing.</p>
              </div>
            )}

            {/* Curated Zero-AI Vector Technical Emblems */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Quick Technical Emblems (Zero AI Quota)</label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_EMBLEMS.map((emblem) => {
                  const IconComp = emblem.icon;
                  const sanitizedCurrent = sanitizeCoverImageUrl(coverConfig.imageUrl);
                  const isSelected = sanitizedCurrent === emblem.svg || coverConfig.imageUrl === emblem.svg;
                  return (
                    <button
                      key={emblem.id}
                      type="button"
                      onClick={() => updateCoverConfig({ imageUrl: emblem.svg })}
                      className={`p-2.5 rounded-lg border text-left flex items-center space-x-2.5 transition-all ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-400 font-bold' 
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold text-slate-800 truncate">{emblem.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{emblem.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT: Live Responsive Cover Page Preview */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-200/70">
        
        {/* Preview Control Bar */}
        <div className="h-12 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
              <Eye className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Live Print Preview
            </span>
            <span className="text-[11px] text-slate-500">
              Standard Letter (8.5&quot; &times; 11&quot;) &bull; Ready for PDF Export
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs text-slate-600">
              <button 
                type="button" 
                onClick={() => setScale(0.5)}
                className={`px-2 py-1 rounded ${scale === 0.5 ? 'bg-white font-bold shadow-xs text-slate-900' : 'hover:text-slate-900'}`}
              >
                50%
              </button>
              <button 
                type="button" 
                onClick={() => setScale(0.65)}
                className={`px-2 py-1 rounded ${scale === 0.65 ? 'bg-white font-bold shadow-xs text-slate-900' : 'hover:text-slate-900'}`}
              >
                65%
              </button>
              <button 
                type="button" 
                onClick={() => setScale(0.8)}
                className={`px-2 py-1 rounded ${scale === 0.8 ? 'bg-white font-bold shadow-xs text-slate-900' : 'hover:text-slate-900'}`}
              >
                80%
              </button>
            </div>

            <button
              type="button"
              onClick={handleOpenPreviewTab}
              className="flex items-center text-xs font-medium text-slate-600 hover:text-indigo-600 px-2 py-1 rounded hover:bg-slate-50"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open In Tab
            </button>
          </div>
        </div>

        {/* Scaled Preview Stage */}
        <div className="flex-1 overflow-auto p-8 flex justify-center items-start">
          <div 
            style={{ 
              transform: `scale(${scale})`, 
              transformOrigin: "top center",
              transition: "transform 0.15s ease-out"
            }}
            className="shadow-2xl rounded-lg overflow-hidden shrink-0 border border-slate-300 bg-white"
          >
            <iframe
              title="Cover Preview"
              srcDoc={iframeDoc}
              style={{
                width: "850px",
                height: "1100px",
                border: "none",
                display: "block"
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};
