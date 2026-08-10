const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const svgPath = path.resolve(__dirname, '../assets/commute-companion-logo (2).svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

// Copy standard logo.svg
fs.writeFileSync(path.resolve(__dirname, '../assets/logo.svg'), svgContent);

function renderPng(svg, width) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width }
  });
  return resvg.render().asPng();
}

// 1. App Icon, Logo, Splash, and Favicon
fs.writeFileSync(path.resolve(__dirname, '../assets/icon.png'), renderPng(svgContent, 1024));
fs.writeFileSync(path.resolve(__dirname, '../assets/logo.png'), renderPng(svgContent, 512));
fs.writeFileSync(path.resolve(__dirname, '../assets/splash-icon.png'), renderPng(svgContent, 512));
fs.writeFileSync(path.resolve(__dirname, '../assets/favicon.png'), renderPng(svgContent, 64));

// 2. Standalone Pin Logo (Transparent background)
const pinSvg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M 18 38 A 32 32 0 1 1 82 38 C 82 62, 50 88, 50 88 C 50 88, 18 62, 18 38 Z" fill="#0057FF"/>
  <circle cx="50" cy="38" r="20" fill="#F8F7F4"/>
  <g fill="#0057FF">
    <circle cx="41" cy="29" r="5"/>
    <circle cx="59" cy="29" r="5"/>
    <path d="M 31.5 46 C 31.5 38, 36 36, 41 36 C 46 36, 48 40, 50 40 C 52 40, 54 36, 59 36 C 64 36, 68.5 38, 68.5 46 Z"/>
  </g>
</svg>`;
fs.writeFileSync(path.resolve(__dirname, '../assets/logo-pin.png'), renderPng(pinSvg, 512));

// 3. Android Adaptive Icon Foreground
const adaptiveForegroundSvg = `<svg viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(18, 18) scale(0.72)">
    <path d="M 18 38 A 32 32 0 1 1 82 38 C 82 62, 50 88, 50 88 C 50 88, 18 62, 18 38 Z" fill="#0057FF"/>
    <circle cx="50" cy="38" r="20" fill="#F8F7F4"/>
    <g fill="#0057FF">
      <circle cx="41" cy="29" r="5"/>
      <circle cx="59" cy="29" r="5"/>
      <path d="M 31.5 46 C 31.5 38, 36 36, 41 36 C 46 36, 48 40, 50 40 C 52 40, 54 36, 59 36 C 64 36, 68.5 38, 68.5 46 Z"/>
    </g>
  </g>
</svg>`;
fs.writeFileSync(path.resolve(__dirname, '../assets/android-icon-foreground.png'), renderPng(adaptiveForegroundSvg, 512));

// 4. Android Adaptive Icon Background
const adaptiveBgSvg = `<svg viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg">
  <rect width="108" height="108" fill="#F8F7F4"/>
</svg>`;
fs.writeFileSync(path.resolve(__dirname, '../assets/android-icon-background.png'), renderPng(adaptiveBgSvg, 512));

// 5. Android Monochrome Icon
const monochromeSvg = `<svg viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(18, 18) scale(0.72)">
    <path d="M 18 38 A 32 32 0 1 1 82 38 C 82 62, 50 88, 50 88 C 50 88, 18 62, 18 38 Z" fill="#FFFFFF"/>
    <circle cx="50" cy="38" r="20" fill="#000000"/>
    <g fill="#FFFFFF">
      <circle cx="41" cy="29" r="5"/>
      <circle cx="59" cy="29" r="5"/>
      <path d="M 31.5 46 C 31.5 38, 36 36, 41 36 C 46 36, 48 40, 50 40 C 52 40, 54 36, 59 36 C 64 36, 68.5 38, 68.5 46 Z"/>
    </g>
  </g>
</svg>`;
fs.writeFileSync(path.resolve(__dirname, '../assets/android-icon-monochrome.png'), renderPng(monochromeSvg, 512));

console.log('All image assets generated successfully!');
