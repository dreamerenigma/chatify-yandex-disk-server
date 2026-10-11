const yandexDisk = require('./yandex-disk.service');

const STICKERS_PATH = 'stickers';
const ALLOWED_EXTENSIONS = new Set(['.gif', '.png']);

function isValidPackId(packId) {
  return (
    typeof packId === 'string' &&
    /^[a-zA-Z0-9_-]+$/.test(packId)
  );
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
  const files = await getStickerFiles(packId);

  const stickers = await Promise.all(
    files.map(async file => {
      const path = `${STICKERS_PATH}/${packId}/${file.name}`;
      const download = await yandexDisk.getDownloadUrl(path);

      return {
        id: getFileId(file.name),
        filename: file.name,
        format: file.name .slice(file.name.lastIndexOf('.') + 1).toLowerCase(),
        url: download.href,
      };
    })
  );

  return {
    id: packId,
    name: packId,
    stickerCount: stickers.length,
    stickers,
  };
}

module.exports = {
  getStickerPacks,
  getStickerPack,
};
