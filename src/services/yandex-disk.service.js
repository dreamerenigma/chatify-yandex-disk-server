const axios = require('axios');

const YANDEX_DISK_API_URL = 'https://cloud-api.yandex.net/v1/disk';

async function getDiskInfo() {
  const token = process.env.YANDEX_ACCESS_TOKEN;

  if (!token) {
    throw new Error('YANDEX_ACCESS_TOKEN is not configured');
  }

  const response = await axios.get(YANDEX_DISK_API_URL, {
    headers: {
      Authorization: `OAuth ${token}`,
      Accept: 'application/json',
    },
  });

  return response.data;
}

module.exports = {
  getDiskInfo,
};
