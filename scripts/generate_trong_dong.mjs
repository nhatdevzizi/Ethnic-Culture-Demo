// Script to generate a brilliant, radiant, gleaming golden Dong Son Bronze Drum SVG
import fs from 'fs';

const cx = 200, cy = 200;

function polarToCartesian(r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180.0;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  };
}

let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <!-- Radiant Polished Gold Sheen Gradients -->
    <radialGradient id="drumBg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fffde6" />
      <stop offset="25%" stop-color="#ffeb7a" />
      <stop offset="55%" stop-color="#ffd700" />
      <stop offset="80%" stop-color="#e6b800" />
      <stop offset="94%" stop-color="#c69500" />
      <stop offset="100%" stop-color="#996f00" />
    </radialGradient>
    <radialGradient id="sunburstGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="30%" stop-color="#fff6a8" />
      <stop offset="70%" stop-color="#f4c430" />
      <stop offset="100%" stop-color="#d4af37" />
    </radialGradient>
    <linearGradient id="metallicRing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="35%" stop-color="#ffe680" />
      <stop offset="70%" stop-color="#ffd700" />
      <stop offset="100%" stop-color="#b38600" />
    </linearGradient>
    <filter id="drumShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#b38600" flood-opacity="0.5" />
    </filter>
    <filter id="goldGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Outer Luminous Golden Aura -->
  <circle cx="200" cy="200" r="198" fill="none" stroke="#fff4b8" stroke-width="2" opacity="0.6" filter="url(#goldGlow)" />

  <!-- Base Drum Rim in Radiant 24K Gold -->
  <circle cx="200" cy="200" r="194" fill="url(#drumBg)" stroke="url(#metallicRing)" stroke-width="4" filter="url(#drumShadow)" />
  <circle cx="200" cy="200" r="188" fill="none" stroke="#ffffff" stroke-width="1.8" opacity="0.9" />
`;

// 1. Outer Dentil (Sawtooth / Răng cưa) ring (r = 182 - 188)
svg += `  <!-- Ring 1: Outer Dentils in Polished Gold -->\n  <g fill="#805900" stroke="#ffd700" stroke-width="0.5">\n`;
const outerDentilCount = 72;
for (let i = 0; i < outerDentilCount; i++) {
  const a1 = (i * 360) / outerDentilCount;
  const a2 = a1 + (360 / outerDentilCount) / 2;
  const a3 = a1 + (360 / outerDentilCount);
  const p1 = polarToCartesian(182, a1);
  const p2 = polarToCartesian(187, a2);
  const p3 = polarToCartesian(182, a3);
  svg += `    <polygon points="${p1.x.toFixed(1)},${p1.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)} ${p3.x.toFixed(1)},${p3.y.toFixed(1)}" />\n`;
}
svg += `  </g>\n`;

// Concentric ring dividing lines
svg += `  <circle cx="200" cy="200" r="178" fill="none" stroke="#996f00" stroke-width="2" />\n`;
svg += `  <circle cx="200" cy="200" r="172" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3,3" />\n`;
svg += `  <circle cx="200" cy="200" r="166" fill="none" stroke="#996f00" stroke-width="2" />\n`;

// 2. Ring of Chim Lạc (10 flying birds counter-clockwise, r ~ 150)
svg += `  <!-- Ring 2: Chim Lac (Flying Birds in Embossed Gold) -->\n  <g fill="#734d00" stroke="#fff4a8" stroke-width="0.8">\n`;
const birdCount = 10;
for (let i = 0; i < birdCount; i++) {
  const angle = (i * 360) / birdCount;
  svg += `    <g transform="rotate(${angle.toFixed(1)} 200 200)">\n`;
  svg += `      <path d="M 200 48 Q 192 46 182 43 Q 175 42 165 42 Q 175 46 185 48 Q 195 50 197 53 Q 190 56 178 57 Q 165 57 150 56 Q 166 61 184 60 Q 194 59 198 56 Q 202 54 205 52 Q 212 50 220 48 Q 214 46 208 47 Z" />\n`;
  svg += `      <circle cx="205" cy="50" r="1.5" fill="#ffffff" />\n`;
  svg += `    </g>\n`;
}
svg += `  </g>\n`;

svg += `  <circle cx="200" cy="200" r="136" fill="none" stroke="#ffffff" stroke-width="2" />\n`;
svg += `  <circle cx="200" cy="200" r="130" fill="none" stroke="#996f00" stroke-width="1.5" stroke-dasharray="3,3" />\n`;

// 3. Ring of Concentric circles with Tangential spirals (r ~ 120)
svg += `  <!-- Ring 3: Concentric Circles with Tangents -->\n  <g stroke="#805900" stroke-width="1.5" fill="none">\n`;
const spiralCount = 36;
for (let i = 0; i < spiralCount; i++) {
  const a = (i * 360) / spiralCount;
  const p = polarToCartesian(120, a);
  svg += `    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#fff6a8" />\n`;
  svg += `    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="1.5" fill="#805900" />\n`;
}
svg += `  </g>\n`;

