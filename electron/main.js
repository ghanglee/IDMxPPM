const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
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
    title: 'xPPM neo-Seoul',
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
          label: 'Export Project As...',
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
          enabled: false,
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
          label: 'About xPPM neo-Seoul',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About xPPM neo-Seoul',
              message: `xPPM neo-Seoul v${app.getVersion()}`,
              detail: 'Information Delivery Manual authoring tool based on the eXtended Process to Product Modeling method.\n\nISO 29481-1 & ISO 29481-3 (idmXML) Compliant\n\nDeveloped by Building Informatics Group (BIG)\nYonsei University, Seoul, Korea\n\nhttps://big.yonsei.ac.kr'
            });
          }
        },
        {
          label: 'Check for Updates...',
          click: async () => {
            const result = await fetchLatestRelease();
            if (result.error) {
              dialog.showMessageBox({
                type: 'warning',
                title: 'Update Check Failed',
                message: 'Could not check for updates.',
                detail: result.error
              });
            } else if (result.hasUpdate) {
              const isSameVersion = result.latestVersion === result.currentVersion;
              const publishedStr = result.publishedAt
                ? `\nReleased: ${new Date(result.publishedAt).toLocaleString()}`
                : '';
              const detail = isSameVersion
                ? `Version ${result.currentVersion} has been updated since your build.${publishedStr}\nWould you like to download the latest release?`
                : `You are running version ${result.currentVersion}.${publishedStr}\nWould you like to download the latest release?`;
              const { response } = await dialog.showMessageBox({
                type: 'info',
                title: 'Update Available',
                message: isSameVersion
                  ? `A newer build of v${result.latestVersion} is available`
                  : `Version ${result.latestVersion} is available`,
                detail,
                buttons: ['Download', 'Later'],
                defaultId: 0,
                cancelId: 1
              });
              if (response === 0) shell.openExternal(result.downloadUrl);
            } else {
              dialog.showMessageBox({
                type: 'info',
                title: 'No Updates Available',
                message: `xPPM neo-Seoul is up to date.`,
                detail: `Version ${result.currentVersion} is the latest release.`
              });
            }
          }
        },
        { type: 'separator' },
        {
          label: 'ISO 29481-1 Reference',
          click: () => {
            require('electron').shell.openExternal('https://www.iso.org/standard/88515.html');
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

  // After the page loads, offer to remove the installer file (once per version)
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => checkInstallerCleanup(), 3000);
  });
}

async function checkInstallerCleanup() {
  if (isDev) return;

  // Linux: AppImage IS the executable — no separate installer exists
  if (process.platform === 'linux') return;

  const exePath = path.resolve(app.getPath('exe'));
  const appName = app.getName(); // 'xPPM neo-Seoul'

  // Allowlist approach: only offer cleanup when the app is confirmed to be
  // running from its standard installation location. This covers every
  // unsafe case (running from mounted DMG, from Downloads, translocated
  // by Gatekeeper, portable exe, etc.) without needing a blocklist.
  if (process.platform === 'darwin') {
    // Standard macOS install: /Applications/<AppName>.app/…
    const installedPrefix = `/Applications/${appName}.app/`;
    if (!exePath.startsWith(installedPrefix)) return;
  } else if (process.platform === 'win32') {
    // Standard Windows NSIS install locations
    const standardRoots = [
      process.env['ProgramFiles'],
      process.env['ProgramFiles(x86)'],
      path.join(app.getPath('appData'), '..', 'Local', 'Programs')
    ].filter(Boolean).map(d => path.resolve(d).toLowerCase() + path.sep);
    if (!standardRoots.some(root => exePath.toLowerCase().startsWith(root))) return;
  }

  const flagPath = path.join(app.getPath('userData'), 'installer-cleanup.json');
  let keepList = [];
  try {
    const saved = JSON.parse(fs.readFileSync(flagPath, 'utf-8'));
    keepList = (saved.keepList || []).filter(p => fs.existsSync(p));
  } catch { /* no saved state yet */ }

  const namePattern = /xppm|neo.?seoul/i;
  const ext = process.platform === 'win32' ? '.exe' : '.dmg';
  const searchDirs = [app.getPath('downloads'), app.getPath('desktop')];

  // macOS: also try the download folder configured in Safari or Chrome
  if (process.platform === 'darwin') {
    try {
      const { spawnSync } = require('child_process');
      const r = spawnSync('defaults', ['read', 'com.apple.safari', 'DownloadsPath'], { encoding: 'utf8', timeout: 1000 });
      if (r.status === 0 && r.stdout) {
        const safariDir = r.stdout.trim().replace(/^~/, app.getPath('home'));
        if (safariDir && !searchDirs.includes(safariDir)) searchDirs.push(safariDir);
      }
    } catch {}
    try {
      const chromePrefsPath = path.join(app.getPath('appData'), 'Google/Chrome/Default/Preferences');
      const prefs = JSON.parse(fs.readFileSync(chromePrefsPath, 'utf-8'));
      const chromeDir = prefs?.download?.default_directory;
      if (chromeDir && !searchDirs.includes(chromeDir)) searchDirs.push(chromeDir);
    } catch {}
  }

  // Safety filter: never offer to remove anything in /Applications, the running app,
  // or any parent directory of the running executable — defence-in-depth on top of the
  // allowlist guard above.
  const isSafeToOffer = (p) => {
    const resolved = path.resolve(p);
    if (process.platform === 'darwin') {
      if (resolved.startsWith('/Applications' + path.sep)) return false;
    }
    if (resolved === exePath) return false;
    if (exePath.startsWith(resolved + path.sep)) return false;
    return true;
  };

  const installerFiles = searchDirs.flatMap(dir => {
    try {
      return fs.readdirSync(dir)
        .filter(f => f.endsWith(ext) && namePattern.test(f))
        .map(f => path.join(dir, f));
    } catch { return []; }
  }).filter(p => !keepList.includes(p) && isSafeToOffer(p));

  if (installerFiles.length === 0) return;

  for (const installerPath of installerFiles) {
    if (!mainWindow) return;
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: 'Remove Installer?',
      message: `Move "${path.basename(installerPath)}" to Trash?`,
      detail: `Location: ${installerPath}\n\nThis is the installer file used to set up xPPM neo-Seoul. It is no longer needed and can be safely removed.\n\nNote: This does NOT remove the installed app — only the installer file.`,
      buttons: ['Move to Trash', 'Keep'],
      defaultId: 0,
      cancelId: 1
    });
    if (response === 0) {
      try {
        await shell.trashItem(installerPath);
      } catch (err) {
        dialog.showMessageBox(mainWindow, {
          type: 'warning',
          title: 'Could Not Remove Installer',
          message: 'Failed to move the installer to Trash.',
          detail: err.message
        });
      }
    } else {
      keepList.push(installerPath);
      fs.writeFileSync(flagPath, JSON.stringify({ keepList }));
    }
  }
}

