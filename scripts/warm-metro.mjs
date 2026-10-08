#!/usr/bin/env node
// Pre-compiles the Metro dev-server bundles (android/ios/web) so the first
// phone or PC load is fast instead of compiling on demand.
//
// Usage:
//   node scripts/warm-metro.mjs [--port 8082] [--host localhost]
//
// It polls /status until Metro is up, then downloads each entry bundle
// (forcing a full compile into Metro's cache) and reports timings.

const args = process.argv.slice(2);
function opt(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
}

const HOST = opt('--host', process.env.METRO_HOST || 'localhost');
const PORT = opt('--port', process.env.METRO_PORT || '8082');
const BASE = `http://${HOST}:${PORT}`;
const ENTRY = 'node_modules/expo-router/entry.bundle';
const ROUTER_ROOT = encodeURIComponent('src/app'); // single-% encoded: src%2Fapp

const NATIVE_QS =
  `dev=true&hot=false&lazy=true&transform.engine=hermes&transform.bytecode=1` +
  `&transform.routerRoot=${ROUTER_ROOT}&transform.reactCompiler=true` +
  `&unstable_transformProfile=hermes-stable`;

const JOBS = [
  ['android', `${ENTRY}?platform=android&${NATIVE_QS}`],
  ['ios', `${ENTRY}?platform=ios&${NATIVE_QS}`],
  [
    'web',
    `${ENTRY}?platform=web&dev=true&hot=false&lazy=true` +
      `&transform.routerRoot=${ROUTER_ROOT}&transform.reactCompiler=true`,
  ],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(rounds = 90) {
  for (let i = 0; i < rounds; i++) {
    try {
      const res = await fetch(`${BASE}/status`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(2000);
  }
  throw new Error(`Metro is not responding at ${BASE}/status`);
}

async function warm([platform, path]) {
  const url = `${BASE}/${path}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5 * 60 * 1000);
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const buf = Buffer.from(await res.arrayBuffer());
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    if (!res.ok) {
      const preview = buf.subarray(0, 300).toString('utf8');
      throw new Error(`HTTP ${res.status}: ${preview}`);
    }
    console.log(
      `ok  ${platform.padEnd(7)} ${(buf.length / 1048576).toFixed(1)} MB in ${secs}s`
    );
  } finally {
    clearTimeout(timer);
  }
}

try {
  await waitForServer();
  console.log(`Metro is up at ${BASE} — warming bundles…`);
  for (const job of JOBS) {
    await warm(job);
  }
  console.log('Warm. First phone/PC load will be fast.');
} catch (err) {
  console.error(`warm-metro failed: ${err.message}`);
  process.exit(1);
}
