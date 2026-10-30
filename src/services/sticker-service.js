const yandexDisk = require('./yandex-disk.service');

const CACHE_TTL = 15 * 60 * 1000;
const STICKERS_PATH = 'stickers';
const ALLOWED_EXTENSIONS = new Set(['.gif', '.png']);

const stickerPackCache = new Map();
const pendingRequests = new Map();

function isValidPackId(packId) {
  return (typeof packId === 'string' && /^[a-zA-Z0-9_-]+$/.test(packId));
}

function isStickerFile(filename) {
  if (typeof filename !== 'string') {
    return false;
  }

  const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();

  return ALLOWED_EXTENSIONS.has(extension);
}

function getFileId(filename) {
  return filename.slice(0, filename.lastIndexOf('.'));
}

function getCachedPack(packId) {
  const cached = stickerPackCache.get(packId);

  if (!cached) {
    return null;
  }

  if (Date.now() >= cached.expiresAt) {
    stickerPackCache.delete(packId);
    return null;
  }

  return cached.data;
}

function setCachedPack(packId, data) {
  stickerPackCache.set(packId, {
    data,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

function clearPackCache(packId) {
  if (packId) {
    stickerPackCache.delete(packId);
    console.log(`[Sticker cache] Cleared: ${packId}`);
    return;
  }

  stickerPackCache.clear();
  console.log('[Sticker cache] Cleared all packs');
}

async function getStickerFiles(packId) {
  if (!isValidPackId(packId)) {
    throw new Error('Invalid sticker pack ID');
  }

  const items = await yandexDisk.listResources(`${STICKERS_PATH}/${packId}`);

  return items.filter(item => item.type === 'file').filter(item => isStickerFile(item.name)).sort((a, b) => a.name.localeCompare(b.name));
}

async function getStickerPacks() {
  const items = await yandexDisk.listResources(STICKERS_PATH);
  const folders = items.filter(item =>  item.type === 'dir' && isValidPackId(item.name));

  return Promise.all(
    folders.map(async folder => {
      const files = await getStickerFiles(folder.name);
      const firstFile = files[0];

      let previewUrl = null;

      if (firstFile) {
        const download = await yandexDisk.getDownloadUrl(`${STICKERS_PATH}/${folder.name}/${firstFile.name}`);

        previewUrl = download.href;
      }

      return {
        id: folder.name,
        name: folder.name,
        previewUrl,
        stickerCount: files.length,
      };
    })
  );
}

async function getStickerPack(packId) {
  if (!isValidPackId(packId)) {
    throw new Error('Invalid sticker pack ID');
  }

  const cached = getCachedPack(packId);

  if (cached) {
    console.log(`[Sticker cache] HIT: ${packId}`);
    return cached;
  }

  console.log(`[Sticker cache] MISS: ${packId}`);

  if (pendingRequests.has(packId)) {
    console.log(`[Sticker cache] Pending request: ${packId}`);
    return pendingRequests.get(packId);
  }

  const request = loadStickerPack(packId)
    .then(pack => {
      setCachedPack(packId, pack);

      console.log(`[Sticker cache] Stored: ${packId}`);

      return pack;
    })
    .finally(() => {
      pendingRequests.delete(packId);
    });

  pendingRequests.set(packId, request);

  return request;
}

async function loadStickerPack(packId) {
  const files = await getStickerFiles(packId);
  const metadata = await getStickerPackMetadata(packId);

  const stickers = await Promise.all(
    files.map(async file => {
      const path = `${STICKERS_PATH}/${packId}/${file.name}`;
      const download = await yandexDisk.getDownloadUrl(path);

      return {
        id: getFileId(file.name),
        filename: file.name,
        format: file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase(),
        path,
        url: download.href,
        size: file.size || 0,
      };
    })
  );

  const totalSize = stickers.reduce((total, sticker) => total + sticker.size, 0);

  return {
    id: packId,
    name: metadata.name,
    description: metadata.description,
    stickerCount: stickers.length,
    totalSize,
    stickers,
  };
}

async function getStickerPackMetadata(packId) {
  const path = `${STICKERS_PATH}/${packId}/pack.json`;

  try {
    const download = await yandexDisk.getDownloadUrl(path);

    const response = await fetch(download.href);

    if (!response.ok) {
      throw new Error(`Failed to load pack.json: ${response.status}`);
    }

    const metadata = await response.json();

    return {
      name: metadata.name || packId,
      description: metadata.description || '',
    };
  } catch (error) {
    console.error(`Failed to load metadata for ${packId}:`, error.message);

    return {
      name: packId,
      description: '',
    };
  }
}

module.exports = {
  getStickerPacks,
  getStickerPack,
  clearPackCache,
};