// 프로젝트 열기 (.json, .idm, .xml for idmXML, .bpmn, .zip, .xppm)
async function handleOpenProject() {
  const result = await dialog.showOpenDialog({
    title: 'Open xPPM Project',
    filters: [
      { name: 'IDM Project (.idm)', extensions: ['idm', 'json'] },
      { name: 'idmXML 2.0 (.xml)', extensions: ['xml'] },
      { name: 'idmXML 1.0 (.zip)', extensions: ['zip', 'idmx'] },
      { name: 'LOIN XML (.xml)', extensions: ['xml'] },
      { name: 'IDS (.ids)', extensions: ['ids'] },
      { name: 'mvdXML (.mvdxml, .xml)', extensions: ['mvdxml', 'xml'] },
      { name: 'xPPM Legacy (.xppm)', extensions: ['xppm'] },
      { name: 'BPMN Diagram (.bpmn)', extensions: ['bpmn'] },
      { name: 'Reviewed HTML (.html)', extensions: ['html', 'htm'] },
      { name: 'All Supported Formats', extensions: ['idm', 'json', 'xml', 'ids', 'mvdxml', 'zip', 'idmx', 'xppm', 'bpmn', 'html', 'htm'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const ext = path.extname(filePath).toLowerCase();

    // ZIP/IDMX are binary — read as Buffer and send as base64 to avoid UTF-8 corruption
    if (ext === '.zip' || ext === '.idmx') {
      const buffer = fs.readFileSync(filePath);
      mainWindow.webContents.send('file-opened', {
        filePath,
        content: buffer.toString('base64'),
        type: 'zip',
        bpmnContent: null,
        imageMap: {}
      });
      return;
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    // Strip UTF-8 BOM if present (causes XML parsing issues)
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }

    let type = 'project';
    if (ext === '.bpmn') {
      type = 'bpmn';
    } else if (ext === '.zip' || ext === '.idmx') {
      type = 'zip'; // unreachable — handled above
    } else if (ext === '.xppm') {
      type = 'xppm';
    } else if (ext === '.ids') {
      type = 'ids';
    } else if (ext === '.mvdxml') {
      type = 'mvdxml';
    } else if (ext === '.xml') {
      // Detect XML type by root element prefix
      if (content.includes('<loin:') || content.includes('<LOINSpecification')) {
        type = 'loin';
      } else if (content.includes('<ids:')) {
        type = 'ids';
      } else if (/<mvdXML[\s>]/.test(content) || content.includes('buildingsmart-tech.org/mvd/XML')) {
        type = 'mvdxml';
      } else if (content.includes('<idm:') || content.includes('<idm>') || content.includes('<idm ')) {
        // Distinguish idmXML v2.0 from v1.0/xPPM by namespace version
        const isV2 = content.includes('idmXML/2.0') || content.includes('29481/-3/ed-2');
        type = isV2 ? 'idmxml' : 'xppm';
      } else if (content.includes('<bpmn:') || content.includes('<bpmn2:')) {
        type = 'bpmn';
      } else {
        // Unknown XML — ask user
        const { dialog: electronDialog } = require('electron');
        const choice = electronDialog.showMessageBoxSync(mainWindow, {
          type: 'question',
          title: 'Unknown XML Format',
          message: `The file "${path.basename(filePath)}" could not be identified as idmXML, LOIN, IDS, mvdXML, or BPMN.\n\nHow would you like to open it?`,
          buttons: ['As idmXML', 'As LOIN', 'As mvdXML', 'As BPMN', 'Cancel'],
          defaultId: 0,
          cancelId: 4,
        });
        if (choice === 0) type = 'idmxml';
        else if (choice === 1) type = 'loin';
        else if (choice === 2) type = 'mvdxml';
        else if (choice === 3) type = 'bpmn';
        else return; // Cancel
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

// Open external URL in default browser
ipcMain.handle('shell:openExternal', async (event, url) => {
  await shell.openExternal(url);
});

// Read build date from the dist/build-info.json written by Vite at build time
function getBuildDate() {
  try {
    const infoPath = path.join(app.getAppPath(), 'dist', 'build-info.json');
    return JSON.parse(require('fs').readFileSync(infoPath, 'utf-8')).buildDate || null;
  } catch {
    return null;
  }
}

// Check GitHub Releases for a newer version (shared by IPC handler and menu item)
// hasUpdate is true if either the version tag changed OR the release was published after the local build.
function fetchLatestRelease() {
  const https = require('https');
  const currentVersion = app.getVersion();
  const buildDate = getBuildDate();
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/ghanglee/IDMxPPM/releases/latest',
      headers: { 'User-Agent': 'xPPM-neo-Seoul/' + currentVersion },
    };
    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          const latestVersion = (release.tag_name || '').replace(/^v/, '');
          const publishedAt = release.published_at || null;
          const assets = Array.isArray(release.assets) ? release.assets : [];
          // Pick the platform-appropriate installer asset
          let installerUrl = null;
          if (process.platform === 'darwin') {
            // Prefer arm64 DMG on Apple Silicon, fall back to x64 DMG
            const armDmg = assets.find(a => a.name.endsWith('.dmg') && a.name.includes('arm64'));
            const x64Dmg = assets.find(a => a.name.endsWith('.dmg') && !a.name.endsWith('.blockmap'));
            const dmg = armDmg || x64Dmg;
            installerUrl = dmg ? dmg.browser_download_url : null;
          } else if (process.platform === 'win32') {
            // Prefer NSIS Setup installer over portable
            const setupExe = assets.find(a => a.name.endsWith('.exe') && a.name.toLowerCase().includes('setup'));
            const anyExe = assets.find(a => a.name.endsWith('.exe') && !a.name.endsWith('.blockmap'));
            installerUrl = (setupExe || anyExe)?.browser_download_url || null;
          } else {
            const appImage = assets.find(a => a.name.endsWith('.AppImage'));
            installerUrl = appImage ? appImage.browser_download_url : null;
          }
          const downloadUrl = installerUrl || release.html_url || 'https://github.com/ghanglee/IDMxPPM/releases';
          const versionChanged = !!(latestVersion && latestVersion !== currentVersion);
          const newerBuild = !!(publishedAt && buildDate && new Date(publishedAt) > new Date(buildDate));
          const hasUpdate = versionChanged || newerBuild;
          resolve({ currentVersion, latestVersion, publishedAt, buildDate, downloadUrl, hasUpdate, error: null });
        } catch {
          resolve({ currentVersion, latestVersion: null, publishedAt: null, buildDate, downloadUrl: null, hasUpdate: false, error: 'Failed to parse release info' });
        }
      });
    });
    req.on('error', (err) => {
      resolve({ currentVersion, latestVersion: null, publishedAt: null, buildDate, downloadUrl: null, hasUpdate: false, error: err.message });
    });
    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ currentVersion, latestVersion: null, publishedAt: null, buildDate, downloadUrl: null, hasUpdate: false, error: 'Request timed out' });
    });
  });
}

