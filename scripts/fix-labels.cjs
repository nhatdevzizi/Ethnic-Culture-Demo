/**
 * Script: fix-labels.cjs
 * Mục đích: Bỏ backgroundColor trên các nhãn chữ NPC / vật lễ hội trong HubScene.ts
 * Chỉ xóa backgroundColor + padding nền; giữ nguyên fontFamily, fontSize, color.
 * Thêm stroke trắng để chữ dễ đọc trên nền cảnh.
 */

const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/game/scenes/HubScene.ts');
let src = fs.readFileSync(filePath, 'utf8');

// ── 1. NPC labels (npc.name, chữ thường với backgroundColor: '#fff7e0') ──────
// Before:
//   fontSize: '11px',
//   fontStyle: 'bold',
//   color: '#213e31',
//   backgroundColor: '#fff7e0',
//   padding: { x: 5, y: 2 },
// After: bỏ backgroundColor & padding, thêm stroke
src = src.replace(
  /fontSize: '11px',\r?\n(\s*)fontStyle: 'bold',\r?\n(\s*)color: '#213e31',\r?\n(\s*)backgroundColor: '#fff7e0',\r?\n(\s*)padding: \{ x: 5, y: 2 \},/,
  (match, s1, s2, s3) =>
    `fontSize: '11px',\n${s1}fontStyle: 'bold',\n${s2}color: '#213e31',\n${s3}stroke: '#ffffff',\n${s3}strokeThickness: 3,`
);

// ── 2. Guide "An" label (backgroundColor: '#fff4d8') ─────────────────────────
// Before:
//   fontSize: '20px',
//   color: '#244e42',
//   backgroundColor: '#fff4d8',
//   padding: { x: 6, y: 3 },
// After: bỏ backgroundColor & padding, thêm stroke
src = src.replace(
  /fontSize: '20px',\r?\n(\s*)color: '#244e42',\r?\n(\s*)backgroundColor: '#fff4d8',\r?\n(\s*)padding: \{ x: 6, y: 3 \},/,
  (match, s1, s2) =>
    `fontSize: '20px',\n${s1}color: '#244e42',\n${s2}stroke: '#ffffff',\n${s2}strokeThickness: 4,`
);

// ── 3. Trống Đồng label (backgroundColor: '#ffd700') ─────────────────────────
// Before:
//   fontStyle: 'bold',
//   color: '#4a2f00',
//   backgroundColor: '#ffd700',
//   padding: { x: 8, y: 3 },
// After: bỏ backgroundColor & padding, thêm stroke vàng nhạt
src = src.replace(
  /fontStyle: 'bold',\r?\n(\s*)color: '#4a2f00',\r?\n(\s*)backgroundColor: '#ffd700',\r?\n(\s*)padding: \{ x: 8, y: 3 \},/,
  (match, s1, s2) =>
    `fontStyle: 'bold',\n${s1}color: '#4a2f00',\n${s2}stroke: '#ffe680',\n${s2}strokeThickness: 3,`
);

// ── 4. Festival badge labels (backgroundColor: '#9e2a2b') ────────────────────
// Before:
//   fontStyle: 'bold',
//   color: '#ffffff',
//   backgroundColor: '#9e2a2b',
//   padding: { x: 5, y: 2 },
// After: đổi color sang đỏ đậm, thêm stroke trắng
src = src.replace(
  /fontStyle: 'bold',\r?\n(\s*)color: '#ffffff',\r?\n(\s*)backgroundColor: '#9e2a2b',\r?\n(\s*)padding: \{ x: 5, y: 2 \},/g,
  (match, s1, s2) =>
    `fontStyle: 'bold',\n${s1}color: '#7a1a1a',\n${s2}stroke: '#ffffff',\n${s2}strokeThickness: 3,`
);

fs.writeFileSync(filePath, src, 'utf8');
console.log('✅ fix-labels.cjs: đã bỏ backgroundColor trên tất cả nhãn chữ NPC và lễ hội.');
