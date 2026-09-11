require('dotenv').config();

const express = require('express');
const multer = require('multer');

const { getDiskInfo, getDownloadUrl, uploadFile } = require('./services/yandex-disk.service');

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

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

app.get('/api/yandex-disk/url', async (req, res) => {
  try {
    const path = req.query.path;

    if (!path) {
      return res.status(400).json({
        success: false,
        message: 'Path is required',
      });
    }

    if (path.startsWith('/') || path.includes('..') || path.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid path',
      });
    }

    console.log('Getting Yandex Disk download URL:', path);

    const result = await getDownloadUrl(path);

    res.status(200).json({
      success: true,
      data: {
        path,
        url: result.href,
      },
    });
  } catch (error) {
    console.error(
      'Yandex Disk download URL error:',
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      message: 'Failed to get Yandex Disk download URL',
      error: error.response?.data || error.message,
    });
  }
});

app.post('/api/yandex-disk/upload', upload.single('file'),
  async (req, res) => {
    try {
      const file = req.file;
      const path = req.body.path;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'File is required',
        });
      }

      if (!path) {
        return res.status(400).json({
          success: false,
          message: 'Path is required',
        });
      }

      if (path.startsWith('/') || path.includes('..') || path.includes('\\')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid path',
        });
      }

      console.log('Uploading file to Yandex Disk:', {
        path,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      });

      const result = await uploadFile({
        path,
        buffer: file.buffer,
        contentType: file.mimetype,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Yandex Disk upload error:', error.response?.data || error.message);

      res.status(500).json({
        success: false,
        message: 'Failed to upload file',
        error: error.response?.data || error.message,
      });
    }
  }
);

app.listen(PORT, () => {
  console.log(`Chatify Yandex Disk Server running on port ${PORT}`);
});
