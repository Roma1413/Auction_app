import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertIsolatedDatabase, testDatabaseUrl } from '../scripts/lib/local-postgres.mjs';

const name = 'auction_test_' + 'a'.repeat(24);
test('PostgreSQL test target accepts only the isolated local database namespace', () => {
  const url = testDatabaseUrl({ DIRECT_URL: 'postgresql://127.0.0.1:15432/auction_db' }, name);
  assert.equal(assertIsolatedDatabase(url).pathname, '/' + name);
});
test('PostgreSQL isolation rejects the working database, other services, and remote hosts', () => {
  for (const url of [
    'postgresql://127.0.0.1:15432/auction_db',
    'postgresql://127.0.0.1:15432/postgres',
    `postgresql://127.0.0.1:5432/${name}`,
    `postgresql://example.com:15432/${name}`,
    `http://127.0.0.1:15432/${name}`,
    'postgresql://127.0.0.1:15432/auction_test_existing',
  ]) assert.throws(() => assertIsolatedDatabase(url));
});
test('test database generation rejects unsafe identifiers and nonlocal admin URLs', () => {
  for (const invalid of ['auction_db', 'postgres', 'auction_test_";DROP DATABASE x;--']) {
    assert.throws(() => testDatabaseUrl({ DIRECT_URL: 'postgresql://127.0.0.1:15432/auction_db' }, invalid));
  }
  assert.throws(() => testDatabaseUrl({ DIRECT_URL: 'postgresql://example.com:15432/auction_db' }, name));
});
