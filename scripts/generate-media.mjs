import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = new URL('../public/assets/', import.meta.url);
for (const dir of ['tiles', 'sprites', 'audio']) await mkdir(new URL(`${dir}/`, root), { recursive: true });
const rect = (color, x, y, width, height) => `<rect fill="${color}" x="${x}" y="${y}" width="${width}" height="${height}"/>`;
const svg = (width, height, rectangles) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${rectangles.join('')}</svg>\n`;
const save = async (path, width, height, rectangles) => {
  assert(Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0);
  assert(rectangles.length > 0);
  const output = svg(width, height, rectangles);
  for (const match of output.matchAll(/<rect fill="[^"]+" x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/g)) {
    const [x, y, w, h] = match.slice(1).map(Number);
    assert([x, y, w, h].every(Number.isFinite) && x >= 0 && y >= 0 && w > 0 && h > 0);
    assert(x + w <= width && y + h <= height, `${path}: rectangle exceeds canvas`);
  }
  await writeFile(new URL(path, root), output);
  assert.equal(await readFile(new URL(path, root), 'utf8'), output);
};
await save('tiles/grass.svg', 32, 32, [
  rect('#a5c981', 0, 0, 32, 32), rect('#adcf89', 0, 0, 16, 14), rect('#9fc47b', 17, 18, 15, 14),
  rect('#8db66d', 5, 7, 2, 4), rect('#c1dca1', 7, 7, 2, 2), rect('#8db66d', 22, 24, 2, 3),
  rect('#d2e8ad', 24, 22, 2, 2), rect('#94bd72', 14, 18, 2, 2), rect('#bad696', 28, 8, 2, 2),
]);
await save('tiles/path.svg', 32, 32, [
  rect('#efd39c', 0, 0, 32, 32), rect('#f6dfa9', 1, 1, 14, 13), rect('#f6dfa9', 17, 17, 14, 13),
  rect('#dfc28c', 0, 15, 32, 1), rect('#dfc28c', 15, 0, 1, 16), rect('#dfc28c', 16, 16, 1, 16),
  rect('#fff0c4', 3, 3, 10, 1), rect('#fff0c4', 19, 19, 10, 1), rect('#d5b782', 6, 26, 2, 1),
]);
await save('tiles/stone.svg', 32, 32, [
  rect('#566f61', 0, 0, 32, 32), rect('#84937e', 1, 1, 30, 26), rect('#a1ad93', 2, 2, 28, 3),
  rect('#74856f', 3, 8, 12, 16), rect('#8d9c83', 17, 7, 12, 17), rect('#5b745d', 0, 27, 32, 5),
  rect('#7c9a67', 2, 26, 7, 3), rect('#96ac76', 3, 25, 4, 2), rect('#60785c', 24, 28, 5, 3),
]);
await save('sprites/tree.svg', 64, 72, [
  rect('#56764f', 12, 59, 42, 8), rect('#476847', 18, 64, 29, 5),
  rect('#674934', 27, 36, 11, 28), rect('#8a6040', 29, 36, 6, 27), rect('#a57b4b', 30, 48, 2, 13),
  rect('#254d3d', 9, 21, 47, 31), rect('#2e6045', 3, 16, 57, 28), rect('#3d7750', 9, 7, 46, 31),
  rect('#4c8758', 16, 2, 34, 24), rect('#609b65', 18, 6, 25, 12), rect('#80af74', 23, 7, 14, 5),
  rect('#6da66b', 11, 17, 12, 8), rect('#477f52', 42, 17, 11, 15), rect('#3c714c', 20, 32, 19, 13),
  rect('#59905d', 8, 27, 13, 7), rect('#58915e', 31, 22, 11, 7), rect('#92b67c', 17, 18, 4, 3),
]);
await save('sprites/tree-alt.svg', 64, 72, [
  rect('#56764f', 12, 59, 42, 8), rect('#476847', 18, 64, 29, 5),
  rect('#674934', 27, 37, 11, 27), rect('#8a6040', 29, 38, 6, 25), rect('#a57b4b', 30, 49, 2, 12),
  rect('#2d5140', 12, 22, 43, 29), rect('#356347', 6, 15, 53, 28), rect('#47764f', 12, 6, 43, 31),
  rect('#578958', 18, 2, 31, 24), rect('#719d68', 20, 6, 22, 13), rect('#90b17a', 24, 7, 12, 5),
  rect('#4a7b50', 6, 25, 14, 11), rect('#608e5b', 10, 21, 13, 8), rect('#7ca56d', 14, 19, 7, 5),
  rect('#3f714b', 35, 25, 19, 18), rect('#568352', 35, 21, 15, 9), rect('#84a56a', 37, 22, 5, 3),
  rect('#3b6946', 20, 34, 20, 11), rect('#5a8754', 22, 30, 12, 7), rect('#9bb67b', 23, 30, 4, 3),
]);

const leafClump = (x, y, wide = false) => [
  rect('#345840', x - 8, y + 4, wide ? 20 : 16, 5), rect('#416d46', x - 10, y, wide ? 22 : 18, 6),
  rect('#527e4d', x - 7, y - 5, 6, 9), rect('#699452', x - 5, y - 7, 3, 6),
  rect('#59834b', x + 1, y - 3, 7, 7), rect('#7c9d59', x + 3, y - 5, 4, 5),
  rect('#638c4e', x - 11, y + 1, 5, 3), rect('#8ba660', x - 8, y, 3, 2),
  rect('#83a45d', x + 4, y + 1, 5, 2), rect('#3a6440', x - 2, y + 1, 3, 7),
];
const bloom = (x, y, petal, light) => [
  rect('#3b6741', x, y + 3, 2, 9), rect('#64894a', x + 2, y + 7, 4, 2),
  rect(petal, x - 3, y - 2, 8, 7), rect(petal, x - 5, y, 12, 3),
  rect(light, x - 2, y - 4, 6, 3), rect(light, x - 4, y - 1, 3, 3),
  rect('#9d6b3f', x, y, 3, 3), rect('#f5d88a', x, y - 1, 2, 2),
];
for (const alternate of [false, true]) {
  const bed = [
    rect('#57744b', 16, 88, 96, 6), rect('#57744b', 5, 23, 118, 60),
    rect('#877d5b', 14, 5, 100, 86), rect('#877d5b', 4, 16, 120, 64),
    rect('#c7bd91', 15, 4, 98, 82), rect('#c7bd91', 5, 16, 118, 60),
    rect('#e0d1a5', 17, 4, 94, 4), rect('#e0d1a5', 5, 18, 4, 54),
    rect('#766246', 17, 13, 94, 65), rect('#766246', 13, 20, 102, 53),
    rect('#594e38', 20, 17, 88, 58), rect('#594e38', 17, 24, 94, 45),
  ];
  for (const [x, y] of [[23, 12], [48, 12], [75, 12], [100, 12], [9, 33], [9, 58], [117, 34], [117, 60], [28, 81], [55, 81], [83, 81], [105, 81]]) {
    const side = x < 14 || x > 114;
    bed.push(rect('#a39873', x, y, side ? 4 : 2, side ? 2 : 6));
  }
  for (const [x, y] of [[28, 25], [54, 19], [81, 27], [102, 39], [26, 57], [56, 69], [91, 62]]) {
    bed.push(rect('#85714a', x, y, 4, 2), rect('#9a8152', x + 5, y + 3, 2, 1));
  }
  const plants = alternate ? [[31, 34], [61, 30], [92, 35], [24, 59], [53, 57], [84, 61], [104, 58]] : [[26, 34], [55, 30], [86, 34], [104, 47], [31, 60], [62, 59], [93, 64]];
  for (const [index, [x, y]] of plants.entries()) {
    bed.push(...leafClump(x, y, index % 2 === 0));
    const colors = alternate ? [['#d49b68', '#f1d29a'], ['#c8d8b0', '#f2ebc9'], ['#a86e68', '#d99d8b']] : [['#c67a5b', '#edb384'], ['#d9b665', '#f5df9d'], ['#d0d9b4', '#faf0c8']];
    const [petal, light] = colors[index % colors.length];
    bed.push(...bloom(x - 3, y - 6 - (index % 2) * 4, petal, light));
    if (index % 2 === 0) bed.push(...bloom(x + 6, y - 2, petal, light));
  }
  await save(`sprites/${alternate ? 'garden-bed-alt' : 'garden-bed'}.svg`, 128, 96, bed);
}

const shore = 'M52 10H112V4H168V10H208V22H232V38H246V58H252V96H244V118H224V138H188V148H130V154H90V148H54V138H30V126H16V108H8V84H4V58H14V38H30V22H52Z';
const water = 'M58 22H114V15H164V22H202V33H222V48H234V64H242V92H232V110H214V127H182V137H132V143H94V137H60V127H38V114H27V100H19V82H16V60H25V45H40V33H58Z';
const pond = [
  `<path d="${shore}" fill="#59774f" transform="translate(0 5)"/>`,
  `<path d="${shore}" fill="#9e9c75"/>`,
  '<path d="M52 10H112V4H168V10H208V22H232V29H202V17H164V11H115V18H56V29H34V43H22V59H12V83H8V58H14V38H30V22H52Z" fill="#ded0a1"/>',
  `<path d="${water}" fill="#6fa8a2"/>`,
  `<defs><clipPath id="water"><path d="${water}"/></clipPath></defs><g clip-path="url(#water)">`,
  rect('#639b98', 22, 74, 218, 56), rect('#76afa6', 42, 34, 174, 18),
  rect('#58928e', 42, 114, 174, 20), rect('#89bcb0', 62, 25, 113, 4),
  rect('#87bcb1', 35, 57, 74, 3), rect('#87bcb1', 119, 53, 86, 3),
  rect('#7cb2aa', 78, 82, 133, 3), rect('#76aaa3', 34, 97, 113, 4),
  rect('#94c5b5', 65, 113, 45, 2), rect('#91c1b2', 161, 101, 40, 2),
  rect('#a4cdb9', 50, 48, 24, 2), rect('#abd1bd', 125, 70, 34, 2),
  rect('#a4cdb9', 172, 88, 21, 2), rect('#80b3a7', 104, 130, 39, 3),
  '</g>',
];
for (const [x, y, width] of [[39, 21, 17], [82, 12, 19], [144, 7, 17], [193, 15, 17], [223, 34, 13], [237, 65, 11], [232, 105, 13], [204, 132, 18], [158, 140, 22], [109, 147, 16], [63, 138, 17], [24, 114, 14], [9, 71, 11]]) {
  pond.push(rect('#a29e77', x, y + 4, width, 5), rect('#c6bd91', x, y, width, 5), rect('#e0d2a6', x + 2, y, width - 4, 2));
}
for (const [x, y] of [[36, 45], [218, 116], [66, 132]]) {
  pond.push(rect('#52744a', x - 5, y + 4, 17, 6), rect('#426441', x, y - 14, 2, 22), rect('#739253', x - 4, y - 8, 2, 16), rect('#729151', x + 6, y - 11, 2, 20), rect('#8da25e', x + 2, y - 18, 2, 21), rect('#8c714a', x + 2, y - 22, 3, 7));
}
for (const [x, y] of [[73, 75], [181, 59], [160, 117]]) {
  pond.push(rect('#568c67', x - 8, y + 4, 22, 4), rect('#79a76e', x - 7, y, 19, 6), rect('#8ab276', x - 3, y - 2, 13, 3), rect('#689f99', x + 3, y + 2, 9, 2));
}
pond.push(rect('#e5dcb0', 178, 52, 7, 5), rect('#f8edc8', 176, 54, 11, 2), rect('#d0aa6a', 180, 54, 3, 2));
await save('sprites/garden-pond.svg', 256, 160, pond);
await save('sprites/garden-bench.svg', 64, 32, [
  rect('#58744d', 3, 26, 58, 5), rect('#384c3d', 7, 14, 5, 17), rect('#384c3d', 52, 14, 5, 17),
  rect('#78553b', 4, 2, 56, 13), rect('#b98a55', 6, 3, 52, 4), rect('#d5aa6f', 7, 3, 50, 1),
  rect('#b98a55', 6, 9, 52, 4), rect('#d5aa6f', 7, 9, 50, 1),
  rect('#725139', 2, 16, 60, 8), rect('#bc8f5b', 3, 16, 58, 3), rect('#cda16a', 4, 16, 56, 1),
  rect('#a77a4b', 3, 20, 58, 3), rect('#304a3c', 4, 12, 8, 3), rect('#304a3c', 52, 12, 8, 3),
  rect('#4b6850', 5, 12, 6, 1), rect('#4b6850', 53, 12, 6, 1),
]);
for (let frame = 0; frame < 3; frame++) {
  const left = frame === 1 ? -2 : 0, right = frame === 2 ? 2 : 0;
  await save(`sprites/visitor-${frame}.svg`, 32, 32, [
    rect('#5c7b53', 6, 28, 21, 3), rect('#2c4441', 10 + left, 25, 5, 5), rect('#2c4441', 19 + right, 25, 5, 5),
    rect('#172f30', 10 + left, 29, 6, 2), rect('#172f30', 19 + right, 29, 6, 2),
    rect('#d29b49', 8, 16, 17, 11), rect('#e8ba64', 10, 15, 12, 11), rect('#f4d58b', 11, 16, 6, 8),
    rect('#b57943', 21, 17, 5, 10), rect('#d19b67', 7, 18, 3, 7), rect('#f0bf8b', 9, 7, 15, 11),
    rect('#d9a171', 11, 15, 12, 4), rect('#32443a', 7, 4, 19, 6), rect('#455544', 10, 2, 13, 4),
    rect('#253a34', 8, 8, 3, 6), rect('#253a34', 21, 11, 2, 2), rect('#f7d0a0', 16, 10, 3, 3),
    rect('#526b52', 22, 18, 4, 7), rect('#d8d6a2', 22, 18, 4, 2),
  ]);
}
await save('sprites/guide.svg', 32, 32, [
  rect('#5c7b53', 5, 29, 23, 3), rect('#334e48', 10, 26, 5, 5), rect('#334e48', 21, 26, 5, 5),
  rect('#d9dfc2', 8, 16, 19, 12), rect('#f1edce', 10, 15, 14, 10), rect('#6d9990', 14, 16, 7, 12),
  rect('#4d7c75', 16, 20, 5, 8), rect('#d3aa7d', 7, 19, 3, 7), rect('#ebbd8c', 10, 7, 15, 12),
  rect('#d7a474', 12, 16, 11, 3), rect('#624b39', 9, 4, 17, 6), rect('#7c5d40', 12, 2, 12, 4),
  rect('#465647', 20, 11, 3, 2), rect('#f8d8a3', 16, 10, 2, 3), rect('#afc1a3', 9, 16, 4, 3),
  rect('#c88e5f', 24, 22, 3, 4), rect('#9b7550', 25, 19, 4, 4),
]);

const facade = [
  rect('#6a684a', 8, 106, 144, 6), rect('#9b8b64', 6, 102, 148, 6),
  rect('#c69c65', 14, 32, 132, 68), rect('#e8c68c', 20, 36, 120, 61),
];
for (let y = 46; y < 96; y += 10) facade.push(rect('#d6ae76', 20, y, 120, 1));
facade.push(
  rect('#80583d', 12, 30, 8, 72), rect('#a4774d', 14, 35, 3, 65),
  rect('#80583d', 140, 30, 8, 72), rect('#a4774d', 142, 35, 3, 65),
  rect('#654b38', 12, 35, 136, 5), rect('#b88656', 20, 40, 120, 3),
  rect('#784f38', 54, 51, 52, 51), rect('#b88b58', 57, 54, 46, 48),
  rect('#29483e', 61, 57, 38, 45), rect('#203d35', 64, 60, 32, 42),
  rect('#53705a', 66, 61, 1, 36), rect('#d9be83', 56, 102, 48, 4),
  rect('#76543c', 22, 49, 28, 30), rect('#f2deb0', 24, 51, 24, 25), rect('#d4b780', 26, 73, 20, 1),
  rect('#705139', 110, 50, 24, 27), rect('#8bb3a0', 113, 53, 18, 21),
  rect('#c8d7ac', 115, 55, 3, 12), rect('#624a35', 121, 53, 3, 21), rect('#624a35', 113, 63, 18, 3),
  rect('#a07146', 107, 78, 30, 11), rect('#bb8a56', 109, 78, 26, 5),
  rect('#496f46', 111, 73, 22, 5), rect('#5f8b52', 114, 68, 4, 9), rect('#5f8b52', 126, 69, 4, 7),
  rect('#efc67c', 112, 69, 4, 4), rect('#cf7957', 124, 65, 5, 5), rect('#f0dba0', 129, 71, 4, 4),
  rect('#6d4d37', 3, 29, 154, 7), rect('#a36546', 5, 26, 150, 5),
  rect('#9d5b42', 7, 18, 146, 11), rect('#b96f4d', 13, 10, 134, 12),
  rect('#cb8158', 21, 3, 118, 13), rect('#e1a16c', 22, 3, 116, 3),
);
for (const [y, start, end] of [[9, 25, 137], [17, 15, 145], [25, 7, 153]]) {
  for (let x = start; x < end; x += 16) {
    facade.push(rect('#d89665', x, y, Math.min(12, end - x), 2));
    if (x + 14 <= end) facade.push(rect('#95573f', x + 12, y + 2, 2, 4));
  }
}
await save('sprites/station-facade.svg', 160, 112, facade);

const rate = 22050;
for (const [cue, frequency, duration] of [['tap', 660, 0.12], ['rest', 330, 0.08], ['stamp', 880, 0.24]]) {
  const samples = Math.floor(rate * duration);
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) {
    const time = i / rate;
    const envelope = Math.min(1, time / 0.006) * Math.max(0, 1 - time / duration) ** 2;
    const tone = Math.sin(2 * Math.PI * frequency * time) + 0.18 * Math.sin(4 * Math.PI * frequency * time);
    wav.writeInt16LE(Math.round(8500 * envelope * tone), 44 + i * 2);
  }
  await writeFile(new URL(`audio/${cue}.wav`, root), wav);
  const saved = await readFile(new URL(`audio/${cue}.wav`, root));
  assert.equal(saved.toString('ascii', 0, 4), 'RIFF');
  assert.equal(saved.length, saved.readUInt32LE(40) + 44);
}
const license = `MIT License

Copyright (c) 2026 Cultural Trails contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
await writeFile(new URL('audio/LICENSE.txt', root), `Original Cultural Trails interface tones, generated by scripts/generate-media.mjs. These synthetic cues are not traditional music, instrument recordings, or cultural examples.\n\n${license}`);
await writeFile(new URL('sprites/LICENSE.txt', root), `Original fictional garden pixel artwork, authored in scripts/generate-media.mjs. Applies to generated SVGs in sprites/ and tiles/. No community costume, sacred pattern, or real cultural depiction is represented.\n\n${license}`);
console.log(`Generated 14 SVG textures and 3 original WAV cues in ${fileURLToPath(root)}`);
