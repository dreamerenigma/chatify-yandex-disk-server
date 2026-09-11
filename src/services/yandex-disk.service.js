const axios = require('axios');

const YANDEX_DISK_API_URL = 'https://cloud-api.yandex.net/v1/disk';

const YANDEX_DISK_BASE_PATH = 'Programming/Projects/Chatify';

function getToken() {
  const token = process.env.YANDEX_ACCESS_TOKEN;

  if (!token) {
    throw new Error('YANDEX_ACCESS_TOKEN is not configured');
  }

  return token;
}

function getHeaders() {
  return {
    Authorization: `OAuth ${getToken()}`,
    Accept: 'application/json',
  };
}

async function getDiskInfo() {
  const response = await axios.get(YANDEX_DISK_API_URL, {
    headers: getHeaders(),
  });

  return response.data;
}

async function getUploadUrl(path, overwrite = true) {
  const response = await axios.get(
    `${YANDEX_DISK_API_URL}/resources/upload`,
    {
      headers: getHeaders(),
      params: {
        path,
        overwrite,
      },
    }
  );

  return response.data;
}

async function getDownloadUrl(path) {
  if (!path) {
    throw new Error('File path is required');
  }

  const fullPath =  `${YANDEX_DISK_BASE_PATH}/${path}`;

  const response = await axios.get(
    `${YANDEX_DISK_API_URL}/resources/download`,
    {
      headers: getHeaders(),
      params: {
        path: fullPath,
      },
    }
  );

  return response.data;
}

async function createFolder(path) {
  try {
    await axios.put(
      `${YANDEX_DISK_API_URL}/resources`,
      null,
      {
        headers: getHeaders(),
        params: {
          path,
        },
      }
    );

    return true;
  } catch (error) {
    if (error.response?.status === 409) {
      return true;
    }

    throw error;
  }
}

async function ensureDirectory(path) {
  const parts = path.split('/');

  parts.pop();

  let currentPath = '';

  for (const part of parts) {
    currentPath += currentPath
      ? `/${part}`
      : part;

    try {
      await axios.put(
        `${YANDEX_DISK_API_URL}/resources`,
        null,
        {
          headers: getHeaders(),
          params: {
            path: currentPath,
          },
        }
      );

      console.log(
        'Created Yandex Disk folder:',
        currentPath
      );
    } catch (error) {
      if (error.response?.status === 409) {
        console.log(
          'Yandex Disk folder already exists:',
          currentPath
        );
        continue;
      }

      console.error(
        'Failed to create Yandex Disk folder:',
        currentPath,
        error.response?.data || error.message
      );

      throw error;
    }
  }
}

async function uploadFile({path, buffer, contentType}) {
  if (!path) {
    throw new Error('Upload path is required');
  }

  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Upload buffer is required');
  }

  const fullPath = `${YANDEX_DISK_BASE_PATH}/${path}`;

  await ensureDirectory(fullPath);

  const uploadInfo = await getUploadUrl(fullPath, true);

  if (!uploadInfo.href) {
    throw new Error('Yandex Disk did not return upload URL');
  }

  await axios.put(uploadInfo.href, buffer, {
    headers: {
      'Content-Type': contentType || 'application/octet-stream',
      'Content-Length': buffer.length,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  return {
    path,
    size: buffer.length,
    contentType: contentType || 'application/octet-stream',
  };
}

module.exports = {
  getDiskInfo,
  getUploadUrl,
  getDownloadUrl,
  createFolder,
  ensureDirectory,
  uploadFile,
};
