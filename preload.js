const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('zebraAPI', {
  sendZPLNetwork: (ip, port, zpl)              => ipcRenderer.invoke('send-zpl-network', { ip, port, zpl }),
  sendZPLUsb:     (port, printerName, zpl)     => ipcRenderer.invoke('send-zpl-usb', { port, printerName, zpl }),
  listComPorts:   ()                           => ipcRenderer.invoke('list-com-ports'),
  saveZPLFile:    (zpl)                        => ipcRenderer.invoke('save-zpl-file', { zpl }),
  testPrint:      (port, printerName)          => ipcRenderer.invoke('test-print', { port, printerName })
})
