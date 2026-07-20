// DOM Elements
const btnSelectSource = document.getElementById('btn-select-source');
const btnSelectFiles = document.getElementById('btn-select-files');
const sourceDropzone = document.getElementById('source-dropzone');
const previewContainer = document.getElementById('preview-container');
const sourceFolderName = document.getElementById('source-folder-name');
const dartFilesCount = document.getElementById('dart-files-count');
const fileListElement = document.getElementById('file-list-element');
const btnSelectAll = document.getElementById('btn-select-all');
const btnDeselectAll = document.getElementById('btn-deselect-all');
const btnConvert = document.getElementById('btn-convert');
const btnClearConsole = document.getElementById('btn-clear-console');
const consoleLog = document.getElementById('console-log');
const appStatus = document.getElementById('app-status');

const radioLocalFolder = document.getElementById('radio-local-folder');
const radioZip = document.getElementById('radio-zip');
const radioBundle = document.getElementById('radio-bundle');
const optionLocalFolder = document.getElementById('option-local-folder');
const optionZipDownload = document.getElementById('option-zip-download');
const optionSingleBundle = document.getElementById('option-single-bundle');

const radioStructNested = document.getElementById('struct-nested');
const radioStructFlat = document.getElementById('struct-flat');
const optionStructNested = document.getElementById('option-struct-nested');
const optionStructFlat = document.getElementById('option-struct-flat');
const structureSelectorContainer = document.getElementById('structure-selector-container');

// Search & Filter DOM Elements
const fileSearchInput = document.getElementById('file-search-input');
const chkExcludeGenerated = document.getElementById('chk-exclude-generated');
const chkExcludeTests = document.getElementById('chk-exclude-tests');

// Extensions Filter DOM Elements
const extensionsPanel = document.getElementById('extensions-panel');
const extensionsList = document.getElementById('extensions-list');
const presetSelector = document.getElementById('preset-selector');

// Statistics DOM Elements
const totalCodeSize = document.getElementById('total-code-size');
const totalLinesCount = document.getElementById('total-lines-count');
const totalCharsCount = document.getElementById('total-chars-count');
const estTokensCount = document.getElementById('est-tokens-count');

// Preview Modal DOM Elements
const previewModal = document.getElementById('preview-modal');
const previewFilename = document.getElementById('preview-filename');
const previewCode = document.getElementById('preview-code');
const btnModalCopy = document.getElementById('btn-modal-copy');
const btnModalClose = document.getElementById('btn-modal-close');

// Global State
let sourceDirHandle = null;
let foundFiles = []; // Array of { name, handle, relativePath, selected: true, extension }
let fileContentCache = {}; // Cache map: relativePath -> { text, size, loc, chars }
let filterQuery = '';
let excludeGenerated = true;
let excludeTests = false;
let detectedExtensions = []; // Array of sorted unique extensions e.g. ['.dart', '.js']
let selectedExtensions = new Set(); // Set of currently active extensions to filter

// Initialize Lucide Icons & Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  checkBrowserSupport();
  initThemes();
});

// Check browser support for File System Access API
function checkBrowserSupport() {
  const supportsFileSystemAccess = 'showDirectoryPicker' in window;
  if (!supportsFileSystemAccess) {
    log('[System Error] Your browser does not support the File System Access API. Please use Google Chrome or Edge.', 'error');
    btnSelectSource.disabled = true;
    sourceDropzone.style.pointerEvents = 'none';
    sourceDropzone.querySelector('h3').textContent = 'Browser Not Supported';
    sourceDropzone.querySelector('p').textContent = 'Please open this tool in Google Chrome to use directory picking.';
  } else {
    log('[System] File System Access API supported. Ready to select project directory.', 'system');
  }
}

