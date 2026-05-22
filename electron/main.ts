import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import fs from 'fs/promises'
import { Buffer } from 'buffer'
import pkg from 'electron-updater'
const { autoUpdater } = pkg

process.env.DIST_ELECTRON = path.join(__dirname, '..')
process.env.DIST = path.join(process.env.DIST_ELECTRON, '../dist')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

let win: BrowserWindow | null = null

// قراءة ملف الـ preload بأمان في الـ Dev والـ Production
const preload = process.env.VITE_DEV_SERVER_URL 
  ? path.join(__dirname, '../dist-electron/preload.js')
  : path.join(__dirname, 'preload.js')

// --- HIGH SECURITY: CRYPTO SALTS ---
const _S1 = 'T3chn0';
const _S2 = 'P0w3r';
const _S3 = 'POS_2025';

function getSystemId() {
    try {
        const networkInterfaces = os.networkInterfaces();
        const macs = Object.values(networkInterfaces)
            .flat()
            .filter((iface: any) => iface && !iface.internal && iface.mac !== '00:00:00:00:00:00')
            .map((iface: any) => iface.mac)
            .sort()
            .join(':');

        const cpus = os.cpus().map(cpu => cpu.model).join('|');
        const mem = os.totalmem().toString();
        
        const raw = `${_S1}${macs}${_S2}${cpus}${mem}${_S3}`;
        const hashHex = crypto.createHash('sha256').update(raw).digest('hex');
        
        const numericString = BigInt('0x' + hashHex.substring(0, 15)).toString();
        
        return numericString.substring(0, 12);
    } catch (e) {
        return Math.floor(Math.random() * 900000000000 + 100000000000).toString();
    }
}

function getHardwareLockedKey() {
    const machineId = getSystemId();
    return crypto.scryptSync(machineId, _S1 + _S3, 32, { N: 16384 });
}

function encrypt(text: string): string {
    try {
        const iv = crypto.randomBytes(16);
        const key = getHardwareLockedKey(); 
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (e) { return ""; }
}

function decrypt(text: string): string {
    try {
        const [ivHex, authTagHex, encryptedHex] = text.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const key = getHardwareLockedKey();
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) { return ''; }
}

function createWindow() {
  win = new BrowserWindow({
    title: 'Techno Power POS',
    width: 1280,
    height: 800,
    show: false, 
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: process.env.NODE_ENV === 'development',
    },
  })

  win.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!navigationUrl.startsWith('http://localhost:3000')) {
      event.preventDefault();
    }
  });

  if (process.env.NODE_ENV !== 'development') {
      win.setMenuBarVisibility(false);
      win.removeMenu();
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    // لوجيك إعادة المحاولة الذكي لانتظار السيرفر المدمج بورت 3000
    const loadSystemURL = () => {
      win?.loadURL('http://localhost:3000').catch(() => {
        setTimeout(loadSystemURL, 1000);
      });
    };
    loadSystemURL();
  }

  win.show();
  win.focus();
}

app.whenReady().then(() => {
    // 💡 تشغيل سيرفر الـ Express المدمج تلقائياً وبمسار ديناميكي معتمد على جذر التطبيق الفعلي
    if (!process.env.VITE_DEV_SERVER_URL) {
        try {
            const serverPath = path.join(app.getAppPath(), 'dist/server.cjs');
            // حيلة قياسية آمنة للـ esbuild لمنع تداخل الحزم وتمرير الطلب للنود الصافي
            const globalRequire = eval('require');
            globalRequire(serverPath);
        } catch (err) {
            console.error("Server startup error:", err);
        }
    }

    ipcMain.handle('get-machine-id', () => getSystemId());

    ipcMain.handle('get-printers', async () => {
        if (!win) return [];
        return await win.webContents.getPrintersAsync();
    });

    ipcMain.handle('print', async (_, options) => {
        if (!win) return { success: false, error: 'No window' };
        
        return new Promise((resolve) => {
            win?.webContents.print(options || { silent: true }, (success, failureReason) => {
                resolve({ success, error: failureReason });
            });
        });
    });

    ipcMain.handle('secure-save', async (_, key, data) => {
        try {
            const userDataPath = app.getPath('userData');
            const filePath = path.join(userDataPath, `${crypto.createHash('md5').update(key).digest('hex')}.bin`);
            const encrypted = encrypt(JSON.stringify(data));
            if (!encrypted) return false;
            await fs.writeFile(filePath, encrypted);
            return true;
        } catch (e) { return false; }
    });

    ipcMain.handle('secure-load', async (_, key) => {
        try {
            const userDataPath = app.getPath('userData');
            const filePath = path.join(userDataPath, `${crypto.createHash('md5').update(key).digest('hex')}.bin`);
            const encrypted = await fs.readFile(filePath, 'utf8');
            const decrypted = decrypt(encrypted);
            return decrypted ? JSON.parse(decrypted) : null;
        } catch (e) { return null; }
    });

    createWindow();

    autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
  if (os.platform() !== 'darwin') app.quit();
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'تحديث جديد جاهز',
    message: 'تم تحميل التحديث الجديد بنجاح. سيتم إعادة تشغيل النظام الآن لتثبيته.',
    buttons: ['تحديث الآن', 'لاحقاً']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});