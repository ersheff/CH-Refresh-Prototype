const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
  onOscMessage: (callback) => {
    ipcRenderer.on('osc-to-renderer', (event, msg) => {
      callback(msg);
    });
  },
  onSocketMessage: (msg) => {
    ipcRenderer.send('renderer-to-osc', msg);
  }
});