// Set up UI Event Listeners
function initEventListeners() {
  // Select Folder Click
  btnSelectSource.addEventListener('click', handleSelectSource);
  
  // Select Files Click
  btnSelectFiles.addEventListener('click', handleSelectFiles);
  
  // Drag and Drop
  sourceDropzone.addEventListener('click', handleSelectSource);
  sourceDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    sourceDropzone.classList.add('dragover');
  });
  sourceDropzone.addEventListener('dragleave', () => {
    sourceDropzone.classList.remove('dragover');
  });
  sourceDropzone.addEventListener('drop', handleDrop);

  // Radio Options Styling Toggle
  optionLocalFolder.addEventListener('click', () => selectExportMode('folder'));
  optionZipDownload.addEventListener('click', () => selectExportMode('zip'));
  optionSingleBundle.addEventListener('click', () => selectExportMode('bundle'));
  
  radioLocalFolder.addEventListener('change', () => selectExportMode('folder'));
  radioZip.addEventListener('change', () => selectExportMode('zip'));
  radioBundle.addEventListener('change', () => selectExportMode('bundle'));

  // Structure Options Styling Toggle
  optionStructNested.addEventListener('click', () => selectStructureMode('nested'));
  optionStructFlat.addEventListener('click', () => selectStructureMode('flat'));
  
  radioStructNested.addEventListener('change', () => selectStructureMode('nested'));
  radioStructFlat.addEventListener('change', () => selectStructureMode('flat'));

  // Select / Deselect All Preview Files
  btnSelectAll.addEventListener('click', () => toggleAllFiles(true));
  btnDeselectAll.addEventListener('click', () => toggleAllFiles(false));

  // Clear Console
  btnClearConsole.addEventListener('click', () => {
    consoleLog.innerHTML = '';
    log('[System] Console cleared.', 'system');
  });

  // Convert Action
  btnConvert.addEventListener('click', startConversion);

  // Search & Filter Inputs
  fileSearchInput.addEventListener('input', (e) => {
    filterQuery = e.target.value;
    filterAndDisplayFiles();
  });

  chkExcludeGenerated.addEventListener('change', (e) => {
    excludeGenerated = e.target.checked;
    filterAndDisplayFiles();
  });

  chkExcludeTests.addEventListener('change', (e) => {
    excludeTests = e.target.checked;
    filterAndDisplayFiles();
  });

  // Preset Selector Change
  presetSelector.addEventListener('change', (e) => {
    applyPreset(e.target.value);
  });

  // Preview Modal Event Listeners
  btnModalClose.addEventListener('click', closePreviewModal);
  previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) closePreviewModal();
  });
  btnModalCopy.addEventListener('click', copyPreviewContent);
}

// Select Export Mode UI update
function selectExportMode(mode) {
  if (mode === 'folder') {
    radioLocalFolder.checked = true;
    optionLocalFolder.classList.add('active');
    optionZipDownload.classList.remove('active');
    optionSingleBundle.classList.remove('active');
    structureSelectorContainer.classList.remove('hidden');
    log('[System] Export mode set to: Save to Local Folder.', 'info');
  } else if (mode === 'zip') {
    radioZip.checked = true;
    optionZipDownload.classList.add('active');
    optionLocalFolder.classList.remove('active');
    optionSingleBundle.classList.remove('active');
    structureSelectorContainer.classList.remove('hidden');
    log('[System] Export mode set to: Download ZIP.', 'info');
  } else {
    radioBundle.checked = true;
    optionSingleBundle.classList.add('active');
    optionLocalFolder.classList.remove('active');
    optionZipDownload.classList.remove('active');
    structureSelectorContainer.classList.add('hidden'); // Structure doesn't apply to a single bundle
    log('[System] Export mode set to: Single File Bundle (AI Prompt Builder).', 'info');
  }
}

// Select Structure Mode UI update
function selectStructureMode(mode) {
  if (mode === 'nested') {
    radioStructNested.checked = true;
    optionStructNested.classList.add('active');
    optionStructFlat.classList.remove('active');
    log('[System] File structure set to: Keep Folders.', 'info');
  } else {
    radioStructFlat.checked = true;
    optionStructFlat.classList.add('active');
    optionStructNested.classList.remove('active');
    log('[System] File structure set to: All Together (Flat).', 'info');
  }
}

// Log utility for process console
function log(message, type = 'system') {
  const line = document.createElement('div');
  line.className = `console-line ${type}-line`;
  
  const timestamp = new Date().toLocaleTimeString();
  line.textContent = `[${timestamp}] ${message}`;
  
  consoleLog.appendChild(line);
  consoleLog.scrollTop = consoleLog.scrollHeight;
}

// Update app status badge
function setAppStatus(status, text) {
  appStatus.className = 'status-badge ' + status;
  appStatus.querySelector('.status-text').textContent = text;
}

// File Picker Folder Selector
async function handleSelectSource() {
  try {
    setAppStatus('working', 'Selecting Folder...');
    const handle = await window.showDirectoryPicker();
    await processSourceDirectory(handle);
  } catch (err) {
    if (err.name !== 'AbortError') {
      log(`Error selecting folder: ${err.message}`, 'error');
    }
    setAppStatus('ready', 'Ready');
  }
}

