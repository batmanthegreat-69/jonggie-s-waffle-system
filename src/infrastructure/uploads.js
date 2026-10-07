const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const pool = require('./db/pool');

const UPLOADS = path.join(__dirname, '..', '..', 'public', 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });

const TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + TYPES[file.mimetype])
  }),
  fileFilter: (req, file, cb) => cb(null, !!TYPES[file.mimetype]),
  limits: { fileSize: 3 * 1024 * 1024 }
});

const removeFile = (name) => {
  if (!name) return;
  fs.unlink(path.join(UPLOADS, path.basename(name)), () => {});
};

const removeMenuImage = async (name) => {
  if (!name) return;
  const [[used]] = await pool.query('SELECT id FROM order_items WHERE image = ? LIMIT 1', [name]);
  if (!used) removeFile(name);
};

module.exports = { UPLOADS, TYPES, upload, removeFile, removeMenuImage };