ipcMain.handle('app:checkForUpdates', () => fetchLatestRelease());

// XSLT transformation via the xslt3 CLI (part of the saxon-js ecosystem).
//
// SaxonJS.transform() API only accepts pre-compiled SEF (JSON format), not raw
// XSLT source XML. Compilation from source is handled by the xslt3 CLI, which
// runs the embedded XX compiler internally. We spawn xslt3 as a child process,
// pass the XSLT and XML as temp files, and capture the HTML from stdout.
// This supports XSLT 1.0, 2.0, and 3.0 stylesheets.
ipcMain.handle('xslt:transform', async (event, { xmlContent, xsltContent }) => {
  const os = require('os');
  const { fork } = require('child_process');
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const tmpXsl = path.join(os.tmpdir(), `xslt-${stamp}.xsl`);
  const tmpXml = path.join(os.tmpdir(), `xslt-src-${stamp}.xml`);
  try {
    fs.writeFileSync(tmpXsl, xsltContent, 'utf-8');
    fs.writeFileSync(tmpXml, xmlContent, 'utf-8');
    const xslt3 = require.resolve('xslt3');
    // fork() uses Electron's embedded Node.js runtime, not process.execPath
    // (which points to the Electron binary and would launch a window instead).
    const html = await new Promise((resolve, reject) => {
      const child = fork(xslt3, [`-xsl:${tmpXsl}`, `-s:${tmpXml}`], { silent: true });
      let stdout = '', stderr = '';
      child.stdout.on('data', d => { stdout += d; });
      child.stderr.on('data', d => { stderr += d; });
      child.on('close', code => {
        if (code !== 0) reject(new Error(stderr || `xslt3 exited with code ${code}`));
        else resolve(stdout);
      });
      child.on('error', err => reject(err));
    });
    return { success: true, html };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    try { fs.unlinkSync(tmpXsl); } catch {}
    try { fs.unlinkSync(tmpXml); } catch {}
  }
});

