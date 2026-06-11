const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const qiniu = require('qiniu');
const { verifyToken } = require('../../utils/verifyToken')
const { trademarkList, trademarkSave, trademarkUpdate, trademarkDelete } = require('../../Mapper/productMapper/trademarkMapper')

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

function uploadToQiniu(localFilePath, fileName) {
  return new Promise((resolve, reject) => {
    const accessKey = process.env.QINIU_ACCESS_KEY;
    const secretKey = process.env.QINIU_SECRET_KEY;
    const bucket = process.env.QINIU_BUCKET;
    const domain = process.env.QINIU_DOMAIN;

    if (!accessKey || !secretKey || !bucket || !domain) {
      return reject(new Error('七牛云配置未设置'));
    }

    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
    const putPolicy = new qiniu.rs.PutPolicy({ scope: bucket });
    const uploadToken = putPolicy.uploadToken(mac);

    const config = new qiniu.conf.Config();
    const formUploader = new qiniu.form_up.FormUploader(config);
    const putExtra = new qiniu.form_up.PutExtra();

    formUploader.putFile(uploadToken, fileName, localFilePath, putExtra, (err, body) => {
      if (err) {
        reject(err);
      } else {
        resolve('https://' + domain + '/' + body.key);
      }
    });
  });
}

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

router.post('/admin/product/fileUpload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: 400, msg: '请选择文件' });
    }

    const hasQiniuConfig = process.env.QINIU_ACCESS_KEY && process.env.QINIU_SECRET_KEY && 
                          process.env.QINIU_BUCKET && process.env.QINIU_DOMAIN;

    if (hasQiniuConfig) {
      try {
        const qiniuUrl = await uploadToQiniu(req.file.path, req.file.filename);
        fs.unlinkSync(req.file.path);
        console.log('文件上传七牛云成功，返回URL：', qiniuUrl);
        res.json({ code: 200, url: qiniuUrl });
      } catch (qiniuErr) {
        console.error('七牛云上传失败，回退到本地存储：', qiniuErr.message);
        const fileUrl = '/uploads/' + req.file.filename;
        res.json({ code: 200, url: fileUrl });
      }
    } else {
      const fileUrl = '/uploads/' + req.file.filename;
      console.log('七牛云未配置，使用本地存储，返回URL：', fileUrl);
      res.json({ code: 200, url: fileUrl });
    }

  } catch (err) {
    console.error('上传异常：', err);
    res.status(500).json({ code: 500, msg: '服务器异常' });
  }
});

module.exports = router;