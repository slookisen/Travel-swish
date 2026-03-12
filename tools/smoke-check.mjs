import { execSync } from 'node:child_process';

// Very lightweight smoke: build must succeed.
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('\nSMOKE OK: build succeeded');
} catch (e) {
  console.error('\nSMOKE FAIL: build failed');
  process.exit(1);
}
