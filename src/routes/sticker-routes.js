const express = require("express");
const stickerService = require("../services/sticker-service");

const router = express.Router();

router.get("/packs", async (req, res) => {
  try {
    const packs = await stickerService.getStickerPacks();

    res.json({
      success: true,
      data: packs,
    });
  } catch (error) {
    console.error("Failed to get sticker packs:", error.message);

    res.status(502).json({
      success: false,
      message: "Не удалось загрузить наборы стикеров",
    });
  }
});

router.get("/packs/:packId", async (req, res) => {
  try {
    const pack = await stickerService.getStickerPack(req.params.packId);

    res.json({
      success: true,
      data: pack,
    });
  } catch (error) {
    if (error.message === "Invalid sticker pack ID") {
      return res.status(400).json({
        success: false,
        message: "Некорректный идентификатор набора",
      });
    }

    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: "Набор стикеров не найден",
      });
    }

    console.error("Failed to get sticker pack:", error.message);

    res.status(502).json({
      success: false,
      message: "Не удалось загрузить стикеры",
    });
  }
});

module.exports = router;
