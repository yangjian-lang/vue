const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../../utils/verifyToken')
const { trademarkList, trademarkSave, trademarkUpdate, trademarkDelete } = require('../../Mapper/productMapper/trademarkMapper')

// 配置本地存储
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// 获取品牌列表
router.get('/admin/product/baseTrademark/:page/:pageSize', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.params.page) || 1
    const pageSize = parseInt(req.params.pageSize) || 10
    const result = await trademarkList(page, pageSize)
    res.success({ ...result }, 'success')
  } catch (error) {
    console.error(error)
    res.error(500, '服务器错误')
  }
})

// 新增品牌
router.post('/admin/product/baseTrademark/save', verifyToken, async (req, res) => {
  try {
    const { tmName, logoUrl } = req.body
    await trademarkSave(tmName, logoUrl)
    res.success(null, 'success')
  } catch (err) {
    console.error(err)
    res.error(500, '服务器错误')
  }
})

// 修改品牌
router.put('/admin/product/baseTrademark/update', verifyToken, async (req, res) => {
  try {
    const { id, tmName, logoUrl } = req.body
    await trademarkUpdate(id, tmName, logoUrl)
    res.success(null, 'success')
  } catch (err) {
    console.error(err)
    res.error(500, '服务器错误')
  }
})

// 删除品牌
router.delete('/admin/product/baseTrademark/remove/:id', verifyToken, async (req, res) => {
  try {
    await trademarkDelete(req.params.id)
    res.success(null, 'success')
  } catch (err) {
    console.error(err)
    res.error(500, '服务器错误')
  }
})

// ✅ 文件上传（本地存储版）
router.post('/admin/product/fileUpload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, msg: '请选择文件' });
    }

    // 本地存储，返回相对路径，前端通过代理访问
    const fileUrl = '/uploads/' + req.file.filename;
    console.log('文件上传成功，返回URL：', fileUrl);
    res.json({ code: 200, url: fileUrl });

  } catch (err) {
    console.error('上传异常：', err);
    res.status(500).json({ code: 500, msg: '服务器异常' });
  }
});

module.exports = router;