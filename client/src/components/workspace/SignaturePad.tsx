import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Eraser } from 'lucide-react';

import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';

interface SignaturePadProps {
  /** Called with a cropped PNG data URL after each stroke, or `null` once cleared. */
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}

/** Internal drawing resolution. A wide aspect ratio suits a signature. */
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 200;
const STROKE_COLOR = '#16181c';
const STROKE_WIDTH = 3;
/** Padding kept around the cropped ink so strokes aren't clipped at the edge. */
const CROP_PADDING = 10;

/** Finds the bounding box of non-transparent pixels, or `null` if there are none. */
function findInkBounds(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const { data } = ctx.getImageData(0, 0, width, height);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (!alpha) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  return maxX === -1 ? null : { minX, minY, maxX, maxY };
}

/**
 * A basic electronic signature capture — draw with a mouse or finger, clear,
 * and hand the result to the parent as a tightly cropped PNG. This is not a
 * certified digital signature: it is ink placed as an image, nothing more.
 */
export function SignaturePad({ onChange, disabled = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const getContext = useCallback(() => canvasRef.current?.getContext('2d') ?? null, []);

  useEffect(() => {
    const ctx = getContext();
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = STROKE_WIDTH;
  }, [getContext]);

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;

    const ctx = getContext();
    const { x, y } = pointFromEvent(event);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = getContext();
    const { x, y } = pointFromEvent(event);
    ctx?.lineTo(x, y);
    ctx?.stroke();
    if (isEmpty) setIsEmpty(false);
  };

  const emitSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    const bounds = findInkBounds(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (!bounds) {
      onChange(null);
      return;
    }

    const x = Math.max(0, bounds.minX - CROP_PADDING);
    const y = Math.max(0, bounds.minY - CROP_PADDING);
    const width = Math.min(CANVAS_WIDTH, bounds.maxX + CROP_PADDING) - x;
    const height = Math.min(CANVAS_HEIGHT, bounds.maxY + CROP_PADDING) - y;

    const cropped = document.createElement('canvas');
    cropped.width = width;
    cropped.height = height;
    cropped.getContext('2d')?.drawImage(canvas, x, y, width, height, 0, 0, width, height);

    onChange(cropped.toDataURL('image/png'));
  }, [getContext, onChange]);

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    emitSignature();
  };

  const handleClear = () => {
    const ctx = getContext();
    ctx?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    setIsEmpty(true);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'relative overflow-hidden rounded-md border bg-surface',
          disabled ? 'border-line opacity-60' : 'border-line-strong',
        )}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={cn(
            'aspect-[3/1] w-full touch-none',
            disabled ? 'cursor-not-allowed' : 'cursor-crosshair',
          )}
          role="img"
          aria-label={isEmpty ? 'Empty signature area' : 'Drawn signature'}
        />
        {/* Purely decorative guide line — never part of the exported ink. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 bottom-8 border-t border-dashed border-line-strong"
        />
        {isEmpty && (
          <p
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-ink-subtle"
          >
            Draw your signature here
          </p>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        icon={<Eraser />}
        disabled={disabled || isEmpty}
        onClick={handleClear}
      >
        Clear signature
      </Button>
    </div>
  );
}
