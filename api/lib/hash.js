import crypto from 'crypto';

export function normalizeConfigForHash(config) {
  const clone = JSON.parse(JSON.stringify(config));
  delete clone.exportDate;
  if (clone.metadata) {
    delete clone.metadata.currentPage;
    delete clone.metadata.exportedPages;
  }
  return clone;
}

export function hashConfig(config) {
  const normalized = normalizeConfigForHash(config);
  const json = JSON.stringify(normalized);
  return crypto.createHash('sha256').update(json).digest('hex');
}
