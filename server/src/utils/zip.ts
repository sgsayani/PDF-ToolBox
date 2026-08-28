import JSZip from 'jszip';

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/** Bundles files into a single ZIP archive, in memory. */
export async function zipFiles(entries: ZipEntry[]): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const entry of entries) {
    zip.file(entry.name, entry.data);
  }
  return zip.generateAsync({ type: 'uint8array' });
}
