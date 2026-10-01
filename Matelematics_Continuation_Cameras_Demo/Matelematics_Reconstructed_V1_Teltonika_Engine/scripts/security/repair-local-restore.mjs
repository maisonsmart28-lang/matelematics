import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Deliberately limited to Windows Docker Desktop and the dated restore lab.
const target = 'supabase_db_20260929-142153';
const args = process.argv.slice(2);
if (args.length !== 1 || !['--check', '--apply'].includes(args[0])) {
  console.error('Usage: node scripts/security/repair-local-restore.mjs --check|--apply');
  process.exit(1);
}
function docker(argv, input) {
  const result = spawnSync('docker', argv, { encoding: 'utf8', input, timeout: 60000, maxBuffer: 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr.trim() || 'Docker failed');
  return result.stdout;
}
try {
  if (process.platform !== 'win32') throw new Error('Windows Docker Desktop laboratory only.');
  if (process.env.DOCKER_HOST || (process.env.DOCKER_CONTEXT && process.env.DOCKER_CONTEXT !== 'desktop-linux')) throw new Error('Docker endpoint override refused.');
  if (docker(['context', 'show']).trim() !== 'desktop-linux') throw new Error('Expected desktop-linux context.');
  const [context] = JSON.parse(docker(['context', 'inspect', 'desktop-linux']));
  if (!/^npipe:\/\//i.test(context?.Endpoints?.docker?.Host || '')) throw new Error('Expected local Windows named pipe.');
  const [container] = JSON.parse(docker(['inspect', target]));
  if (container.Name !== `/${target}` || !container.State?.Running || !/supabase\/postgres:17\.6\.1\./.test(container.Config?.Image || '')) throw new Error('Unexpected local restore container or image.');
  const sql = readFileSync(new URL('./repair-local-restore.sql', import.meta.url), 'utf8');
  const ending = args[0] === '--apply' ? 'COMMIT;' : 'ROLLBACK;';
  const output = docker(['exec', '-i', '-e', 'PGAPPNAME=matelematics-local-restore-repair', target,
    'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'supabase_admin', '-d', 'postgres'], `${sql}\n${ending}\n`);
  process.stdout.write(output);
  console.log(args[0] === '--apply' ? 'LOCAL RESTORE REPAIR COMMIT: PASS' : 'LOCAL RESTORE REPAIR DRY RUN (ROLLBACK): PASS');
} catch (error) {
  console.error(`LOCAL RESTORE REPAIR FAIL: ${error.message}`);
  process.exitCode = 1;
}
