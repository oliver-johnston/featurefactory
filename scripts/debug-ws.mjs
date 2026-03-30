const taskId = process.argv[2]

if (!taskId) {
  console.error('Usage: node scripts/debug-ws.mjs <TASK-ID>')
  process.exit(1)
}

const ws = new WebSocket('ws://127.0.0.1:3001/ws')

ws.addEventListener('open', () => {
  console.log('WS open')
})

ws.addEventListener('message', (event) => {
  const msg = JSON.parse(String(event.data))
  if (msg.type === 'task:list') {
    console.log('task:list received')
    ws.send(JSON.stringify({ type: 'chat:subscribe', taskId }))
    return
  }

  if (msg.taskId === taskId) {
    console.log(JSON.stringify(msg, null, 2))
  }
})

ws.addEventListener('error', (event) => {
  console.error('WS error', event)
})

setTimeout(() => {
  ws.close()
}, 5000)

ws.addEventListener('close', () => {
  console.log('WS closed')
  process.exit(0)
})
