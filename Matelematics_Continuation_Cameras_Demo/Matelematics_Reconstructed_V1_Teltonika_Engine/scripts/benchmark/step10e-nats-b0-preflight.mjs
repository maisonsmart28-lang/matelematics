/** Read-only local NATS JetStream server preflight; no stream or consumer is created. */
async function localSnapshot(path) {
  const response = await fetch(`http://127.0.0.1:18222${path}`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`NATS monitoring ${path} returned HTTP ${response.status}`);
  return await response.json();
}

async function main() {
  if (process.argv.length !== 2) throw new Error('B0 preflight takes no arguments');
  const [server, jetstream] = await Promise.all([localSnapshot('/varz'), localSnapshot('/jsz?config=true')]);
  if (server.version !== '2.14.7')
    throw new Error('Unexpected NATS version; inspect the existing local container before proceeding');
  if (!jetstream.config || typeof jetstream.config !== 'object' ||
      typeof jetstream.memory !== 'number' || typeof jetstream.storage !== 'number' ||
      jetstream.disabled === true)
    throw new Error('JetStream monitoring is unavailable or not enabled');
  const config = jetstream.config;
  if (typeof config.store_dir !== 'string' || !config.store_dir.startsWith('/data'))
    throw new Error('JetStream storage is not configured on the dedicated /data volume');
  console.log(JSON.stringify({ event: 'step10e-nats-b0-preflight', status: 'ok',
    serverVersion: server.version, jetstreamEnabled: true, storage: 'file (compose -sd /data)',
    configuredStoreDir: config.store_dir,
    currentMemoryBytes: jetstream.memory, currentStorageBytes: jetstream.storage,
    monitoringPort: '127.0.0.1:18222', clientPort: '127.0.0.1:4222',
    note: 'Read-only server preflight. Durable stream, consumer, publish/ACK and replay remain unvalidated.' }));
}
main().catch(error => {
  console.error('NATS B0 preflight failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
