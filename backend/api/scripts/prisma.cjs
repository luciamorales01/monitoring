const { spawnSync } = require('node:child_process');
const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '..', '..', '.env'),
});

const prismaCli = require.resolve('prisma/build/index.js');
const schemaPath = path.resolve(__dirname, '..', 'prisma', 'schema.prisma');
const args = [...process.argv.slice(2), '--schema', schemaPath];

const result = spawnSync(process.execPath, [prismaCli, ...args], {
  env: process.env,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