// Open user manual HTML file from local resources
ipcMain.handle('shell:openManual', async () => {
  const manualRelPath = 'user_manuals/V1.5.0/IDMxPPM-Tutorials.html';
  const filePath = isDev
    ? path.join(__dirname, '..', manualRelPath)
    : path.join(process.resourcesPath, manualRelPath);
  await shell.openPath(filePath);
});

// IPC 핸들러들
ipcMain.handle('dialog:openProject', handleOpenProject);
ipcMain.handle('dialog:openBPMN', handleOpenBPMN);
ipcMain.handle('dialog:importER', handleImportER);

// 프로젝트 저장
ipcMain.handle('dialog:saveProject', async (event, { content, defaultName }) => {
  const result = await dialog.showSaveDialog({
    title: 'Save xPPM Project',
    defaultPath: defaultName || 'idm-project.idm',
    filters: [
      { name: 'xPPM Project', extensions: ['idm'] },
      { name: 'All Files', extensions: ['*'] }
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
      { name: 'XML Files', extensions: ['xml'] },
      { name: 'All Files', extensions: ['*'] }
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
      { name: 'SVG Files', extensions: ['svg'] },
      { name: 'All Files', extensions: ['*'] }
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
    ? [{ name: 'JSON Files', extensions: ['json'] }, { name: 'All Files', extensions: ['*'] }]
    : [{ name: 'ER XML Files', extensions: ['erxml', 'xml'] }, { name: 'All Files', extensions: ['*'] }];

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
  const all = { name: 'All Files', extensions: ['*'] };
  const filters = {
    'idm':      [{ name: 'IDM Project',       extensions: ['idm'] },            all],
    'idmxml':   [{ name: 'idmXML Files',      extensions: ['xml'] },            all],
    'idmxml-v2':[{ name: 'idmXML 2.0 Files',  extensions: ['xml'] },            all],
    'idmxml-v1':[{ name: 'idmXML 1.0 Files',  extensions: ['xml'] },            all],
    'html':     [{ name: 'HTML Files',         extensions: ['html'] },           all],
    'zip':      [{ name: 'idmXML 1.0 ZIP',      extensions: ['zip'] },            all],
    'bpmn':     [{ name: 'BPMN Files',         extensions: ['bpmn'] },           all],
    'ids':      [{ name: 'IDS Files',          extensions: ['ids'] },            all],
    'loin':     [{ name: 'LOIN XML Files',     extensions: ['xml'] },            all],
    'mvd':      [{ name: 'mvdXML Files',       extensions: ['mvdxml', 'xml'] },  all]
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

// Persistent key-value cache for bSDD data
ipcMain.handle('cache:read', async (event, key) => {
  try {
    const cacheFile = path.join(app.getPath('userData'), `${key}.json`);
    if (!fs.existsSync(cacheFile)) return null;
    return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
  } catch (e) { console.error('[cache:read]', key, e.message); return null; }
});

ipcMain.handle('cache:write', async (event, key, data) => {
  try {
    fs.writeFileSync(path.join(app.getPath('userData'), `${key}.json`), JSON.stringify(data), 'utf-8');
    return true;
  } catch (e) { console.error('[cache:write]', key, e.message); return false; }
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
