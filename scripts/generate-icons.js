/**
 * Icon Generation Script
 * Generates PNG, ICO, and ICNS icons from SVG source
 *
 * Usage: node scripts/generate-icons.js
 *
 * Requires: sharp, png-to-ico (install with: npm install -D sharp png-to-ico)
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Installing required dependencies...');
  const { execSync } = require('child_process');
  execSync('npm install -D sharp png-to-ico', { stdio: 'inherit' });
  sharp = require('sharp');
}

const inputSvg = path.join(__dirname, '../public/icon.svg');
const outputDir = path.join(__dirname, '../public');

async function generateIcons() {
  console.log('Generating icons...');

  // Check if SVG exists
  if (!fs.existsSync(inputSvg)) {
    console.error('Error: icon.svg not found in public directory');
    process.exit(1);
  }

  try {
    // Generate PNG at various sizes
    const sizes = [16, 32, 64, 128, 256, 512, 1024];

    // Main PNG icon (512x512)
    await sharp(inputSvg)
      .resize(512, 512)
      .png()
      .toFile(path.join(outputDir, 'icon.png'));
    console.log('Created: icon.png (512x512)');

    // Generate multiple sizes for ICO/ICNS
    const pngBuffers = {};
    for (const size of sizes) {
      pngBuffers[size] = await sharp(inputSvg)
        .resize(size, size)
        .png()
        .toBuffer();
      console.log(`Generated: ${size}x${size} PNG buffer`);
    }

    // Save individual PNGs for iconset (Mac)
    const iconsetDir = path.join(outputDir, 'icon.iconset');
    if (!fs.existsSync(iconsetDir)) {
      fs.mkdirSync(iconsetDir, { recursive: true });
    }

    // Mac iconset naming convention
    const iconsetSizes = [
      { size: 16, name: 'icon_16x16.png' },
      { size: 32, name: 'icon_16x16@2x.png' },
      { size: 32, name: 'icon_32x32.png' },
      { size: 64, name: 'icon_32x32@2x.png' },
      { size: 128, name: 'icon_128x128.png' },
      { size: 256, name: 'icon_128x128@2x.png' },
      { size: 256, name: 'icon_256x256.png' },
      { size: 512, name: 'icon_256x256@2x.png' },
      { size: 512, name: 'icon_512x512.png' },
      { size: 1024, name: 'icon_512x512@2x.png' }
    ];

    for (const { size, name } of iconsetSizes) {
      await sharp(inputSvg)
        .resize(size, size)
        .png()
        .toFile(path.join(iconsetDir, name));
    }
    console.log('Created: icon.iconset directory for Mac');

    // Generate ICO for Windows
    try {
      const pngToIco = require('png-to-ico');
      const icoSizes = [16, 32, 48, 64, 128, 256];
      const icoPngs = [];

      for (const size of icoSizes) {
        const pngPath = path.join(outputDir, `icon-${size}.png`);
        await sharp(inputSvg)
          .resize(size, size)
          .png()
          .toFile(pngPath);
        icoPngs.push(pngPath);
      }

      const icoBuffer = await pngToIco(icoPngs);
      fs.writeFileSync(path.join(outputDir, 'icon.ico'), icoBuffer);
      console.log('Created: icon.ico for Windows');

      // Cleanup temporary PNGs
      for (const pngPath of icoPngs) {
        fs.unlinkSync(pngPath);
      }
    } catch (e) {
      console.warn('Warning: Could not generate ICO file:', e.message);
      console.log('You can manually create icon.ico using online converters');
    }

    console.log('\n✅ Icon generation complete!');
    console.log('\nFor Mac .icns file, run this command:');
    console.log('  iconutil -c icns public/icon.iconset -o public/icon.icns');
    console.log('\nOr on Mac, electron-builder will automatically generate it from icon.png');

  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