// File Selector Picker
async function handleSelectFiles() {
  try {
    setAppStatus('working', 'Selecting Files...');
    const fileHandles = await window.showOpenFilePicker({
      multiple: true,
      types: [
        {
          description: 'Code/Text Files',
          accept: {
            'text/plain': ['.dart', '.js', '.ts', '.py', '.kt', '.swift', '.java', '.cpp', '.c', '.h', '.html', '.css', '.json', '.yaml', '.yml', '.md', '.sh']
          }
        },
        {
          description: 'All Files',
          accept: {
            '*/*': ['.*']
          }
        }
      ]
    });
    
    if (fileHandles && fileHandles.length > 0) {
      await processSelectedFilesList(fileHandles);
    } else {
      setAppStatus('ready', 'Ready');
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      log(`Error selecting files: ${err.message}`, 'error');
    }
    setAppStatus('ready', 'Ready');
  }
}

// Process individual selected files list
async function processSelectedFilesList(fileHandles) {
  sourceDirHandle = null; // No root folder handle
  sourceFolderName.textContent = `Individual Files (${fileHandles.length})`;
  fileContentCache = {}; // Reset cache
  
  log(`Loading ${fileHandles.length} manually selected files...`, 'info');
  
  foundFiles = fileHandles.map(handle => {
    const lastDot = handle.name.lastIndexOf('.');
    const ext = lastDot !== -1 ? handle.name.slice(lastDot).toLowerCase() : 'no-ext';
    return {
      name: handle.name,
      handle: handle,
      relativePath: handle.name, // Path is just the file name
      selected: true,
      extension: ext
    };
  });
  
  initializeProjectPresetsAndDetection();
  
  sourceDropzone.classList.add('hidden');
  previewContainer.classList.remove('hidden');
  
  btnConvert.disabled = false;
  setAppStatus('ready', 'Files Loaded');
  log(`Loaded ${foundFiles.length} files successfully. Ready to convert.`, 'system');
}

// Drop Zone Folder Drop Handler
async function handleDrop(e) {
  e.preventDefault();
  sourceDropzone.classList.remove('dragover');
  
  try {
    const items = e.dataTransfer.items;
    if (items.length > 0) {
      const item = items[0];
      if (item.kind === 'file') {
        setAppStatus('working', 'Processing Drop...');
        const handle = await item.getAsFileSystemHandle();
        if (handle.kind === 'directory') {
          await processSourceDirectory(handle);
        } else {
          log('Please drop a directory/folder, not a single file.', 'warning');
          setAppStatus('ready', 'Ready');
        }
      }
    }
  } catch (err) {
    log(`Error loading dropped folder: ${err.message}`, 'error');
    setAppStatus('ready', 'Ready');
  }
}

// Recursively scan directories for files, ignoring massive non-code metadata/binaries
async function scanDirectoryRecursive(dirHandle, currentPath = "") {
  let results = [];
  
  // Folders to ignore entirely (including mobile build folders)
  const ignoredFolders = [
    '.git', '.github', '.idea', '.vscode', 'node_modules', 'build', 'dist', 
    '.dart_tool', 'ios/.symlinks', 'windows/flutter', 'macos/Flutter', 'ios/Flutter',
    'out', 'bin', 'obj', 'gradle', '.gradle', 'Pods', 'build-artifacts',
    '.expo', '.expo-shared', 'web-build', '.metro', 'android/build', 'android/app/build', 
    'ios/build', 'ios/Pods'
  ];
  
  // File extensions to skip (binary/media assets)
  const ignoredExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.pdf', '.zip', '.gz', '.tar', 
    '.exe', '.dll', '.so', '.dylib', '.class', '.pyc', '.ttf', '.woff', '.woff2', 
    '.eot', '.mp3', '.mp4', '.mov', '.avi', '.svg', '.apk', '.aar', '.db', '.sqlite',
    '.DS_Store', 'thumbs.db'
  ];

  for await (const entry of dirHandle.values()) {
    const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    
    if (entry.kind === 'directory') {
      // Check folder filters
      if (ignoredFolders.includes(entry.name) || ignoredFolders.some(f => entryPath.endsWith('/' + f))) {
        continue;
      }
      const subFiles = await scanDirectoryRecursive(entry, entryPath);
      results = results.concat(subFiles);
    } else if (entry.kind === 'file') {
      const lastDot = entry.name.lastIndexOf('.');
      const ext = lastDot !== -1 ? entry.name.slice(lastDot).toLowerCase() : 'no-ext';
      
      // Skip binary extensions
      if (ignoredExtensions.includes(ext)) {
        continue;
      }
      
      results.push({
        name: entry.name,
        handle: entry,
        relativePath: entryPath,
        selected: true,
        extension: ext
      });
    }
  }
  return results;
}

