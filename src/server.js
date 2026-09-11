require('dotenv').config();

const express = require('express');
const { getDiskInfo } = require('./services/yandex-disk.service');

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'chatify-yandex-disk-server',
    status: 'running',
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
  });
});

app.get('/api/yandex-disk/info', async (req, res) => {
  try {
    const diskInfo = await getDiskInfo();

    res.json({
      success: true,
      data: diskInfo,
    });
  } catch (error) {
    console.error('Yandex Disk API error:', error.response?.data || error.message);

    res.status(500).json({
      success: false,
      message: 'Failed to get Yandex Disk information',
      error: error.response?.data || error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Chatify Yandex Disk Server running on port ${PORT}`);
});
