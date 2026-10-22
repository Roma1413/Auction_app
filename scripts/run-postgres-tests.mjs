import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Client, localDatabaseEnvironment, verifyDockerDatabase, testDatabaseUrl, prisma, root } from './lib/local-postgres.mjs';

// This is deliberately opt-in; normal unit tests never connect to a real DB.
verifyDockerDatabase();
const local = localDatabaseEnvironment();
const name = 'auction_test_' + randomBytes(12).toString('hex');
const adminUrl = new URL(local.DIRECT_URL);
adminUrl.pathname = '/postgres';
const admin = new Client({ connectionString: adminUrl.href, connectionTimeoutMillis: 5000, query_timeout: 10000 });
try {
  await admin.connect();
  // The identifier is generated locally and strictly checked by testDatabaseUrl.
  testDatabaseUrl(local, name);
  await admin.query(`CREATE DATABASE "${name}" TEMPLATE template0`);
} finally { await admin.end(); }
const url = testDatabaseUrl(local, name);
const databaseEnv = { DATABASE_URL: url, DIRECT_URL: url };
console.log(`Created isolated database ${name}; it will be retained, never dropped automatically.`);
console.log(prisma(['migrate', 'deploy', '--schema', 'server/prisma/schema.prisma'], databaseEnv));
console.log(prisma(['migrate', 'status', '--schema', 'server/prisma/schema.prisma'], databaseEnv));
console.log(prisma(['migrate', 'diff', '--from-schema-datasource', 'server/prisma/schema.prisma', '--to-schema-datamodel', 'server/prisma/schema.prisma', '--exit-code'], databaseEnv));
const stateDir = new URL('../node_modules/.cache/auction/', import.meta.url);
await mkdir(stateDir, { recursive: true });
const stateFile = new URL('postgres-test-last-run.json', stateDir);
const state = { database: name, createdAt: new Date().toISOString(), schemaReproduced: true, status: 'running' };
await writeFile(stateFile, JSON.stringify(state, null, 2));

const child = spawn(process.execPath, ['--test', '--test-reporter=spec', '--import', './server/node_modules/tsx/dist/loader.mjs', 'tests/postgres-workflows.mjs'], {
  cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, ...databaseEnv, NODE_ENV: 'test', NODE_OPTIONS: '--max-old-space-size=256',
    JWT_SECRET: randomBytes(32).toString('hex'), GOOGLE_CLIENT_ID: '',
    TSX_TSCONFIG_PATH: fileURLToPath(new URL('../tsconfig.app.json', import.meta.url)) },
});
let output = '';
child.stdout.on('data', chunk => { output += chunk; process.stdout.write(chunk); });
child.stderr.on('data', chunk => { output += chunk; process.stderr.write(chunk); });
const timer = setTimeout(() => {
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', timeout: 5000 });
    killer.on('error', () => child.kill());
  } else child.kill();
}, 120000);
const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
clearTimeout(timer);
state.status = code === 0 ? 'passed' : 'failed';
for (const field of ['tests', 'pass', 'fail', 'skipped']) {
  const match = output.match(new RegExp(`ℹ ${field} (\\d+)`));
  if (match) state[field] = Number(match[1]);
}
await writeFile(stateFile, JSON.stringify(state, null, 2));
console.log(`Retained isolated database: ${name}. No working database records were changed.`);
process.exitCode = code === 0 ? 0 : 1;
