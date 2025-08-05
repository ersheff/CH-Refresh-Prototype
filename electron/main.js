const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron/main');
const fs = require('fs');
const path = require('node:path');
const osc = require('osc');

const configPath = path.join(app.getPath('userData'), 'config.txt');
const launchConfig = loadConfig();
let sendPort = parseInt(launchConfig.send) || 9990;
let receivePort = parseInt(launchConfig.receive) || 9991;

let udpPort = new osc.UDPPort({
  localAddress: '127.0.0.1',
  localPort: sendPort
});

const menuTemplate = [
  {
    label: 'Config',
    submenu: [
      {
        label: 'Open Config',
        click: openConfigFile
      },
      {
        label: 'Reload',
        click: () => {
          const config = loadConfig();
          sendPort = parseInt(config.send) || 9990;
          receivePort = parseInt(config.receive) || 9991;
          if (udpPort.localPort !== sendPort) {
            udpPort.close();
            udpPort = new osc.UDPPort({
              localAddress: '127.0.0.1',
              localPort: sendPort
            });
            udpPort.open();
          }
          const address = config.address;
          const { address: _, ...configParams } = config;
          const queryParams = new URLSearchParams(configParams);
          const url = `${address}?${queryParams.toString()}`;
          BrowserWindow.getFocusedWindow().loadURL(url);
        }
      }
    ]
  }
];

//

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const configText = fs.readFileSync(configPath, 'utf8');
      return parseConfig(configText);
    }
  } catch (err) {
    console.log(err);
  }
  const defaultConfig = `# CH Bridge Configuration - changes take effect on reload

# OSC ports
send=9990
receive=9991

# Server and UI
address=https://ch-refresh-prototype.onrender.com
username=
rooms=
buttons=0
sliders=0
toggles=0`;
  try {
    fs.writeFileSync(configPath, defaultConfig);
    return parseConfig(defaultConfig);
  } catch (err) {
    console.log(err);
  }
}

function parseConfig(configText) {
  const parsedConfig = {};
  const lines = configText.split('\n');

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const [key, value] = line.split('=');
    if (key && value !== undefined) parsedConfig[key.trim()] = value.trim();
  }
  return parsedConfig;
}

function openConfigFile() {
  shell.openPath(configPath);
}

const menu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(menu);

//

function createWindow() {
  const address = launchConfig.address;
  const { address: _, ...configParams } = launchConfig;
  const queryParams = new URLSearchParams(configParams);
  const url = `${address}?${queryParams.toString()}`;

  const mainWindow = new BrowserWindow({
    width: 660,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadURL(url);
  // mainWindow.webContents.openDevTools();
  return mainWindow;
}

//

app.whenReady().then(() => {
  const mainWindow = createWindow();

  udpPort.on('message', (msg) => {
    mainWindow.webContents.send('osc-to-renderer', msg);
  });

  udpPort.open();

  ipcMain.on('renderer-to-osc', (event, msg) => {
    udpPort.send(msg, '127.0.0.1', receivePort);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  }); // opens a new window on macOS when dock icon is clicked
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
}); // quits when all windows are closed on macOS
