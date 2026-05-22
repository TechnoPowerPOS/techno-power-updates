
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getMachineId: () => ipcRenderer.invoke('get-machine-id'),
  secureSave: (key: string, data: any) => ipcRenderer.invoke('secure-save', key, data),
  secureLoad: (key: string) => ipcRenderer.invoke('secure-load', key),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  print: (options: any) => ipcRenderer.invoke('print', options),
  on: (channel: string, callback: Function) => {
      ipcRenderer.on(channel, (_, data) => callback(data));
  }
});
