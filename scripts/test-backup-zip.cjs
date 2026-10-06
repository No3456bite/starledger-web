const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const Zip = require('../backup-zip.js');

function deflatedZip(name, text) {
  const nameBytes = Buffer.from(name), raw = Buffer.from(text), compressed = zlib.deflateRawSync(raw), crc = Zip.crc32(raw);
  const local = Buffer.alloc(30 + nameBytes.length);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
  local.writeUInt32LE(crc, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(nameBytes.length, 26); nameBytes.copy(local, 30);
  const central = Buffer.alloc(46 + nameBytes.length);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(8, 10);
  central.writeUInt32LE(crc, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(raw.length, 24); central.writeUInt16LE(nameBytes.length, 28); nameBytes.copy(central, 46);
  const end = Buffer.alloc(22), centralOffset = local.length + compressed.length;
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(central.length, 12); end.writeUInt32LE(centralOffset, 16);
  return Buffer.concat([local, compressed, central, end]);
}

(async () => {
  const source = [
    { name: '日常账本_desktop.csv', data: '\uFEFFid,date\r\n"1","2026-10-06"\r\n' },
    { name: 'StarLedgerConfig.json', data: JSON.stringify({ format:'star-ledger-config', version:2 }) },
    { name: 'StarLedgerRelations.json', data: JSON.stringify({ format:'star-ledger-relations', version:1 }) },
  ];
  const archive = Zip.create(source);
  const restored = await Zip.read(archive);
  assert.deepEqual(restored.map(x => x.name), source.map(x => x.name));
  for (let i = 0; i < source.length; i++) {
    assert.deepEqual(restored[i].data, new TextEncoder().encode(source[i].data));
  }

  const corrupt = archive.slice();
  const firstDataOffset = 30 + new TextEncoder().encode(source[0].name).length;
  corrupt[firstDataOffset] ^= 1;
  await assert.rejects(() => Zip.read(corrupt), /校验失败/);

  const deflated = await Zip.read(deflatedZip('压缩测试.json', '{"ok":true}'));
  assert.equal(deflated[0].name, '压缩测试.json');
  assert.equal(new TextDecoder().decode(deflated[0].data), '{"ok":true}');
  console.log('StarLedger ZIP codec stored/deflate round-trip and CRC checks passed.');
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
