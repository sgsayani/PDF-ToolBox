import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { cn } from '../../lib/cn';
import type { FractionRect } from '../../types';

interface RectDrawSurfaceProps {
  imageSrc: string;
  /** Rectangles already committed on this page, shown as fixed overlays. */
  rects: FractionRect[];
  /** Called with a newly-drawn rectangle once the drag ends. Rectangles too small to be intentional are ignored. */
  onDraw: (rect: FractionRect) => void;
  /** Accent used for the boxes — crop and redact read differently (outline vs. solid fill). */
  variant: 'crop' | 'redact';
  className?: string;
}

const MIN_FRACTION = 0.01;

function toFraction(clientX: number, clientY: number, bounds: DOMRect): { x: number; y: number } {
  const x = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
  const y = Math.min(1, Math.max(0, (clientY - bounds.top) / bounds.height));
  return { x, y };
}

/**
 * A page image a person draws one rectangle on at a time by press-drag-release
 * — works the same with a mouse or a finger, since it's plain Pointer Events
 * rather than separate mouse/touch handling.
 */
export function RectDrawSurface({ imageSrc, rects, onDraw, variant, className }: RectDrawSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<FractionRect | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = toFraction(event.clientX, event.clientY, bounds);
    startRef.current = point;
    setDraft({ xFraction: point.x, yFraction: point.y, widthFraction: 0, heightFraction: 0 });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = startRef.current;
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!start || !bounds) return;
    const point = toFraction(event.clientX, event.clientY, bounds);
    setDraft({
      xFraction: Math.min(start.x, point.x),
      yFraction: Math.min(start.y, point.y),
      widthFraction: Math.abs(point.x - start.x),
      heightFraction: Math.abs(point.y - start.y),
    });
  };

  const finishDraw = () => {
    startRef.current = null;
    if (draft && draft.widthFraction > MIN_FRACTION && draft.heightFraction > MIN_FRACTION) {
      onDraw(draft);
    }
    setDraft(null);
  };

  const boxClass =
    variant === 'crop'
      ? 'border-2 border-accent bg-accent/10'
      : 'border border-danger bg-ink/85';

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative touch-none select-none overflow-hidden rounded-md border border-line bg-raised/50',
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDraw}
      onPointerCancel={finishDraw}
    >
      <img src={imageSrc} alt="Page preview" className="pointer-events-none block w-full select-none" draggable={false} />

      {rects.map((rect, index) => (
        <div
          key={index}
          className={cn('pointer-events-none absolute', boxClass)}
          style={{
            left: `${rect.xFraction * 100}%`,
            top: `${rect.yFraction * 100}%`,
            width: `${rect.widthFraction * 100}%`,
            height: `${rect.heightFraction * 100}%`,
          }}
        />
      ))}

      {draft && (
        <div
          className={cn('pointer-events-none absolute border-2 border-dashed', boxClass)}
          style={{
            left: `${draft.xFraction * 100}%`,
            top: `${draft.yFraction * 100}%`,
            width: `${draft.widthFraction * 100}%`,
            height: `${draft.heightFraction * 100}%`,
          }}
        />
      )}
    </div>
  );
}
