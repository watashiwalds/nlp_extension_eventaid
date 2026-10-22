import type { Event, NormalizedDocument } from '../shared/contracts';

/** Nội dung đã quét nhưng không còn sự kiện nào dùng làm nguồn trích. */
export function unlinkedDocuments(
  documents: NormalizedDocument[],
  events: Event[],
): NormalizedDocument[] {
  const linked = new Set<string>();
  for (const event of events) {
    for (const source of event.sources) linked.add(source.documentId);
  }
  return documents.filter((document) => !linked.has(document.documentId));
}
