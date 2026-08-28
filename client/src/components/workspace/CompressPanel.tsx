import { formatBytes } from '../../lib/format';
import { findTool } from '../../lib/tools';
import type { CompressionLevel } from '../../types';
import { Segmented } from '../ui/Segmented';
import { ToolPanel } from './ToolPanel';

interface CompressPanelProps {
  level: CompressionLevel;
  onChange: (level: CompressionLevel) => void;
  originalSize: number;
}

export function CompressPanel({ level, onChange, originalSize }: CompressPanelProps) {
  return (
    <ToolPanel tool={findTool('compress')}>
      <div className="rounded-md border border-line bg-raised/50 px-3 py-2.5">
        <p className="text-[11px] font-semibold tracking-[0.05em] text-ink-subtle uppercase">
          Current size
        </p>
        <p className="mt-1 text-[15px] font-semibold text-ink">{formatBytes(originalSize)}</p>
      </div>

      <Segmented
        label="Compression level"
        value={level}
        onChange={onChange}
        options={[
          { value: 'basic', label: 'Basic' },
          { value: 'balanced', label: 'Balanced' },
          { value: 'strong', label: 'Strong' },
        ]}
      />

      <p className="text-[12.5px] leading-relaxed text-ink-muted">
        {level === 'basic'
          ? 'Light reduction, closest to the original quality.'
          : level === 'balanced'
            ? 'A reasonable trade-off between size and quality.'
            : 'The smallest result — pages become lower-resolution images.'}{' '}
        If a file is already compact, compression may not shrink it further — you&rsquo;ll see the
        real result before downloading.
      </p>
    </ToolPanel>
  );
}
