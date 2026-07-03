const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const UploadController = require('../controllers/uploadController');
const { authMiddleware } = require('../middleware/auth');

// 确保上传目录存在
const avatarDir = path.join(__dirname, '../../uploads/avatars');
const sysimgDir = path.join(__dirname, '../../uploads/sysimg');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}
if (!fs.existsSync(sysimgDir)) {
  fs.mkdirSync(sysimgDir, { recursive: true });
}

// 配置multer存储
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.png';
    const filename = `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, filename);
  }
});

const sysimgStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, sysimgDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.png';
    const filename = `sysimg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, filename);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只支持 jpg/png/gif/webp 格式的图片'), false);
  }
};

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  }
});

const uploadSysimg = multer({
  storage: sysimgStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  }
});

// 上传头像（需要认证）
router.post('/avatar', authMiddleware, uploadAvatar.single('file'), UploadController.uploadAvatar);

// 上传商品图片到 sysimg 目录（需要认证）
router.post('/sysimg', authMiddleware, uploadSysimg.single('file'), UploadController.uploadSysimg);

module.exports = router;
