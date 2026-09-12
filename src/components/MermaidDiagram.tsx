import React, { useEffect, useRef, useId, useState } from 'react';
import mermaid from 'mermaid';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, RotateCcw, ScanSearch } from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});

interface MermaidDiagramProps {
  chart?: string;
  caption?: string;
  badge?: string;
}

const Controls = () => {
  const { zoomIn, zoomOut, resetTransform, centerView } = useControls();

  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <div className="flex gap-1 bg-slate-800 p-1 rounded-md border border-slate-700 shadow-lg">
        <button onClick={() => zoomIn()} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 transition-colors" title="Zoom In">
          <ZoomIn size={16} />
        </button>
        <button onClick={() => centerView()} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 transition-colors" title="Center">
          <ScanSearch size={16} />
        </button>
        <button onClick={() => resetTransform()} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 transition-colors" title="Reset">
          <RotateCcw size={16} />
        </button>
        <button onClick={() => zoomOut()} className="p-1.5 hover:bg-slate-700 rounded text-slate-300 transition-colors" title="Zoom Out">
          <ZoomOut size={16} />
        </button>
      </div>
    </div>
  );
};

export default function MermaidDiagram({ chart, caption, badge }: MermaidDiagramProps) {
  const id = useId().replace(/:/g, '');
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (chart) {
      const mermaidId = `mermaid-${id}`;
      mermaid.render(mermaidId, chart).then((result) => {
        setSvgContent(result.svg);
        setError('');
      }).catch((e) => {
        console.error("Mermaid error", e);
        setError(e.message);
        setSvgContent('');
      });
    }
  }, [chart, id]);

  if (!chart) return null;

  return (
    <figure className="notebook-figure my-8 overflow-hidden rounded-xl bg-[#0d1117] border border-slate-800 shadow-xl break-inside-avoid relative group">
      {badge && (
        <div className="absolute top-4 left-4 z-10">
          <span className="inline-block px-2.5 py-1 bg-slate-800 text-slate-300 rounded font-sans font-medium text-xs border border-slate-700 shadow-sm">{badge}</span>
        </div>
      )}
      
      {error ? (
        <div className="p-6 text-red-400 text-sm overflow-x-auto whitespace-pre-wrap font-mono">
          {error}
        </div>
      ) : (
        <TransformWrapper
          initialScale={1}
          minScale={0.1}
          maxScale={8}
          centerOnInit={true}
          wheel={{ step: 0.1 }}
        >
          <div className="w-full h-full min-h-[400px] flex items-center justify-center cursor-grab active:cursor-grabbing">
            <Controls />
            <TransformComponent wrapperStyle={{ width: '100%', height: '100%', minHeight: '400px' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div 
                className="mermaid-content w-full flex items-center justify-center p-8"
                dangerouslySetInnerHTML={{ __html: svgContent }} 
              />
            </TransformComponent>
          </div>
        </TransformWrapper>
      )}

      {caption && (
        <figcaption className="absolute bottom-4 left-4 font-sans text-slate-400 text-sm z-10 pointer-events-none bg-slate-900/80 px-3 py-1.5 rounded-md backdrop-blur-sm border border-slate-800">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
