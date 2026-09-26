const { spawn } = require('child_process')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const isWin = process.platform === 'win32'
const npmCmd = isWin ? 'npm.cmd' : 'npm'

console.log('\n==================================================')
console.log(' 🚀 Starting TrendVolt Full-Stack Dev Environment')
console.log('==================================================\n')

console.log('📦 [1/2] Launching Backend API Server (Port 5000)...')
const backend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(rootDir, 'backend'),
  stdio: 'inherit',
  shell: true,
})

console.log('⚡ [2/2] Launching Frontend Client (Port 5173)...')
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(rootDir, 'frontend'),
  stdio: 'inherit',
  shell: true,
})

backend.on('error', (err) => {
  console.error('❌ Failed to start backend:', err)
})

frontend.on('error', (err) => {
  console.error('❌ Failed to start frontend:', err)
})

const cleanup = () => {
  console.log('\nShutting down servers...')
  try {
    backend.kill()
    frontend.kill()
  } catch {}
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