// Main logic to analyze and filter scanned directories
async function processSourceDirectory(directoryHandle) {
  sourceDirHandle = directoryHandle;
  sourceFolderName.textContent = directoryHandle.name;
  fileContentCache = {}; // Reset cache
  
  log(`Scanning project directory: "${directoryHandle.name}"...`, 'info');
  
  try {
    // Recursive scan
    foundFiles = await scanDirectoryRecursive(directoryHandle);
    
    if (foundFiles.length === 0) {
      log('No valid text/code files found in the directory structure.', 'error');
      btnConvert.disabled = true;
      previewContainer.classList.add('hidden');
      sourceDropzone.classList.remove('hidden');
      setAppStatus('ready', 'Ready');
      return;
    }
    
    initializeProjectPresetsAndDetection();
    
    // Show preview area, hide dropzone
    sourceDropzone.classList.add('hidden');
    previewContainer.classList.remove('hidden');
    
    btnConvert.disabled = false;
    setAppStatus('ready', 'Folder Loaded');
    log(`Scanned ${foundFiles.length} files successfully. Ready to convert.`, 'system');
    
  } catch (err) {
    log(`Error reading project files: ${err.message}`, 'error');
    setAppStatus('ready', 'Ready');
  }
}

// Extract extensions, calculate counts, and update tags UI
function compileExtensionsList() {
  const counts = {};
  foundFiles.forEach(file => {
    counts[file.extension] = (counts[file.extension] || 0) + 1;
  });
  
  // Sort extensions by count frequency
  detectedExtensions = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  
  // Select all by default
  selectedExtensions = new Set(detectedExtensions);
  
  renderExtensionTags(counts);
}

// Render tag elements for selected extensions
function renderExtensionTags(counts) {
  extensionsList.innerHTML = '';
  
  // Hide panel if only one type of file is found
  if (detectedExtensions.length <= 1) {
    extensionsPanel.classList.add('hidden');
    return;
  }
  
  extensionsPanel.classList.remove('hidden');
  
  detectedExtensions.forEach(ext => {
    const tag = document.createElement('div');
    const isActive = selectedExtensions.has(ext);
    tag.className = `extension-tag ${isActive ? 'active' : ''}`;
    tag.innerHTML = `
      <span class="ext-name">${ext}</span>
      <span class="ext-count">${counts[ext]}</span>
    `;
    
    tag.addEventListener('click', () => {
      if (selectedExtensions.has(ext)) {
        selectedExtensions.delete(ext);
        tag.classList.remove('active');
      } else {
        selectedExtensions.add(ext);
        tag.classList.add('active');
      }
      filterAndDisplayFiles();
    });
    
    extensionsList.appendChild(tag);
  });
}

// Compute filtered file list based on active filters
function getFilteredFiles() {
  return foundFiles.filter(file => {
    // Extension filter
    if (!selectedExtensions.has(file.extension)) return false;

    // Search filter
    if (filterQuery) {
      const matchesSearch = file.relativePath.toLowerCase().includes(filterQuery.toLowerCase());
      if (!matchesSearch) return false;
    }
    
    // Exclude Generated filter
    if (excludeGenerated) {
      const nameLower = file.name.toLowerCase();
      const pathLower = file.relativePath.toLowerCase();
      
      const isGenerated = 
        nameLower.endsWith('.g.dart') || 
        nameLower.endsWith('.freezed.dart') || 
        nameLower.endsWith('.gr.dart') ||
        nameLower.endsWith('.generated.dart') ||
        nameLower.endsWith('.template.dart') ||
        nameLower.endsWith('.min.js') ||
        nameLower.endsWith('.min.css') ||
        nameLower.endsWith('.map') ||
        nameLower.endsWith('.pb.go') ||
        pathLower.includes('/generated/') ||
        pathLower.includes('/gen/');
        
      if (isGenerated) return false;
    }
    
    // Exclude Tests filter
    if (excludeTests) {
      const nameLower = file.name.toLowerCase();
      const pathLower = file.relativePath.toLowerCase();
      const pathParts = pathLower.split('/');
      
      const isTest = 
        pathParts.includes('test') || 
        pathParts.includes('tests') || 
        pathParts.includes('__tests__') || 
        nameLower.endsWith('_test.dart') ||
        nameLower.endsWith('.test.js') ||
        nameLower.endsWith('.test.ts') ||
        nameLower.endsWith('.test.jsx') ||
        nameLower.endsWith('.test.tsx') ||
        nameLower.endsWith('.spec.js') ||
        nameLower.endsWith('.spec.ts') ||
        nameLower.endsWith('.spec.jsx') ||
        nameLower.endsWith('.spec.tsx') ||
        nameLower.startsWith('test_');
        
      if (isTest) return false;
    }
    
    return true;
  });
}

