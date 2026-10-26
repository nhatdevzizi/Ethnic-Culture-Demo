// Original fictional nature scenery, copyright 2026 Cultural Trails contributors, MIT.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = new URL('../public/assets/', import.meta.url);
for (const dir of ['tiles', 'sprites']) await mkdir(new URL(`${dir}/`, root), { recursive: true });
const rect = (color, x, y, width, height) => ({ color, x, y, width, height });
let count = 0;
async function save(kind, key, width, height, blocks) {
  assert(blocks.length > 0);
  for (const block of blocks) {
    assert(/^#[0-9a-f]{6}$/i.test(block.color));
    const { x, y, width: w, height: h } = block;
    assert([x, y, w, h].every(Number.isInteger));
    assert(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= width && y + h <= height, `${key}: block outside canvas`);
  }
  const output = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${blocks.map(({ color, x, y, width: w, height: h }) => `<rect fill="${color}" x="${x}" y="${y}" width="${w}" height="${h}"/>`).join('')}</svg>\n`;
  const path = new URL(`${kind}/biome-${key}.svg`, root);
  await writeFile(path, output);
  assert.equal(await readFile(path, 'utf8'), output);
  count++;
}

const palettes = {
  meadow: { ground: ['#b2cf7f', '#c0d98c', '#a4c571', '#d9e8a6'], path: ['#e9c986', '#f2dba0', '#d8b779', '#fff0bf'] },
  wetland: { ground: ['#8fbc9c', '#a2caaa', '#7fae92', '#bed8b6'], path: ['#c8d9ce', '#e0e8d9', '#abc4b8', '#f1f1d9'] },
  woodland: { ground: ['#87ad79', '#98bc87', '#779e6c', '#b6d29a'], path: ['#bd9062', '#d8ae79', '#a77c56', '#ead09d'] },
  highland: { ground: ['#b2bd98', '#c5ccaa', '#9da987', '#dbe0bb'], path: ['#aab4b2', '#c7ceca', '#919f9e', '#e2e4d8'] },
};
for (const [theme, palette] of Object.entries(palettes)) {
  const [base, light, dark, glint] = palette.ground;
  await save('tiles', `${theme}-ground`, 32, 32, [
    rect(base, 0, 0, 32, 32), rect(light, 0, 0, 14, 10), rect(dark, 18, 18, 14, 14),
    rect(light, 2, 25, 6, 3), rect(dark, 8, 7, 2, 4), rect(glint, 10, 7, 2, 2),
    rect(dark, 25, 7, 2, 3), rect(light, 20, 20, 4, 2), rect(glint, 23, 22, 2, 2),
  ]);
  const [road, roadLight, roadDark, roadGlint] = palette.path;
  const path = [rect(road, 0, 0, 32, 32), rect(roadLight, 1, 1, 14, 13), rect(roadLight, 17, 17, 14, 13),
    rect(roadDark, 0, 15, 32, 1), rect(roadDark, 15, 0, 1, 16), rect(roadDark, 16, 16, 1, 16),
    rect(roadGlint, 3, 3, 9, 2), rect(roadGlint, 19, 19, 9, 2), rect(roadDark, 5, 25, 3, 2)];
  if (theme === 'woodland') path.push(rect(roadDark, 19, 5, 7, 2), rect(roadLight, 4, 20, 5, 2), rect(roadGlint, 23, 7, 4, 1));
  if (theme === 'highland') path.push(rect(roadDark, 5, 8, 8, 1), rect(roadDark, 21, 24, 6, 1));
  await save('tiles', `${theme}-path`, 32, 32, path);
}

const flower = (x, y, petal, light) => [
  rect('#466f40', x, y + 4, 2, 14), rect('#759348', x + 2, y + 10, 5, 3),
  rect(petal, x - 5, y, 12, 5), rect(petal, x - 2, y - 4, 6, 13),
  rect(light, x - 4, y - 2, 4, 4), rect('#e6aa49', x, y + 1, 3, 3), rect('#fff0aa', x, y, 2, 2),
];
await save('sprites', 'meadow-plant', 64, 80, [
  rect('#8aa45b', 6, 66, 52, 8), rect('#73974f', 12, 62, 40, 9),
  rect('#567d46', 16, 47, 3, 23), rect('#86a14e', 46, 40, 3, 27), rect('#6a9249', 26, 50, 3, 23),
  ...flower(17, 47, '#e89c8b', '#ffd5b4'), ...flower(30, 32, '#edc657', '#fff0a0'),
  ...flower(44, 50, '#d58eae', '#f4c9d3'), ...flower(49, 24, '#e7e2c2', '#fff9dd'),
  rect('#557e41', 9, 58, 7, 3), rect('#a7ba60', 35, 62, 10, 3),
]);
await save('sprites', 'wetland-plant', 64, 80, [
  rect('#689282', 6, 66, 52, 8), rect('#84aa8c', 12, 62, 40, 9), rect('#b0c9a1', 18, 70, 30, 2),
  rect('#426d53', 17, 25, 3, 44), rect('#507e57', 28, 14, 3, 57), rect('#719552', 39, 30, 3, 38), rect('#678e4f', 49, 21, 3, 45),
  rect('#567a48', 10, 41, 3, 23), rect('#88a85e', 13, 48, 3, 19), rect('#88a85e', 22, 38, 3, 28), rect('#95ad64', 35, 46, 3, 22),
  rect('#8b613f', 15, 16, 7, 16), rect('#b38a52', 16, 15, 4, 12),
  rect('#795a3e', 26, 5, 7, 18), rect('#b89b63', 27, 6, 4, 13),
  rect('#8b613f', 47, 12, 7, 17), rect('#b38a52', 48, 13, 4, 12),
]);
await save('sprites', 'woodland-plant', 64, 80, [
  rect('#648655', 8, 68, 49, 8), rect('#4f744b', 17, 72, 33, 6),
  rect('#634932', 28, 39, 11, 33), rect('#92683f', 30, 44, 6, 27), rect('#b4874b', 31, 55, 2, 16),
  rect('#2e5740', 7, 20, 51, 32), rect('#386847', 2, 17, 59, 26),
  rect('#44784e', 9, 7, 46, 34), rect('#588957', 18, 2, 31, 25), rect('#75a46b', 22, 6, 19, 10),
  rect('#8aba79', 26, 7, 11, 4), rect('#66965b', 8, 23, 15, 9), rect('#527f4e', 38, 22, 17, 15),
  rect('#6a985c', 23, 32, 14, 8), rect('#85ad6d', 12, 25, 5, 3), rect('#96bc77', 26, 33, 5, 3),
]);
await save('sprites', 'highland-plant', 64, 80, [
  rect('#9da784', 5, 66, 55, 9), rect('#7d8d7d', 10, 42, 44, 27), rect('#687c77', 5, 51, 54, 14),
  rect('#9eaaa0', 15, 27, 33, 30), rect('#c0c5ad', 22, 22, 18, 28), rect('#cdd0b8', 25, 23, 13, 5),
  rect('#8b9b91', 8, 49, 13, 14), rect('#b5bdae', 13, 43, 13, 7), rect('#6e817c', 38, 42, 12, 25),
  rect('#bec6b0', 22, 52, 13, 4), rect('#65834f', 36, 61, 17, 5), rect('#8aa164', 39, 58, 10, 5),
  rect('#9cab7b', 5, 62, 6, 6), rect('#71894f', 52, 57, 3, 12), rect('#a9b477', 56, 61, 2, 9),
]);

await save('sprites', 'meadow-animal', 24, 24, [
  rect('#c48258', 3, 4, 7, 8), rect('#f4c16f', 4, 5, 5, 6), rect('#fff0b2', 5, 6, 3, 2),
  rect('#c48258', 14, 4, 7, 8), rect('#f4c16f', 15, 5, 5, 6), rect('#fff0b2', 16, 6, 3, 2),
  rect('#c77881', 5, 13, 5, 6), rect('#eda79f', 6, 14, 3, 4), rect('#c77881', 14, 13, 5, 6), rect('#eda79f', 15, 14, 3, 4),
  rect('#485845', 10, 7, 4, 11), rect('#485845', 8, 3, 2, 4), rect('#485845', 14, 3, 2, 4), rect('#809d6b', 11, 9, 2, 6),
]);
await save('sprites', 'wetland-animal', 24, 32, [
  rect('#8aa492', 3, 28, 17, 3), rect('#b6c6b3', 5, 14, 12, 8), rect('#e3e5d4', 5, 13, 9, 6),
  rect('#708d87', 6, 17, 7, 4), rect('#c4d1c1', 14, 5, 4, 15), rect('#e8ead9', 14, 4, 6, 6),
  rect('#36504c', 18, 6, 2, 2), rect('#c9a35f', 20, 8, 4, 2), rect('#6b7252', 9, 21, 2, 8),
  rect('#6b7252', 14, 21, 2, 8), rect('#6b7252', 9, 28, 5, 1), rect('#6b7252', 14, 28, 5, 1),
]);
await save('sprites', 'woodland-animal', 24, 24, [
  rect('#617f4e', 3, 19, 18, 3), rect('#5f826b', 5, 8, 12, 11), rect('#84a38a', 7, 7, 9, 9),
  rect('#bdd0ad', 11, 12, 7, 6), rect('#44634e', 3, 12, 7, 4), rect('#4b7158', 7, 10, 7, 5),
  rect('#7b9c7b', 13, 4, 6, 9), rect('#233f38', 17, 6, 2, 2), rect('#cfaa67', 19, 9, 4, 2),
  rect('#716543', 11, 18, 2, 3), rect('#716543', 16, 18, 2, 3), rect('#c2d29e', 13, 13, 3, 3),
]);
await save('sprites', 'highland-animal', 28, 28, [
  rect('#8c9f84', 4, 23, 21, 3), rect('#b6b5a3', 4, 12, 17, 11), rect('#dbd8c2', 6, 11, 13, 10),
  rect('#eee9d3', 17, 9, 7, 10), rect('#dbd8c2', 16, 2, 3, 9), rect('#dbd8c2', 21, 1, 3, 11),
  rect('#c3a68d', 17, 4, 1, 5), rect('#c3a68d', 22, 3, 1, 6), rect('#475549', 22, 12, 2, 2),
  rect('#9b8670', 24, 16, 2, 2), rect('#aaa995', 5, 21, 9, 3), rect('#e5dfc7', 17, 21, 7, 3), rect('#f3edd8', 2, 14, 4, 5),
]);

const arch = [rect('#97b26c', 12, 110, 168, 9), rect('#7b964f', 22, 106, 148, 8),
  rect('#805d3f', 36, 29, 8, 80), rect('#ae8451', 38, 28, 3, 78), rect('#805d3f', 148, 29, 8, 80), rect('#ae8451', 150, 28, 3, 78),
  rect('#805d3f', 42, 18, 108, 10), rect('#b08b55', 48, 16, 96, 7), rect('#618748', 30, 33, 20, 12), rect('#719652', 142, 33, 20, 12)];
for (const [x, y, color, light] of [[43, 27, '#e8aa82', '#ffe0b3'], [64, 20, '#e7c75c', '#fff0b4'], [87, 17, '#d89aaf', '#f9cbd6'], [110, 17, '#e7c75c', '#fff0b4'], [134, 20, '#e8aa82', '#ffe0b3'], [153, 30, '#d89aaf', '#f9cbd6'], [32, 86, '#e7c75c', '#fff0b4'], [160, 88, '#e8aa82', '#ffe0b3']]) arch.push(...flower(x, y, color, light));
await save('sprites', 'meadow-landmark', 192, 128, arch);

const pool = [rect('#6b9380', 18, 34, 156, 70), rect('#6b9380', 32, 22, 128, 94), rect('#8bae91', 26, 30, 140, 76),
  rect('#8bae91', 38, 18, 116, 94), rect('#4c8e91', 34, 40, 124, 54), rect('#4c8e91', 46, 30, 100, 72),
  rect('#75b5b0', 42, 39, 108, 28), rect('#63a7a4', 40, 69, 112, 21), rect('#9dcec1', 57, 43, 46, 3),
  rect('#8ec4b5', 87, 77, 43, 3), rect('#b3d7c5', 48, 59, 26, 2), rect('#477b60', 52, 72, 28, 9),
  rect('#75a475', 54, 68, 24, 9), rect('#97bb85', 58, 67, 14, 4), rect('#548f91', 65, 71, 13, 2),
  rect('#477b60', 112, 52, 26, 9), rect('#75a475', 114, 48, 22, 9), rect('#e7b5b1', 121, 44, 8, 7),
  rect('#ffe8d8', 118, 46, 14, 3), rect('#edcf7d', 123, 46, 4, 3), rect('#d2c7a0', 28, 45, 9, 7), rect('#cad0ad', 147, 85, 14, 7)];
for (const [x, y] of [[18, 76], [163, 65], [44, 102]]) pool.push(rect('#507a4b', x, y - 22, 3, 26), rect('#769b59', x + 5, y - 15, 3, 20), rect('#ad9466', x - 1, y - 30, 5, 12));
await save('sprites', 'wetland-landmark', 192, 128, pool);

const stump = [rect('#6f8e5c', 17, 104, 158, 13), rect('#59784f', 31, 109, 128, 11),
  rect('#654b35', 56, 47, 75, 60), rect('#87613e', 63, 42, 60, 65), rect('#ac8050', 66, 45, 8, 56),
  rect('#9a7146', 93, 50, 10, 58), rect('#4f4330', 111, 58, 7, 43), rect('#654b35', 44, 96, 18, 15),
  rect('#87613e', 37, 104, 30, 8), rect('#654b35', 122, 94, 22, 18), rect('#87613e', 131, 104, 23, 9),
  rect('#654b35', 51, 41, 83, 18), rect('#d4af71', 57, 37, 71, 16), rect('#e9cc91', 64, 37, 57, 5),
  rect('#af854e', 68, 45, 48, 5), rect('#e3c78b', 74, 43, 36, 5), rect('#a77b48', 83, 44, 18, 3),
  rect('#67894e', 52, 58, 25, 8), rect('#86a15c', 57, 55, 18, 5), rect('#79964e', 113, 84, 20, 8)];
for (const [x, y] of [[28, 92], [151, 91], [143, 107]]) stump.push(rect('#d6c8a0', x, y, 5, 17), rect('#b9684f', x - 7, y - 7, 20, 8), rect('#cf8970', x - 4, y - 10, 14, 5), rect('#f5dbad', x - 2, y - 7, 4, 3));
await save('sprites', 'woodland-landmark', 192, 128, stump);

await save('sprites', 'highland-landmark', 192, 128, [
  rect('#a3ad8b', 9, 107, 174, 12), rect('#849589', 15, 77, 64, 32), rect('#b3bdb1', 27, 62, 46, 37),
  rect('#d1d4bd', 35, 55, 29, 26), rect('#e3e3cc', 39, 55, 23, 6), rect('#738782', 17, 90, 63, 20),
  rect('#70847e', 67, 47, 70, 63), rect('#9aa99d', 75, 29, 54, 68), rect('#b9c3b0', 87, 17, 32, 63),
  rect('#d6d9c0', 93, 13, 21, 42), rect('#e6e7cf', 95, 14, 16, 7), rect('#82968a', 112, 55, 21, 49),
  rect('#c9d0b9', 82, 58, 24, 6), rect('#a8b7a2', 94, 82, 18, 6), rect('#82958b', 128, 76, 49, 33),
  rect('#a9b7a6', 137, 62, 32, 35), rect('#cad1b9', 143, 57, 19, 15), rect('#e0e1c8', 145, 58, 14, 4),
  rect('#c3ccb5', 24, 87, 20, 5), rect('#708b54', 47, 105, 23, 6), rect('#8da66c', 51, 102, 14, 5),
  rect('#819861', 143, 103, 31, 7), rect('#a9b77b', 149, 100, 18, 5), rect('#d5d3ae', 74, 111, 11, 4),
]);

assert.equal(count, 20);
console.log(`Generated and checked ${count} original biome SVGs (8 tiles, 12 sprites).`);
