const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

router.get('/img/:size/:format/*', async (req, res) => {
  try {
    const { size, format } = req.params;
    const imagePath = req.params[0];
    
    const fullPath = path.join(__dirname, '../static/img', imagePath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).send('Image not found');
    }
    
    const sizeMap = {
      'xs': { width: 64, height: 64 },
      'sm': { width: 128, height: 128 },
      'md': { width: 256, height: 256 },
      'lg': { width: 512, height: 512 },
      'xl': { width: 1024, height: 1024 }
    };
    
    const targetSize = sizeMap[size] || sizeMap['md'];
    
    let transform = sharp(fullPath)
      .resize(targetSize.width, targetSize.height, {
        fit: sharp.fit.inside,
        withoutEnlargement: true
      })
      .rotate();
    
    let contentType = 'image/jpeg';
    
    switch (format.toLowerCase()) {
      case 'webp':
        transform = transform.webp({ quality: 80 });
        contentType = 'image/webp';
        break;
      case 'png':
        transform = transform.png({ quality: 80 });
        contentType = 'image/png';
        break;
      case 'jpg':
      case 'jpeg':
      default:
        transform = transform.jpeg({ quality: 80 });
        contentType = 'image/jpeg';
        break;
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=2592000');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    transform.pipe(res);
    
  } catch (error) {
    console.error('Image processing error:', error);
    res.status(500).send('Image processing failed');
  }
});

module.exports = router;