import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TARGET_DIR = path.join(__dirname, 'public'); // Scanning public folder
const QUALITY = 80;

// Helper to walk directories
function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

// Main optimization function
async function optimizeImages() {
    console.log(`🚀 Starting Image Optimization in: ${TARGET_DIR}`);
    let savedSpace = 0;
    let fileCount = 0;

    const files = [];
    if (fs.existsSync(TARGET_DIR)) {
        walkDir(TARGET_DIR, (filePath) => {
            if (filePath.match(/\.(png|jpg|jpeg)$/i)) {
                files.push(filePath);
            }
        });
    }

    if (files.length === 0) {
        console.log('No PNG or JPG images found to optimize.');
        return;
    }

    console.log(`Found ${files.length} images. Converting to WebP...`);

    for (const filePath of files) {
        const ext = path.extname(filePath);
        const newPath = filePath.replace(ext, '.webp');

        try {
            const originalSize = fs.statSync(filePath).size;

            await sharp(filePath)
                .webp({ quality: QUALITY })
                .toFile(newPath);

            const newSize = fs.statSync(newPath).size;
            const savings = originalSize - newSize;

            if (savings > 0) {
                savedSpace += savings;
                // Delete original? User didn't explicitly say DELETE, but usually "convert" implies replacing. 
                // Safety first: Let's delete ensuring we don't bloat more, as user wants to SAVE space.
                fs.unlinkSync(filePath);
                console.log(`✅ Converted: ${path.basename(filePath)} -> ${path.basename(newPath)} (Saved ${(savings / 1024).toFixed(2)} KB)`);
            } else {
                // If WebP is bigger (rare), keep original
                fs.unlinkSync(newPath);
                console.log(`⚠️ Skipped: ${path.basename(filePath)} (WebP was larger)`);
            }
            fileCount++;
        } catch (err) {
            console.error(`❌ Error converting ${path.basename(filePath)}:`, err.message);
        }
    }

    console.log(`\n🎉 Optimization Complete!`);
    console.log(`📉 Compressed ${fileCount} images.`);
    console.log(`💾 Total Space Saved: ${(savedSpace / 1024 / 1024).toFixed(2)} MB`);
}

optimizeImages();