// Filter and re-render preview list
function filterAndDisplayFiles() {
  populatePreviewList();
}

// Populate the visual file checklist
function populatePreviewList() {
  fileListElement.innerHTML = '';
  const filtered = getFilteredFiles();
  
  filtered.forEach((file) => {
    // Find index in master list
    const originalIndex = foundFiles.findIndex(f => f.relativePath === file.relativePath);
    
    const li = document.createElement('li');
    li.className = 'file-item';
    
    const checkboxId = `file-chk-${originalIndex}`;
    const displayName = file.relativePath;
    
    li.innerHTML = `
      <label for="${checkboxId}">
        <input type="checkbox" id="${checkboxId}" ${file.selected ? 'checked' : ''} data-index="${originalIndex}">
        <div class="file-info">
          <span class="file-path" title="${displayName}">${displayName}</span>
        </div>
      </label>
      <button class="btn-file-preview" title="Preview File">
        <i data-lucide="eye"></i>
      </button>
    `;
    
    // Toggle individual selection state
    li.querySelector('input').addEventListener('change', (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'));
      foundFiles[idx].selected = e.target.checked;
      updateSelectedCountAndStats();
    });
    
    // Preview Button trigger
    li.querySelector('.btn-file-preview').addEventListener('click', (e) => {
      e.preventDefault();
      openPreviewModal(file);
    });
    
    fileListElement.appendChild(li);
  });
  
  // Re-create icons inside list items
  lucide.createIcons({
    attrs: {
      class: 'lucide-icon'
    },
    nameAttr: 'data-lucide'
  });
  
  updateSelectedCountAndStats();
}

// Toggle all files checkbox status in current filtered set
function toggleAllFiles(selected) {
  const filtered = getFilteredFiles();
  filtered.forEach(file => {
    file.selected = selected;
  });
  
  // Update visually
  const checkboxes = fileListElement.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = selected);
  
  updateSelectedCountAndStats();
  log(`All matching files ${selected ? 'selected' : 'deselected'}.`, 'info');
}

// Update counts and trigger asynchronous stats calculation
function updateSelectedCountAndStats() {
  const filtered = getFilteredFiles();
  const selectedCount = filtered.filter(f => f.selected).length;
  
  dartFilesCount.textContent = `${selectedCount} / ${filtered.length}`;
  btnConvert.disabled = selectedCount === 0;

  // Recalculate code statistics
  calculateStatistics(filtered.filter(f => f.selected));
}

