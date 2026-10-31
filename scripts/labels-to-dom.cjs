/**
 * labels-to-dom.cjs
 * Chuyển 4 loại nhãn this.add.text() thành this.add.dom() (HTML <span> thật sự)
 * trong HubScene.ts.
 */

const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/game/scenes/HubScene.ts');
let src = fs.readFileSync(filePath, 'utf8');

// ── CSS dùng chung cho từng loại ─────────────────────────────────────────────
const NPC_CSS = [
  'font-family:\\"Be Vietnam Pro\\",Arial,sans-serif',
  'font-size:12px',
  'font-weight:bold',
  'color:#1a3d2e',
  'text-shadow:-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,1px 1px 0 #fff',
  'white-space:nowrap',
  'pointer-events:none',
  'user-select:none',
].join(';');

const GUIDE_CSS = [
  'font-family:\\"Be Vietnam Pro\\",Arial,sans-serif',
  'font-size:16px',
  'font-weight:bold',
  'color:#1a3d2e',
  'text-shadow:-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,1px 1px 0 #fff',
  'white-space:nowrap',
  'pointer-events:none',
  'user-select:none',
].join(';');

const DRUM_CSS = [
  'font-family:\\"Be Vietnam Pro\\",Arial,sans-serif',
  'font-size:13px',
  'font-weight:bold',
  'color:#4a2f00',
  'text-shadow:-1px -1px 0 #ffe680,1px -1px 0 #ffe680,-1px 1px 0 #ffe680,1px 1px 0 #ffe680',
  'white-space:nowrap',
  'pointer-events:none',
  'user-select:none',
].join(';');

const BADGE_CSS = [
  'font-family:\\"Be Vietnam Pro\\",Arial,sans-serif',
  'font-size:11px',
  'font-weight:bold',
  'color:#7a1a1a',
  'text-shadow:-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,1px 1px 0 #fff',
  'white-space:nowrap',
  'pointer-events:none',
  'user-select:none',
].join(';');

// ── 1. NPC label  (instructor.x, instructor.y - 60, npc.name, …) ─────────────
// Phải khớp đúng đoạn bao gồm .setOrigin(0.5).setDepth(...)
src = src.replace(
  /this\.add\s*\n(\s*)\.text\(instructor\.x,\s*instructor\.y\s*-\s*60,\s*npc\.name,\s*\{[\s\S]*?strokeThickness:\s*3,\s*\n(\s*)\}\)\s*\n(\s*)\.setOrigin\(0\.5\)\s*\n(\s*)\.setDepth\(instructor\.y\s*\+\s*20\);/,
  (match, s1, s2, s3, s4) =>
    `this.add\n${s1}.dom(instructor.x, instructor.y - 60, 'span', '${NPC_CSS}', npc.name)\n${s3}.setOrigin(0.5, 0.5)\n${s4}.setDepth(instructor.y + 20);`
);

// ── 2. Guide "An" label ───────────────────────────────────────────────────────
src = src.replace(
  /this\.add\s*\n(\s*)\.text\(map\.guide\.x,\s*map\.guide\.y\s*-\s*62,\s*'An',\s*\{[\s\S]*?strokeThickness:\s*4,\s*\n(\s*)\}\)\s*\n(\s*)\.setResolution\(2\)\s*\n(\s*)\.setOrigin\(0\.5\)\s*\n(\s*)\.setDepth\(10000\);/,
  (match, s1, s2, s3, s4, s5) =>
    `this.add\n${s1}.dom(map.guide.x, map.guide.y - 62, 'span', '${GUIDE_CSS}', 'An')\n${s3}.setOrigin(0.5, 0.5)\n${s5}.setDepth(10000);`
);

// ── 3. Trống Đồng label ───────────────────────────────────────────────────────
src = src.replace(
  /this\.add\s*\n(\s*)\.text\(map\.board\.x,\s*map\.board\.y\s*-\s*85,[\s\S]*?strokeThickness:\s*3,\s*\n(\s*)\}\)\s*\n(\s*)\.setOrigin\(0\.5\)\s*\n(\s*)\.setDepth\(map\.board\.y\s*\+\s*12\);/,
  (match, s1, s2, s3, s4) =>
    `this.add\n${s1}.dom(map.board.x, map.board.y - 85, 'span', '${DRUM_CSS}', '✨ TRỐNG ĐỒNG ĐÔNG SƠN ✨')\n${s3}.setOrigin(0.5, 0.5)\n${s4}.setDepth(map.board.y + 12);`
);

// ── 4. Festival badge labels ──────────────────────────────────────────────────
// this.add
//   .text(attr.x, attr.y - attr.height - 8, attr.badge, { … })
//   .setOrigin(0.5)
//   .setDepth(attr.y + 1);
src = src.replace(
  /this\.add\s*\n(\s*)\.text\(attr\.x,\s*attr\.y\s*-\s*attr\.height\s*-\s*8,\s*attr\.badge,\s*\{[\s\S]*?strokeThickness:\s*3,\s*\n(\s*)\}\)\s*\n(\s*)\.setOrigin\(0\.5\)\s*\n(\s*)\.setDepth\(attr\.y\s*\+\s*1\);/,
  (match, s1, s2, s3, s4) =>
    `this.add\n${s1}.dom(attr.x, attr.y - attr.height - 8, 'span', '${BADGE_CSS}', attr.badge)\n${s3}.setOrigin(0.5, 0.5)\n${s4}.setDepth(attr.y + 1);`
);

fs.writeFileSync(filePath, src, 'utf8');
console.log('✅ labels-to-dom.cjs xong.');

// Kiểm tra: vẫn còn add.text nào của nhãn không?
const remaining = src.match(/\.text\(.*npc\.name|\.text\(.*'An'.*\{|\.text\(.*TRỐNG|\.text\(.*attr\.badge/g);
if (remaining) {
  console.warn('⚠️  Còn sót this.add.text nhãn:', remaining);
} else {
  console.log('✅ Không còn this.add.text nhãn nào sót.');
}