svg += `  <circle cx="200" cy="200" r="110" fill="none" stroke="#ffffff" stroke-width="2" />\n`;

// 4. Ring of Dancers / Warriors in feather headdress (r ~ 95)
svg += `  <!-- Ring 4: Stylized Feather Dancers -->\n  <g fill="#734d00" stroke="#734d00" stroke-width="1.5">\n`;
const dancerCount = 12;
for (let i = 0; i < dancerCount; i++) {
  const angle = (i * 360) / dancerCount;
  svg += `    <g transform="rotate(${angle.toFixed(1)} 200 200)">\n`;
  svg += `      <path d="M 197 100 Q 194 92 188 88 Q 192 94 196 102 Z" fill="#734d00" />\n`;
  svg += `      <circle cx="198" cy="103" r="2.2" fill="#734d00" />\n`;
  svg += `      <path d="M 198 105 L 197 114 L 194 118 M 197 114 L 201 118 M 198 108 L 192 110 M 198 108 L 204 107" stroke="#734d00" stroke-width="1.8" stroke-linecap="round" fill="none" />\n`;
  svg += `    </g>\n`;
}
svg += `  </g>\n`;

svg += `  <circle cx="200" cy="200" r="82" fill="none" stroke="#ffffff" stroke-width="2.2" />\n`;

// 5. Inner Dentil Ring (r ~ 76)
svg += `  <!-- Ring 5: Inner Dentils -->\n  <g fill="#805900">\n`;
const innerDentilCount = 48;
for (let i = 0; i < innerDentilCount; i++) {
  const a1 = (i * 360) / innerDentilCount;
  const a2 = a1 + (360 / innerDentilCount) / 2;
  const a3 = a1 + (360 / innerDentilCount);
  const p1 = polarToCartesian(76, a1);
  const p2 = polarToCartesian(81, a2);
  const p3 = polarToCartesian(76, a3);
  svg += `    <polygon points="${p1.x.toFixed(1)},${p1.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)} ${p3.x.toFixed(1)},${p3.y.toFixed(1)}" />\n`;
}
svg += `  </g>\n`;

svg += `  <circle cx="200" cy="200" r="70" fill="none" stroke="#996f00" stroke-width="1.5" />\n`;

// 6. Central Radiant Solar Sun: 14-pointed Star (r ~ 68 outer, r ~ 26 inner)
svg += `  <!-- Center: 14-Pointed Solar Star in Radiant Gold -->\n`;
svg += `  <circle cx="200" cy="200" r="68" fill="#ffeb7a" stroke="#805900" stroke-width="2" />\n`;

const starPoints = 14;
const starOuterR = 66;
const starInnerR = 25;
let starPolygon = '';
for (let i = 0; i < starPoints * 2; i++) {
  const r = (i % 2 === 0) ? starOuterR : starInnerR;
  const a = (i * 360) / (starPoints * 2);
  const p = polarToCartesian(r, a);
  starPolygon += `${p.x.toFixed(1)},${p.y.toFixed(1)} `;
}
svg += `  <polygon points="${starPolygon.trim()}" fill="url(#sunburstGlow)" stroke="#734d00" stroke-width="1.2" filter="url(#goldGlow)" />\n`;

// Peacock feather patterns (họa tiết lông công) in the angles between star rays
svg += `  <g fill="#b38600" opacity="0.9">\n`;
for (let i = 0; i < starPoints; i++) {
  const a = (i * 360) / starPoints + (360 / (starPoints * 2));
  const pOut = polarToCartesian(62, a);
  const pIn = polarToCartesian(28, a);
  const pMid1 = polarToCartesian(45, a - 3);
  const pMid2 = polarToCartesian(45, a + 3);
  svg += `    <polygon points="${pIn.x.toFixed(1)},${pIn.y.toFixed(1)} ${pMid1.x.toFixed(1)},${pMid1.y.toFixed(1)} ${pOut.x.toFixed(1)},${pOut.y.toFixed(1)} ${pMid2.x.toFixed(1)},${pMid2.y.toFixed(1)}" />\n`;
}
svg += `  </g>\n`;

// Center Star Hub: Radiant White-Gold Core
svg += `  <circle cx="200" cy="200" r="15" fill="#ffffff" stroke="#b38600" stroke-width="2.5" />\n`;
svg += `  <circle cx="200" cy="200" r="8" fill="#ffd700" />\n`;
svg += `  <circle cx="200" cy="200" r="3" fill="#ffffff" />\n`;

svg += `</svg>\n`;

fs.writeFileSync('public/assets/sprites/trong_dong_dong_son.svg', svg);
console.log('Successfully regenerated public/assets/sprites/trong_dong_dong_son.svg in Radiant Gold!');
