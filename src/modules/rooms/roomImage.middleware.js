const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh JPG hoặc PNG!'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
  fileFilter
});

const processAndSaveImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  const uploadDir = path.join(__dirname, '../../../public/uploads/room-types');
  const thumbDir = path.join(uploadDir, 'thumbs');

  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

  req.processedImages = [];

  try {
    for (const file of req.files) {
      const filename = `room-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
      const originalPath = path.join(uploadDir, filename);
      const thumbPath = path.join(thumbDir, filename);

      const metadata = await sharp(file.buffer).metadata();

      let pipeline = sharp(file.buffer);
      if (metadata.width > 1600) {
        pipeline = pipeline.resize({ width: 1600, fit: 'contain', withoutEnlargement: true });
      }
      await pipeline.toFormat('jpeg').toFile(originalPath);

      await sharp(file.buffer)
        .resize({ width: 300, fit: 'contain', withoutEnlargement: true })
        .toFormat('jpeg')
        .toFile(thumbPath);

      req.processedImages.push({
        url: `/uploads/room-types/${filename}`,
        thumbUrl: `/uploads/room-types/thumbs/${filename}`
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadMultiple: upload.array('images', 8),
  processAndSaveImages
};