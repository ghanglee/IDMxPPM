const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// 개발 모드 확인
const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'IDMxPPM - Neo Seoul',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f172a'
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 메뉴 설정
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu-new')
        },
        { type: 'separator' },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: () => handleOpenProject()
        },
        {
          label: 'Open BPMN File...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => handleOpenBPMN()
        },
        { type: 'separator' },
        {
          label: 'Save Project',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu-save')
        },
        {
          label: 'Save Project As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow.webContents.send('menu-save-as')
        },
        { type: 'separator' },
        {
          label: 'Export BPMN...',
          click: () => mainWindow.webContents.send('menu-export-bpmn')
        },
        {
          label: 'Export idmXML...',
          click: () => mainWindow.webContents.send('menu-export-idmxml')
        },
        { type: 'separator' },
        {
          label: 'Import ER from erXML...',
          click: () => handleImportER()
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => mainWindow.webContents.send('menu-undo')
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: () => mainWindow.webContents.send('menu-redo')
        },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => mainWindow.webContents.send('menu-zoom-in')
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => mainWindow.webContents.send('menu-zoom-out')
        },
        {
          label: 'Fit to Screen',
          accelerator: 'CmdOrCtrl+0',
          click: () => mainWindow.webContents.send('menu-zoom-fit')
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About IDMxPPM - Neo Seoul',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About IDMxPPM - Neo Seoul',
              message: 'IDMxPPM - Neo Seoul v1.0.0',
              detail: 'Information Delivery Manual authoring tool based on the eXtended Process to Product Modeling method.\n\nISO 29481-1 & ISO 29481-3 (idmXML) Compliant\n\nDeveloped by Building Informatics Group (BIG)\nYonsei University, Seoul, Korea\n\nhttps://big.yonsei.ac.kr'
            });
          }
        },
        { type: 'separator' },
        {
          label: 'ISO 29481-1 Reference',
          click: () => {
            require('electron').shell.openExternal('https://www.iso.org/standard/74389.html');
          }
        },
        {
          label: 'bpmn.io Documentation',
          click: () => {
            require('electron').shell.openExternal('https://bpmn.io/toolkit/bpmn-js/walkthrough/');
          }
        }
      ]
    }
  ];

  // Mac용 앱 메뉴 추가
  if (process.platform === 'darwin') {
    menuTemplate.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 프로젝트 열기 (.json, .idm, .xml for idmXML, .bpmn)
async function handleOpenProject() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open IDMxPPM Project or idmXML',
    filters: [
      { name: 'IDMxPPM Project', extensions: ['json', 'idm'] },
      { name: 'idmXML (ISO 29481-3)', extensions: ['xml'] },
      { name: 'BPMN Files', extensions: ['bpmn'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();

    let type = 'project';
    if (ext === '.bpmn') {
      type = 'bpmn';
    } else if (ext === '.xml') {
      // Check if it's an idmXML file or BPMN
      const isIdmXml = content.includes('idmXML') ||
                       content.includes('standards.buildingsmart.org/IDM') ||
                       (content.includes('<idm') && (content.includes('<uc>') || content.includes('<er>')));
      type = isIdmXml ? 'idmxml' : 'bpmn';
    }
    // .json and .idm are treated as 'project' type

    mainWindow.webContents.send('file-opened', { filePath, content, type });
  }
}

// BPMN 파일 열기 (.bpmn)
async function handleOpenBPMN() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open BPMN File',
    filters: [
      { name: 'BPMN Files', extensions: ['bpmn', 'xml'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    mainWindow.webContents.send('file-opened', { filePath, content, type: 'bpmn' });
  }
}

// ER Import (.erxml)
async function handleImportER() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Exchange Requirement',
    filters: [
      { name: 'ER XML Files', extensions: ['erxml', 'xml'] },
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    mainWindow.webContents.send('er-imported', { filePath, content });
  }
}

// IPC 핸들러들
ipcMain.handle('dialog:openProject', handleOpenProject);
ipcMain.handle('dialog:openBPMN', handleOpenBPMN);
ipcMain.handle('dialog:importER', handleImportER);

// 프로젝트 저장
ipcMain.handle('dialog:saveProject', async (event, { content, defaultName }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save IDMxPPM Project',
    defaultPath: defaultName || 'idm-project.json',
    filters: [
      { name: 'IDMxPPM Project', extensions: ['json'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { success: true, filePath: result.filePath };
  }
  return { success: false };
});

// 파일 저장 (기존 경로에)
ipcMain.handle('dialog:saveFile', async (event, { content, filePath }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// BPMN 내보내기
ipcMain.handle('dialog:exportBPMN', async (event, { content, defaultName }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export BPMN',
    defaultPath: defaultName || 'process-map.bpmn',
    filters: [
      { name: 'BPMN Files', extensions: ['bpmn'] },
      { name: 'XML Files', extensions: ['xml'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { success: true, filePath: result.filePath };
  }
  return { success: false };
});

// SVG 내보내기
ipcMain.handle('dialog:exportSVG', async (event, { content, defaultName }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export SVG',
    defaultPath: defaultName || 'process-map.svg',
    filters: [
      { name: 'SVG Files', extensions: ['svg'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { success: true, filePath: result.filePath };
  }
  return { success: false };
});

// ER 내보내기 (erXML/JSON)
ipcMain.handle('dialog:exportER', async (event, { content, defaultName, format }) => {
  const filters = format === 'json'
    ? [{ name: 'JSON Files', extensions: ['json'] }]
    : [{ name: 'ER XML Files', extensions: ['erxml', 'xml'] }];

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Exchange Requirement',
    defaultPath: defaultName || `exchange-requirement.${format === 'json' ? 'json' : 'erxml'}`,
    filters
  });

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { success: true, filePath: result.filePath };
  }
  return { success: false };
});

// idmXML 내보내기 (ISO 29481-3)
ipcMain.handle('dialog:exportIdmXML', async (event, { content, defaultName }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export idmXML (ISO 29481-3)',
    defaultPath: defaultName || 'idm-specification.xml',
    filters: [
      { name: 'idmXML Files', extensions: ['xml'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { success: true, filePath: result.filePath };
  }
  return { success: false };
});

// 앱 이벤트
app.whenReady().then(() => {
  createWindow();

  // Mac: Re-create window when dock icon is clicked and no windows exist
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
