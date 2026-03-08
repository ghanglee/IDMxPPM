const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// 개발 모드 확인 (Node.js version compatibility)
const isDev = app && app.isPackaged !== undefined ? !app.isPackaged : process.env.NODE_ENV !== 'production';

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
        {
          label: 'Connect to Server...',
          click: () => mainWindow.webContents.send('menu-server-connect')
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
            dialog.showMessageBox({
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

// 프로젝트 열기 (.json, .idm, .xml for idmXML, .bpmn, .zip, .xppm)
async function handleOpenProject() {
  const result = await dialog.showOpenDialog({
    title: 'Open IDMxPPM Project',
    filters: [
      { name: 'IDMxPPM Project (.idm)', extensions: ['idm', 'json'] },
      { name: 'idmXML (.xml)', extensions: ['xml'] },
      { name: 'ZIP Bundle (.zip)', extensions: ['zip', 'idmx'] },
      { name: 'xPPM Legacy (.xppm)', extensions: ['xppm'] },
      { name: 'BPMN Diagram (.bpmn)', extensions: ['bpmn'] },
      { name: 'Reviewed HTML (.html)', extensions: ['html', 'htm'] },
      { name: 'All Supported Formats', extensions: ['idm', 'json', 'xml', 'zip', 'idmx', 'xppm', 'bpmn', 'html', 'htm'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    let content = fs.readFileSync(filePath, 'utf-8');
    // Strip UTF-8 BOM if present (causes XML parsing issues)
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    const ext = path.extname(filePath).toLowerCase();

    let type = 'project';
    if (ext === '.bpmn') {
      type = 'bpmn';
    } else if (ext === '.zip' || ext === '.idmx') {
      type = 'zip';
    } else if (ext === '.xppm') {
      type = 'xppm';
    } else if (ext === '.xml') {
      // Check if it's a proper idmXML (with namespace), legacy xPPM v0.2 (no namespace), or BPMN
      const hasIdmXmlNamespace = content.includes('idmXML') || content.includes('standards.buildingsmart.org/IDM');
      const hasIdmStructure = content.includes('<idm') && (content.includes('<uc>') || content.includes('<er>'));
      if (hasIdmXmlNamespace) {
        type = 'idmxml';
      } else if (hasIdmStructure) {
        // v0.2 xPPM format: has IDM structure but no idmXML namespace
        type = 'xppm';
      } else {
        type = 'bpmn';
      }
    }
    // .json and .idm are treated as 'project' type

    // For xPPM and idmXML files, load external BPMN diagram and images from adjacent folders
    // xPPM convention: Diagram/ and Image/ folders sit alongside the .xppm file
    let bpmnContent = null;
    let imageMap = {};
    if (type === 'xppm' || type === 'idmxml') {
      const baseDir = path.dirname(filePath);
      const mimeMap = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.bmp': 'image/bmp', '.webp': 'image/webp' };
      const imageExts = new Set(Object.keys(mimeMap));

      // 1. Load BPMN: first try path from XML, then scan Diagram/ folder
      const bpmnMatch = content.match(/(?:filePath|diagramFilePath)="([^"]*\.bpmn)"/i);
      if (bpmnMatch) {
        const bpmnRelPath = bpmnMatch[1].replace(/\\/g, '/');
        const bpmnFullPath = path.resolve(baseDir, bpmnRelPath);
        if (fs.existsSync(bpmnFullPath)) {
          try {
            bpmnContent = fs.readFileSync(bpmnFullPath, 'utf-8');
            if (bpmnContent.charCodeAt(0) === 0xFEFF) bpmnContent = bpmnContent.slice(1);
            console.log('[file-import] BPMN loaded from XML path:', bpmnRelPath);
          } catch (err) {
            console.error('[file-import] Failed to read BPMN:', err.message);
          }
        }
      }
      // Fallback: scan Diagram/ folder for first .bpmn file
      if (!bpmnContent) {
        const diagramDir = path.join(baseDir, 'Diagram');
        if (fs.existsSync(diagramDir)) {
          try {
            const diagramFiles = fs.readdirSync(diagramDir);
            const bpmnFile = diagramFiles.find(f => f.toLowerCase().endsWith('.bpmn'));
            if (bpmnFile) {
              const bpmnFullPath = path.join(diagramDir, bpmnFile);
              bpmnContent = fs.readFileSync(bpmnFullPath, 'utf-8');
              if (bpmnContent.charCodeAt(0) === 0xFEFF) bpmnContent = bpmnContent.slice(1);
              console.log('[file-import] BPMN loaded from Diagram/ folder:', bpmnFile);
            }
          } catch (err) {
            console.error('[file-import] Failed to scan Diagram/ folder:', err.message);
          }
        }
      }

      // 2. Load images: scan Image/ folder and load ALL image files
      const imageDir = path.join(baseDir, 'Image');
      if (fs.existsSync(imageDir)) {
        try {
          const imageFiles = fs.readdirSync(imageDir);
          for (const imgFile of imageFiles) {
            const imgExt = path.extname(imgFile).toLowerCase();
            if (!imageExts.has(imgExt)) continue;
            const imgFullPath = path.join(imageDir, imgFile);
            try {
              const buffer = fs.readFileSync(imgFullPath);
              const base64 = buffer.toString('base64');
              const mimeType = mimeMap[imgExt] || 'image/png';
              const dataUri = `data:${mimeType};base64,${base64}`;
              // Store under multiple keys so renderer lookup always matches
              imageMap[`Image/${imgFile}`] = dataUri;           // forward-slash relative path
              imageMap[`Image\\${imgFile}`] = dataUri;          // backslash (raw from XML)
              imageMap[imgFile] = dataUri;                       // basename only
            } catch (err) {
              console.error('[file-import] Failed to read image:', imgFile, err.message);
            }
          }
          console.log(`[file-import] Loaded ${Object.keys(imageMap).length / 3} images from Image/ folder`);
        } catch (err) {
          console.error('[file-import] Failed to scan Image/ folder:', err.message);
        }
      }

      // 3. Also extract any image paths from XML that may point outside Image/ folder
      const imageMatches = content.matchAll(/filePath="([^"]*\.(png|jpg|jpeg|gif|svg|bmp|webp))"/gi);
      for (const match of imageMatches) {
        const imgRelPath = match[1].replace(/\\/g, '/');
        if (imageMap[imgRelPath]) continue; // Already loaded from folder scan
        const imgFullPath = path.resolve(baseDir, imgRelPath);
        if (fs.existsSync(imgFullPath)) {
          try {
            const buffer = fs.readFileSync(imgFullPath);
            const base64 = buffer.toString('base64');
            const imgExt = path.extname(imgFullPath).toLowerCase();
            const mimeType = mimeMap[imgExt] || 'image/png';
            imageMap[imgRelPath] = `data:${mimeType};base64,${base64}`;
            // Also store by basename
            const imgBasename = path.basename(imgFullPath);
            if (!imageMap[imgBasename]) imageMap[imgBasename] = imageMap[imgRelPath];
            console.log('[file-import] Image loaded from XML path:', imgRelPath);
          } catch (err) {
            console.error('[file-import] Failed to read image:', imgRelPath, err.message);
          }
        }
      }
    }

    console.log(`[file-import] Sending to renderer: type=${type}, bpmnContent=${!!bpmnContent}, imageMap entries=${Object.keys(imageMap).length}`);
    mainWindow.webContents.send('file-opened', { filePath, content, type, bpmnContent, imageMap });
  }
}

// BPMN 파일 열기 (.bpmn)
async function handleOpenBPMN() {
  const result = await dialog.showOpenDialog({
    title: 'Open BPMN File',
    filters: [
      { name: 'BPMN Files', extensions: ['bpmn', 'xml'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    let content = fs.readFileSync(filePath, 'utf-8');
    // Strip UTF-8 BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    mainWindow.webContents.send('file-opened', { filePath, content, type: 'bpmn' });
  }
}

// ER Import (.erxml)
async function handleImportER() {
  const result = await dialog.showOpenDialog({
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
    let content = fs.readFileSync(filePath, 'utf-8');
    // Strip UTF-8 BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    mainWindow.webContents.send('er-imported', { filePath, content });
  }
}

// Read a file relative to a base directory (for idmXML import with external BPMN/images)
ipcMain.handle('fs:readRelativeFile', async (event, { basePath, relativePath, encoding }) => {
  console.log('[IPC fs:readRelativeFile] basePath:', basePath, '| relativePath:', relativePath);
  try {
    const baseDir = path.dirname(basePath);
    // Normalize the relative path: convert backslashes to OS-appropriate separator
    const normalizedRelPath = relativePath.replace(/\\/g, '/');
    const fullPath = path.resolve(baseDir, normalizedRelPath);
    console.log('[IPC fs:readRelativeFile] resolved fullPath:', fullPath, '| exists:', fs.existsSync(fullPath));
    // Security: ensure the resolved path is within the base directory (case-insensitive on Windows)
    const normalizedFull = path.normalize(fullPath);
    const normalizedBase = path.normalize(baseDir);
    if (process.platform === 'win32') {
      if (!normalizedFull.toLowerCase().startsWith(normalizedBase.toLowerCase())) {
        return { success: false, error: 'Path traversal not allowed' };
      }
    } else {
      if (!normalizedFull.startsWith(normalizedBase)) {
        return { success: false, error: 'Path traversal not allowed' };
      }
    }
    if (!fs.existsSync(fullPath)) {
      return { success: false, error: 'File not found' };
    }
    let content = fs.readFileSync(fullPath, encoding || 'utf-8');
    // Strip UTF-8 BOM if present (causes XML parsing issues in bpmn-js)
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    return { success: true, content, filePath: fullPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Read a file as base64 relative to a base directory (for images)
ipcMain.handle('fs:readRelativeFileBase64', async (event, { basePath, relativePath }) => {
  console.log('[IPC fs:readRelativeFileBase64] basePath:', basePath, '| relativePath:', relativePath);
  try {
    const baseDir = path.dirname(basePath);
    // Normalize the relative path: convert backslashes to OS-appropriate separator
    const normalizedRelPath = relativePath.replace(/\\/g, '/');
    const fullPath = path.resolve(baseDir, normalizedRelPath);
    // Security: case-insensitive path comparison on Windows
    const normalizedFull = path.normalize(fullPath);
    const normalizedBase = path.normalize(baseDir);
    if (process.platform === 'win32') {
      if (!normalizedFull.toLowerCase().startsWith(normalizedBase.toLowerCase())) {
        return { success: false, error: 'Path traversal not allowed' };
      }
    } else {
      if (!normalizedFull.startsWith(normalizedBase)) {
        return { success: false, error: 'Path traversal not allowed' };
      }
    }
    if (!fs.existsSync(fullPath)) {
      return { success: false, error: 'File not found' };
    }
    const buffer = fs.readFileSync(fullPath);
    const base64 = buffer.toString('base64');
    const ext = path.extname(fullPath).toLowerCase();
    const mimeMap = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.bmp': 'image/bmp', '.webp': 'image/webp' };
    const mimeType = mimeMap[ext] || 'image/png';
    return { success: true, data: `data:${mimeType};base64,${base64}`, filePath: fullPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC 핸들러들
ipcMain.handle('dialog:openProject', handleOpenProject);
ipcMain.handle('dialog:openBPMN', handleOpenBPMN);
ipcMain.handle('dialog:importER', handleImportER);

// 프로젝트 저장
ipcMain.handle('dialog:saveProject', async (event, { content, defaultName }) => {
  const result = await dialog.showSaveDialog({
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
  const result = await dialog.showSaveDialog({
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
  const result = await dialog.showSaveDialog({
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

  const result = await dialog.showSaveDialog({
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
  const result = await dialog.showSaveDialog({
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

// Show save location dialog (returns path only)
ipcMain.handle('dialog:showSaveLocation', async (event, { defaultName, format }) => {
  const filters = {
    'idm': [{ name: 'IDM Project', extensions: ['idm'] }],
    'idmxml': [{ name: 'idmXML Files', extensions: ['xml'] }],
    'idmxml-v2': [{ name: 'idmXML 2.0 Files', extensions: ['xml'] }],
    'idmxml-v1': [{ name: 'idmXML 1.0 Files', extensions: ['xml'] }],
    'html': [{ name: 'HTML Files', extensions: ['html'] }],
    'zip': [{ name: 'ZIP Archives', extensions: ['zip'] }],
    'bpmn': [{ name: 'BPMN Files', extensions: ['bpmn'] }]
  };

  const result = await dialog.showSaveDialog({
    title: 'Choose Save Location',
    defaultPath: defaultName || 'idm-specification',
    filters: filters[format] || [{ name: 'All Files', extensions: ['*'] }]
  });

  if (!result.canceled && result.filePath) {
    return { success: true, filePath: result.filePath };
  }
  return { success: false, canceled: true };
});

// Save content to specified path
ipcMain.handle('dialog:saveToPath', async (event, { content, filePath, isBinary }) => {
  try {
    if (isBinary) {
      // For binary content (e.g., ZIP), expect base64 encoded string
      const buffer = Buffer.from(content, 'base64');
      fs.writeFileSync(filePath, buffer);
    } else {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
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
