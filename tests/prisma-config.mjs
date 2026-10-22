import assert from 'node:assert/strict';
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const require = createRequire(new URL('../server/package.json', import.meta.url));
const { loadConfigFromFile } = require('@prisma/config');

test('Prisma 6 config loading remains compatible with patched deepmerge-ts override', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'auction-prisma-config-'));
  const configFile = join(directory, 'prisma.config.ts');
  t.after(async () => { await unlink(configFile); await rmdir(directory); });
  await writeFile(configFile, 'export default { schema: "schema.prisma" };\n');
  const result = await loadConfigFromFile({ configRoot: directory });
  assert.equal(result.error, undefined);
  assert.equal(result.config.schema, join(directory, 'schema.prisma'));
  const configRequire = createRequire(require.resolve('@prisma/config'));
  const { deepmerge } = configRequire('deepmerge-ts');
  assert.deepEqual(deepmerge({ nested: { left: 1 } }, { nested: { right: 2 } }), { nested: { left: 1, right: 2 } });
  const left = {}; left.self = left;
  const right = {}; right.self = right;
  // The patched library preserves cycles rather than exhausting the stack.
  const merged = deepmerge(left, right);
  assert.equal(merged.self, merged);
});
