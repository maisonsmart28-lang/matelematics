/** Isolated local JetStream stream/consumer topology; no publish or DB access. */
import { connect } from '@nats-io/transport-node';
import { AckPolicy, DeliverPolicy, DiscardPolicy, JetStreamApiCodes,
  JetStreamApiError, RetentionPolicy, StorageType, jetstreamManager } from '@nats-io/jetstream';

const stream = 'MATELEMATICS_LOCAL_TELEMETRY';
const quarantine = 'MATELEMATICS_LOCAL_QUARANTINE';
const consumer = 'matelematics_local_persist';
const subject = 'matelematics.local.telemetry.persist';
const quarantineSubject = 'matelematics.local.telemetry.failed';
const common = { storage: StorageType.File, num_replicas: 1,
  discard: DiscardPolicy.New, max_age: 0, max_msg_size: 65536 };
const streamConfig = { name: stream, subjects: [subject],
  retention: RetentionPolicy.Workqueue, max_msgs: 100000,
  max_bytes: 268435456, ...common };
const quarantineConfig = { name: quarantine, subjects: [quarantineSubject],
  retention: RetentionPolicy.Limits, max_msgs: 1000,
  max_bytes: 10485760, ...common };
const consumerConfig = { durable_name: consumer, filter_subject: subject,
  ack_policy: AckPolicy.Explicit, deliver_policy: DeliverPolicy.All,
  ack_wait: 30_000_000_000, max_deliver: 4, max_ack_pending: 100 };

function same(actual, expected, fields, name) {
  for (const field of fields) {
    const a = actual[field], b = expected[field];
    if (JSON.stringify(a) !== JSON.stringify(b))
      throw new Error(`${name} differs at ${field}; inspect existing resource; no deletion or update performed`);
  }
}
async function checkStream(manager, config) {
  let info;
  try { info = await manager.streams.info(config.name); }
  catch (error) {
    if (!(error instanceof JetStreamApiError) || error.code !== JetStreamApiCodes.StreamNotFound)
      throw error;
    info = await manager.streams.add(config);
  }
  same(info.config, config,
    ['name','subjects','retention','storage','num_replicas','discard','max_msgs','max_bytes','max_age','max_msg_size'],
    config.name);
  return info;
}
async function checkConsumer(manager) {
  let info;
  try { info = await manager.consumers.info(stream, consumer); }
  catch (error) {
    if (!(error instanceof JetStreamApiError) || error.code !== JetStreamApiCodes.ConsumerNotFound)
      throw error;
    info = await manager.consumers.add(stream, consumerConfig);
  }
  same(info.config, consumerConfig,
    ['durable_name','filter_subject','ack_policy','deliver_policy','ack_wait','max_deliver','max_ack_pending'],
    consumer);
  if (info.config.deliver_subject) throw new Error('Expected a durable pull consumer');
  return info;
}

async function main() {
  if (process.argv.length !== 2) throw new Error('B1 topology preflight takes no arguments');
  const nc = await connect({ servers: '127.0.0.1:4222', timeout: 5000 });
  try {
    const manager = await jetstreamManager(nc);
    const primary = await checkStream(manager, streamConfig);
    const dead = await checkStream(manager, quarantineConfig);
    const durable = await checkConsumer(manager);
    console.log(JSON.stringify({ event: 'step10e-nats-b1-topology', status: 'ok',
      server: '127.0.0.1:4222', stream, subject, storage: primary.config.storage,
      retention: primary.config.retention, replicas: primary.config.num_replicas,
      pendingMessages: primary.state.messages, durableConsumer: consumer,
      consumerPending: durable.num_pending, ackPending: durable.num_ack_pending,
      explicitAck: durable.config.ack_policy === AckPolicy.Explicit,
      maxDeliver: durable.config.max_deliver, quarantineStream: quarantine,
      quarantineMessages: dead.state.messages,
      note: 'Topology only. Quarantine is not automatic; publish/commit/ACK, failure and replay remain untested.' }));
  } finally { await nc.close(); }
}
main().catch(error => {
  console.error('NATS B1 topology preflight failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
