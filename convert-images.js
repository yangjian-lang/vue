const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
const excludeDirs = ['node_modules', '.git', 'dist', 'build'];

function shouldProcessFile(file) {
  const ext = path.extname(file).toLowerCase();
  return imageExtensions.includes(ext) && !file.includes('.webp');
}

function shouldProcessDir(dir) {
  return !excludeDirs.some(exclude => dir.includes(exclude));
}

async function convertImage(inputPath, outputPath) {
  try {
    const ext = path.extname(inputPath).toLowerCase();
    
    if (ext === '.png') {
      await sharp(inputPath)
        .webp({ quality: 85, lossless: true })
        .toFile(outputPath);
    } else {
      await sharp(inputPath)
        .webp({ quality: 80 })
        .toFile(outputPath);
    }
    
    const inputStats = fs.statSync(inputPath);
    const outputStats = fs.statSync(outputPath);
    const savedPercent = ((inputStats.size - outputStats.size) / inputStats.size * 100).toFixed(1);
    
    console.log(`✓ ${inputPath} -> ${outputPath}`);
    console.log(`  原始大小: ${(inputStats.size / 1024).toFixed(1)} KB`);
    console.log(`  压缩后: ${(outputStats.size / 1024).toFixed(1)} KB (节省 ${savedPercent}%)\n`);
    
    return { success: true, savedPercent };
  } catch (error) {
    console.log(`✗ 转换失败: ${inputPath}`);
    console.log(`  错误: ${error.message}\n`);
    return { success: false, error: error.message };
  }
}

async function processDirectory(dir) {
  const results = { success: 0, failed: 0, totalSaved: 0 };
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        if (shouldProcessDir(fullPath)) {
          const subResults = await processDirectory(fullPath);
          results.success += subResults.success;
          results.failed += subResults.failed;
          results.totalSaved += subResults.totalSaved;
        }
      } else if (shouldProcessFile(file)) {
        const outputPath = path.join(dir, path.parse(file).name + '.webp');
        
        if (!fs.existsSync(outputPath)) {
          const result = await convertImage(fullPath, outputPath);
          if (result.success) {
            results.success++;
            if (result.savedPercent) {
              results.totalSaved += parseFloat(result.savedPercent);
            }
          } else {
            results.failed++;
          }
        } else {
          console.log(`跳过: ${outputPath} 已存在\n`);
        }
      }
    }
  } catch (error) {
    console.log(`✗ 读取目录失败: ${dir}`);
    console.log(`  错误: ${error.message}\n`);
  }
  
  return results;
}

async function main() {
  console.log('=== 开始转换图片为 WebP 格式 ===\n');
  
  const results = await processDirectory('./');
  
  console.log('=== 转换完成 ===');
  console.log(`成功: ${results.success} 张`);
  console.log(`失败: ${results.failed} 张`);
  if (results.success > 0) {
    console.log(`平均节省: ${(results.totalSaved / results.success).toFixed(1)}%`);
  }
}

main();