// Calculate sizes, character counts, LOC, and tokens using Cache
async function calculateStatistics(selectedFiles) {
  let totalBytes = 0;
  let totalLOC = 0;
  let totalChars = 0;

  if (selectedFiles.length === 0) {
    totalCodeSize.textContent = '0 B';
    totalLinesCount.textContent = '0';
    totalCharsCount.textContent = '0';
    estTokensCount.textContent = '0';
    return;
  }

  // Set estimating status
  totalCodeSize.textContent = 'Estimating...';
  totalLinesCount.textContent = '...';
  totalCharsCount.textContent = '...';
  estTokensCount.textContent = '...';

  try {
    const promises = selectedFiles.map(async (fileObj) => {
      const path = fileObj.relativePath;
      if (!fileContentCache[path]) {
        const file = await fileObj.handle.getFile();
        const text = await file.text();
        fileContentCache[path] = {
          text: text,
          size: file.size,
          loc: text.split('\n').length,
          chars: text.length
        };
      }
      const data = fileContentCache[path];
      totalBytes += data.size;
      totalLOC += data.loc;
      totalChars += data.chars;
    });

    await Promise.all(promises);

    // Format size
    let formattedSize = '';
    if (totalBytes < 1024) {
      formattedSize = `${totalBytes} B`;
    } else if (totalBytes < 1024 * 1024) {
      formattedSize = `${(totalBytes / 1024).toFixed(1)} KB`;
    } else {
      formattedSize = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    totalCodeSize.textContent = formattedSize;
    totalLinesCount.textContent = totalLOC.toLocaleString();
    totalCharsCount.textContent = totalChars.toLocaleString();
    estTokensCount.textContent = Math.round(totalChars / 4).toLocaleString();
  } catch (err) {
    console.error('Stats calculation error:', err);
    totalCodeSize.textContent = 'Error';
    totalLinesCount.textContent = 'Error';
    totalCharsCount.textContent = 'Error';
    estTokensCount.textContent = 'Error';
  }
}

// Open File Preview Dialog
async function openPreviewModal(fileObj) {
  previewFilename.textContent = fileObj.relativePath;
  previewCode.textContent = 'Loading file contents...';
  previewModal.classList.remove('hidden');
  
  try {
    const path = fileObj.relativePath;
    if (!fileContentCache[path]) {
      const file = await fileObj.handle.getFile();
      const text = await file.text();
      fileContentCache[path] = {
        text: text,
        size: file.size,
        loc: text.split('\n').length,
        chars: text.length
      };
    }
    previewCode.textContent = fileContentCache[path].text;
  } catch (err) {
    previewCode.textContent = `Error loading file contents: ${err.message}`;
    log(`[Preview Error] Could not read ${fileObj.relativePath}: ${err.message}`, 'error');
  }
}

// Close File Preview Dialog
function closePreviewModal() {
  previewModal.classList.add('hidden');
}

// Copy Code Preview text to clipboard
async function copyPreviewContent() {
  try {
    await navigator.clipboard.writeText(previewCode.textContent);
    
    // Visual feedback
    const originalText = btnModalCopy.innerHTML;
    btnModalCopy.innerHTML = '<i data-lucide="check"></i> Copied!';
    btnModalCopy.style.background = 'var(--success)';
    btnModalCopy.style.borderColor = 'var(--success)';
    lucide.createIcons();
    
    setTimeout(() => {
      btnModalCopy.innerHTML = originalText;
      btnModalCopy.style.background = '';
      btnModalCopy.style.borderColor = '';
      lucide.createIcons();
    }, 2000);
  } catch (err) {
    log(`Failed to copy content: ${err.message}`, 'error');
  }
}

// Run through directory handle levels to obtain target file handle
async function getFileHandleFromPath(dirHandle, pathParts, create = true) {
  let currentHandle = dirHandle;
  // Subdirectories traversal (excluding filename)
  for (let i = 0; i < pathParts.length - 1; i++) {
    currentHandle = await currentHandle.getDirectoryHandle(pathParts[i], { create });
  }
  const fileName = pathParts[pathParts.length - 1];
  return await currentHandle.getFileHandle(fileName, { create });
}

// Start conversion processing based on selection
async function startConversion() {
  const filtered = getFilteredFiles();
  const selectedFiles = filtered.filter(f => f.selected);
  if (selectedFiles.length === 0) return;

  setAppStatus('working', 'Converting...');
  btnConvert.disabled = true;
  btnSelectSource.disabled = true;
  btnSelectFiles.disabled = true;

  log(`Starting conversion of ${selectedFiles.length} files...`, 'info');

  const isZipExport = radioZip.checked;
  const isBundleExport = radioBundle.checked;

  try {
    if (isBundleExport) {
      await exportAsSingleBundle(selectedFiles);
    } else if (isZipExport) {
      await exportAsZip(selectedFiles);
    } else {
      await exportToFolder(selectedFiles);
    }
  } catch (err) {
    log(`Conversion interrupted: ${err.message}`, 'error');
    setAppStatus('ready', 'Error');
  } finally {
    btnConvert.disabled = false;
    btnSelectSource.disabled = false;
    btnSelectFiles.disabled = false;
  }
}

// Convert any extension to .txt (or append if none)
function swapExtensionToTxt(fileName) {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return fileName + '.txt';
  return fileName.slice(0, lastDot) + '.txt';
}

// Export files directly to chosen destination directory
async function exportToFolder(files) {
  log('Requesting destination directory...', 'info');
  let destDirHandle;
  try {
    destDirHandle = await window.showDirectoryPicker({
      mode: 'readwrite'
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      log('Destination directory selection cancelled.', 'warning');
      setAppStatus('ready', 'Ready');
    } else {
      log(`Error opening destination folder: ${err.message}`, 'error');
    }
    return;
  }

  log(`Exporting files to folder: "${destDirHandle.name}"...`, 'info');
  let successCount = 0;
  const isFlat = radioStructFlat.checked;

  for (const fileObj of files) {
    try {
      const path = fileObj.relativePath;
      let content;
      if (fileContentCache[path]) {
        content = fileContentCache[path].text;
      } else {
        const file = await fileObj.handle.getFile();
        content = await file.text();
      }

      let destFileHandle;
      let finalName;

      // Format filename based on selected structure option
      if (isFlat) {
        // Swap extension to txt and join with underscore
        const lastDot = fileObj.relativePath.lastIndexOf('.');
        const relativeBase = lastDot !== -1 ? fileObj.relativePath.slice(0, lastDot) : fileObj.relativePath;
        finalName = relativeBase.replace(/\//g, '_') + '.txt';
        
        destFileHandle = await destDirHandle.getFileHandle(finalName, { create: true });
      } else {
        const pathParts = fileObj.relativePath.split('/');
        const originalName = pathParts[pathParts.length - 1];
        
        // Swap extension
        const newName = swapExtensionToTxt(originalName);
        pathParts[pathParts.length - 1] = newName;
        finalName = pathParts.join('/');
        destFileHandle = await getFileHandleFromPath(destDirHandle, pathParts, true);
      }

      // Write copy
      const writable = await destFileHandle.createWritable();
      await writable.write(content);
      await writable.close();

      successCount++;
      log(`[Copied] ${fileObj.relativePath} -> ${finalName}`, 'success');
    } catch (err) {
      log(`[Failed] ${fileObj.relativePath}: ${err.message}`, 'error');
    }
  }

  log(`Conversion completed: successfully copied ${successCount} of ${files.length} files to "${destDirHandle.name}".`, 'success');
  setAppStatus('success', 'Done');
}

// Zip package assembler and downloader
async function exportAsZip(files) {
  log('Creating ZIP archive...', 'info');
  const zip = new JSZip();
  let successCount = 0;
  const isFlat = radioStructFlat.checked;

  for (const fileObj of files) {
    try {
      const path = fileObj.relativePath;
      let content;
      if (fileContentCache[path]) {
        content = fileContentCache[path].text;
      } else {
        const file = await fileObj.handle.getFile();
        content = await file.text();
      }

      let finalName;
      
      // Format filename based on selected structure option
      if (isFlat) {
        const lastDot = fileObj.relativePath.lastIndexOf('.');
        const relativeBase = lastDot !== -1 ? fileObj.relativePath.slice(0, lastDot) : fileObj.relativePath;
        finalName = relativeBase.replace(/\//g, '_') + '.txt';
      } else {
        const pathParts = fileObj.relativePath.split('/');
        const originalName = pathParts[pathParts.length - 1];
        const newName = swapExtensionToTxt(originalName);
        pathParts[pathParts.length - 1] = newName;
        finalName = pathParts.join('/');
      }
      
      zip.file(finalName, content);
      
      successCount++;
      log(`[Zipped] ${fileObj.relativePath} -> ${finalName}`, 'success');
    } catch (err) {
      log(`[Failed ZIP] ${fileObj.relativePath}: ${err.message}`, 'error');
    }
  }

  if (successCount === 0) {
    log('No files were successfully packed into the ZIP.', 'error');
    setAppStatus('ready', 'Error');
    return;
  }

  log('Compiling ZIP download...', 'info');
  try {
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `code_project_txt_copy_${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    log(`ZIP compilation finished. Triggered browser download.`, 'success');
    setAppStatus('success', 'Done');
  } catch (err) {
    log(`ZIP generation failed: ${err.message}`, 'error');
    setAppStatus('ready', 'Error');
  }
}

// Single File concatenation (AI Prompt Builder)
async function exportAsSingleBundle(files) {
  log('Generating Single File Bundle (AI Prompt)...', 'info');
  let bundleText = '';
  let successCount = 0;

  for (const fileObj of files) {
    try {
      const path = fileObj.relativePath;
      let content;
      if (fileContentCache[path]) {
        content = fileContentCache[path].text;
      } else {
        const file = await fileObj.handle.getFile();
        content = await file.text();
      }

      // Append divider and content
      bundleText += `\n================================================================\n`;
      bundleText += `FILE: ${fileObj.relativePath}\n`;
      bundleText += `================================================================\n\n`;
      bundleText += content;
      bundleText += `\n`;

      successCount++;
      log(`[Bundled] ${fileObj.relativePath}`, 'success');
    } catch (err) {
      log(`[Failed Bundle] ${fileObj.relativePath}: ${err.message}`, 'error');
    }
  }

  if (successCount === 0) {
    log('No files were successfully bundled.', 'error');
    setAppStatus('ready', 'Error');
    return;
  }

  log('Compiling Bundle download...', 'info');
  try {
    const blob = new Blob([bundleText.trim()], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `project_code_bundle_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    log(`Bundle compilation finished. Triggered download.`, 'success');
    setAppStatus('success', 'Done');
  } catch (err) {
    log(`Bundle generation failed: ${err.message}`, 'error');
    setAppStatus('ready', 'Error');
  }
}

// Dynamic Theme Switcher Initialization
function initThemes() {
  const themeBtns = document.querySelectorAll('.theme-btn');
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme');
      
      // Remove all theme classes from body
      document.body.className = '';
      themeBtns.forEach(b => b.classList.remove('active'));
      
      // Apply new theme class
      if (theme !== 'blue') {
        document.body.classList.add(`theme-${theme}`);
      }
      btn.classList.add('active');
      
      // Save settings
      localStorage.setItem('app-theme', theme);
      log(`[System] Theme changed to: ${btn.getAttribute('title') || theme}`, 'system');
    });
  });
  
  // Load saved theme if any, default to amoled
  const savedTheme = localStorage.getItem('app-theme') || 'amoled';
  const activeBtn = document.querySelector(`.theme-btn[data-theme="${savedTheme}"]`);
  if (activeBtn) {
    activeBtn.click();
  }
}

