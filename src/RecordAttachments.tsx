import { useState } from 'react';
import { Download, Trash2 } from 'lucide-react';

export type RecordAttachment = { id: string; name: string; kind: string; size: number; uploadedAt: string };

async function fileStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('procurement-documents', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction('files', mode);
      const request = operation(transaction.objectStore('files'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally { db.close(); }
}

export function RecordAttachments({ value, onChange, kinds, onBusyChange }: { value: RecordAttachment[]; onChange?: (value: RecordAttachment[]) => void; kinds: string[]; onBusyChange?: (busy: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const upload = async (files: File[], kind: string) => {
    setBusy(true);
    onBusyChange?.(true);
    setError('');
    try {
      for (const file of files) {
        if (!/\.(pdf|png|jpe?g)$/i.test(file.name) || !['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) throw new Error('Use PDF, PNG, or JPEG documents.');
        if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('Each document must be nonempty and no larger than 10 MB.');
      }
      const additions: RecordAttachment[] = [];
      for (const file of files) {
        const attachment = { id: crypto.randomUUID(), name: file.name, kind, size: file.size, uploadedAt: new Date().toISOString() };
        await fileStore('readwrite', (store) => store.put(file, attachment.id));
        additions.push(attachment);
      }
      onChange?.([...value, ...additions]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save documents. Please try again.'); }
    finally { setBusy(false); onBusyChange?.(false); }
  };
  const download = async (attachment: RecordAttachment) => {
    setError('');
    try {
      const file = await fileStore<Blob | undefined>('readonly', (store) => store.get(attachment.id));
      if (!file) throw new Error('This document is not available in this browser. Please upload it again.');
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to download document.'); }
  };
  return <div className="record-attachments" aria-busy={busy}>
    {onChange ? kinds.map((kind) => <label key={kind}><span>{kind}</span><input aria-label={kind} type="file" accept=".pdf,.png,.jpg,.jpeg" multiple disabled={busy} onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ''; void upload(files, kind); }} /></label>) : null}
    {value.map((attachment) => <div className="record-attachment" key={attachment.id}><span><b>{attachment.name}</b><small>{attachment.kind} · {Math.ceil(attachment.size / 1024)} KB</small></span><button type="button" className="proc-secondary" title={`Download ${attachment.name}`} aria-label={`Download ${attachment.name}`} onClick={() => void download(attachment)}><Download size={16} /></button>{onChange ? <button type="button" className="proc-secondary" disabled={busy} title={`Remove ${attachment.name}`} aria-label={`Remove ${attachment.name}`} onClick={() => onChange(value.filter((item) => item.id !== attachment.id))}><Trash2 size={16} /></button> : null}</div>)}
    {!value.length && !onChange ? <p>No documents attached.</p> : null}
    {busy ? <p role="status">Saving documents...</p> : null}
    {error ? <p role="alert">{error}</p> : null}
  </div>;
}
