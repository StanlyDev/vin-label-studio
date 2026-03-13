const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const net = require('net')
const fs = require('fs')
const os = require('os')
const { exec } = require('child_process')

// --- Manejo de Errores ---
process.on('uncaughtException', (err) => {
  console.error('[FATAL]', err)
  dialog.showErrorBox('Error Fatal', err.stack || err.message)
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1100, height: 820,
    title: 'Label Studio — Zebra ZT231',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })
  win.loadFile('index.html')
}

// --- LÓGICA DE RED (TCP 9100) ---
ipcMain.handle('send-zpl-network', async (event, { ip, port, zpl }) => {
  return new Promise((resolve) => {
    const client = new net.Socket()
    const timeout = 5000

    client.setTimeout(timeout)

    client.connect(port || 9100, ip, () => {
      client.write(zpl, 'utf8', () => {
        client.end()
        resolve({ ok: true })
      })
    })

    client.on('error', (err) => {
      client.destroy()
      resolve({ ok: false, error: `Error de red: ${err.message}` })
    })

    client.on('timeout', () => {
      client.destroy()
      resolve({ ok: false, error: 'La impresora no responde (Timeout)' })
    })
  })
})

// --- LÓGICA USB (HACK LOCALHOST UNC SHARE) ---
// Bypass del GDI enviando el archivo crudo al recurso compartido local
async function printRawUSB(shareName, zpl) {
  return new Promise((resolve) => {
    if (!shareName) return resolve({ ok: false, error: 'Falta nombre de la impresora compartida' })

    const tmpFile = path.join(os.tmpdir(), `print_${Date.now()}.zpl`)
    fs.writeFileSync(tmpFile, zpl, 'utf8')

    // El comando COPY /B a \\localhost obliga a Windows a enviar RAW puro
    const cmd = `COPY /B "${tmpFile}" "\\\\localhost\\${shareName}"`

    exec(cmd, { shell: 'cmd.exe' }, (err, stdout, stderr) => {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
      
      if (err) {
        console.error('[USB-ERR]', err.message)
        resolve({ ok: false, error: err.message })
      } else {
        resolve({ ok: true })
      }
    })
  })
}

// El parámetro 'port' es el que trae el ShareName (ZebraZT) desde el index.html
ipcMain.handle('send-zpl-usb', async (event, { port, zpl }) => {
  return await printRawUSB(port, zpl)
})

// --- DETECCIÓN DE IMPRESORAS (MODO DIAGNÓSTICO) ---
ipcMain.handle('list-com-ports', async () => {
  return new Promise((resolve) => {
    // Solo traemos impresoras Zebra que ESTÉN COMPARTIDAS
    // Traer todas las Zebra, compartidas o no
    // Si está compartida usamos ShareName (para \\localhost\ShareName)
    // Si no está compartida usamos PortName directo (USB006)
    const cmd = `powershell -NoProfile -Command "Get-Printer | Where-Object { $_.Name -match 'Zebra|ZDesigner' } | Select-Object Name, ShareName, PortName, Shared | ConvertTo-Json"`

    exec(cmd, { timeout: 8000 }, (err, stdout) => {
      if (err || !stdout || !stdout.trim()) return resolve([])
      try {
        const raw = JSON.parse(stdout.trim())
        const list = Array.isArray(raw) ? raw : [raw]

        resolve(list.map(p => ({
          id:          p.Shared && p.ShareName ? p.ShareName : p.PortName,
          printerName: p.Name,
          shared:      p.Shared || false,
          shareName:   p.ShareName || null,
          portName:    p.PortName || null
        })))
      } catch (e) {
        resolve([])
      }
    })
  })
})

// --- TEST PRINT ---
ipcMain.handle('test-print', async (event, { port }) => {
  const testZpl = '^XA^MMT^PW406^LL203^FO0,80^FB406,1,0,C,0^A0N,40,40^FDTEST OK^FS^PQ1^XZ'
  // Usamos 'port' que contiene el ShareName en lugar de printerName
  return await printRawUSB(port, testZpl)
})

// --- GUARDAR ZPL ---
ipcMain.handle('save-zpl-file', async (event, { zpl }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Guardar archivo ZPL',
    defaultPath: 'etiquetas.zpl',
    filters: [{ name: 'ZPL', extensions: ['zpl', 'txt'] }]
  })
  if (canceled || !filePath) return { ok: false, error: 'Cancelado' }
  try {
    fs.writeFileSync(filePath, zpl, 'utf8')
    return { ok: true, filePath }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})