// Preset mapping configurations
const PRESETS = {
  'auto': null,
  'flutter': ['.dart', '.yaml', '.yml', '.md'],
  'react-native': ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'],
  'web': ['.html', '.css', '.js', '.jsx', '.ts', '.tsx', '.json'],
  'python': ['.py', '.json', '.yaml', '.yml', '.txt', '.md']
};

// Apply extension presets filter dynamically
function applyPreset(presetKey) {
  const allowed = PRESETS[presetKey];
  if (presetKey === 'auto' || !allowed) {
    selectedExtensions = new Set(detectedExtensions);
  } else {
    selectedExtensions = new Set();
    detectedExtensions.forEach(ext => {
      if (allowed.includes(ext)) {
        selectedExtensions.add(ext);
      }
    });
  }
  
  // Visual state updates on tag pills
  const tags = extensionsList.querySelectorAll('.extension-tag');
  tags.forEach(tag => {
    const extName = tag.querySelector('.ext-name').textContent;
    if (selectedExtensions.has(extName)) {
      tag.classList.add('active');
    } else {
      tag.classList.remove('active');
    }
  });
  
  filterAndDisplayFiles();
  log(`[System] Applied preset: ${presetSelector.options[presetSelector.selectedIndex].text}`, 'info');
}

// Auto-detect project framework type based on files
function detectProjectType() {
  const filePaths = foundFiles.map(f => f.relativePath.toLowerCase());
  
  // 1. Flutter / Dart Project
  if (filePaths.some(p => p.endsWith('pubspec.yaml')) || foundFiles.some(f => f.extension === '.dart')) {
    return 'flutter';
  }
  
  // 2. React Native Project
  const hasPackageJson = filePaths.some(p => p.endsWith('package.json'));
  const hasRNFiles = foundFiles.some(f => f.extension === '.jsx' || f.extension === '.tsx');
  const hasAndroidBuild = filePaths.some(p => p.includes('android/app'));
  if (hasPackageJson && (hasRNFiles || hasAndroidBuild)) {
    return 'react-native';
  }
  
  // 3. Web Front-End
  if (hasPackageJson || foundFiles.some(f => f.extension === '.html' || f.extension === '.css' || f.extension === '.js')) {
    return 'web';
  }
  
  // 4. Python Project
  if (filePaths.some(p => p.endsWith('requirements.txt') || p.endsWith('pipfile') || p.endsWith('pyproject.toml')) || foundFiles.some(f => f.extension === '.py')) {
    return 'python';
  }
  
  return 'unknown';
}

// Initialise presets and run auto-detection
function initializeProjectPresetsAndDetection() {
  const detected = detectProjectType();
  const badge = document.getElementById('detected-badge');
  const autoOption = presetSelector.options[0];
  
  compileExtensionsList();
  
  if (detected !== 'unknown') {
    badge.classList.remove('hidden');
    let label = '';
    if (detected === 'flutter') label = 'Flutter / Dart';
    else if (detected === 'react-native') label = 'React Native';
    else if (detected === 'web') label = 'Web App';
    else if (detected === 'python') label = 'Python';
    
    badge.textContent = `Detected: ${label}`;
    autoOption.textContent = `Auto (Detected: ${label})`;
    
    // Set selector value back to 'auto' but apply the preset filter
    presetSelector.value = 'auto';
    applyPreset(detected);
  } else {
    badge.classList.add('hidden');
    autoOption.textContent = 'All Detected Files';
    presetSelector.value = 'auto';
    applyPreset('auto');
  }
}

