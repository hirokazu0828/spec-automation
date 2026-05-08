import type { DocumentType, ImageSource } from '../../types';

/** Maximum file size for the manual upload path (per Layer 4 decision doc §8). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * When the user uploads a file, derive the imageSource from the document type:
 * sample drafts get `'manual'`, final drafts get `'photo'`. A finer-grained
 * source picker (manual ↔ photo override) is deferred to Layer 3.
 */
export function deriveUploadSource(documentType: DocumentType): ImageSource {
  return documentType === 'final' ? 'photo' : 'manual';
}

export function imageSourceLabel(source: ImageSource | undefined): string | null {
  if (source === 'generated') return 'AI生成';
  if (source === 'manual') return '手動アップロード';
  if (source === 'photo') return '実物写真';
  return null;
}

/**
 * Read a File into a base64-encoded data URL. Throws when the file exceeds
 * MAX_UPLOAD_BYTES so callers can surface a friendly error.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return Promise.reject(
      new Error(`ファイルサイズが上限 (${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB) を超えています`),
    );
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const out = reader.result;
      if (typeof out !== 'string') {
        reject(new Error('FileReader returned non-string'));
        return;
      }
      resolve(out);
    };
    reader.onerror = () => reject(reader.error ?? new Error('読み込みに失敗'));
    reader.readAsDataURL(file);
  });
}
