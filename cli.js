const fs = require('fs');
const path = require('path');

// Excluded folders
const IGNORED_FOLDERS = [
  '.git', '.github', '.idea', '.vscode', 'node_modules', 'build', 'dist', 
  '.dart_tool', 'ios/.symlinks', 'windows/flutter', 'macos/Flutter', 'ios/Flutter',
  'out', 'bin', 'obj', 'gradle', '.gradle', 'Pods', 'build-artifacts',
  '.expo', '.expo-shared', 'web-build', '.metro', 'android/build', 'android/app/build', 
  'ios/build', 'ios/Pods'
];

// Excluded extensions
const IGNORED_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.pdf', '.zip', '.gz', '.tar', 
  '.exe', '.dll', '.so', '.dylib', '.class', '.pyc', '.ttf', '.woff', '.woff2', 
  '.eot', '.mp3', '.mp4', '.mov', '.avi', '.svg', '.apk', '.aar', '.db', '.sqlite',
  '.ds_store', 'thumbs.db'
];

// Presets definition
const PRESETS = {
  'flutter': ['.dart', '.yaml', '.yml', '.md'],
  'react-native': ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'],
  'web': ['.html', '.css', '.js', '.jsx', '.ts', '.tsx', '.json'],
  'python': ['.py', '.json', '.yaml', '.yml', '.txt', '.md']
};

function getFilesRecursive(dir, rootDir = dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  for (const file of list) {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (IGNORED_FOLDERS.includes(file) || IGNORED_FOLDERS.some(f => relativePath.endsWith('/' + f))) {
        continue;
      }
      results = results.concat(getFilesRecursive(filePath, rootDir));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (IGNORED_EXTENSIONS.includes(ext)) {
        continue;
      }
      results.push({
        name: file,
        absolutePath: filePath,
        relativePath: relativePath,
        extension: ext
      });
    }
  }
  return results;
}

function detectPreset(files) {
  const paths = files.map(f => f.relativePath.toLowerCase());
  if (paths.some(p => p.endsWith('pubspec.yaml')) || files.some(f => f.extension === '.dart')) return 'flutter';
  const hasPackageJson = paths.some(p => p.endsWith('package.json'));
  const hasRNFiles = files.some(f => f.extension === '.jsx' || f.extension === '.tsx');
  if (hasPackageJson && hasRNFiles) return 'react-native';
  if (hasPackageJson || files.some(f => f.extension === '.html' || f.extension === '.css' || f.extension === '.js')) return 'web';
  if (paths.some(p => p.endsWith('requirements.txt') || p.endsWith('pyproject.toml')) || files.some(f => f.extension === '.py')) return 'python';
  return 'auto';
}

function swapExtensionToTxt(fileName) {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return fileName + '.txt';
  return fileName.slice(0, lastDot) + '.txt';
}

// CLI entry point
function main() {
  const args = process.argv.slice(2);
  const sourceDir = args[0];
  const mode = args[1] || 'bundle'; // 'bundle' (default) or 'folder'
  const destDir = args[2] || path.join(process.cwd(), 'converted_output');

  if (!sourceDir) {
    console.log('\nUsage: node cli.js <source-directory> [mode: bundle|folder] [destination-directory]\n');
    process.exit(1);
  }

  if (!fs.existsSync(sourceDir)) {
    console.error(`Error: Source directory "${sourceDir}" does not exist.`);
    process.exit(1);
  }

  console.log(`Scanning project folder: "${sourceDir}"...`);
  const allFiles = getFilesRecursive(sourceDir);
  
  if (allFiles.length === 0) {
    console.log('No valid code/text files found.');
    process.exit(0);
  }

  const preset = detectPreset(allFiles);
  console.log(`Auto-detected project type: ${preset.toUpperCase()}`);
  
  // Filter files by preset
  const allowedExtensions = PRESETS[preset];
  const filteredFiles = allowedExtensions 
    ? allFiles.filter(f => allowedExtensions.includes(f.extension))
    : allFiles;

  console.log(`Found ${filteredFiles.length} files to convert.`);

  if (mode === 'bundle') {
    // Export as single file bundle
    let bundleText = '';
    for (const file of filteredFiles) {
      const content = fs.readFileSync(file.absolutePath, 'utf8');
      bundleText += `\n================================================================\n`;
      bundleText += `FILE: ${file.relativePath}\n`;
      bundleText += `================================================================\n\n`;
      bundleText += content;
      bundleText += `\n`;
    }

    const bundlePath = path.join(process.cwd(), `project_code_bundle_${Date.now()}.txt`);
    fs.writeFileSync(bundlePath, bundleText.trim(), 'utf8');
    console.log(`\nSuccess! Single bundle created at:\n👉 ${bundlePath}\n`);
  } else {
    // Export as folder
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    let copied = 0;
    for (const file of filteredFiles) {
      const content = fs.readFileSync(file.absolutePath, 'utf8');
      const newName = swapExtensionToTxt(file.name);
      
      const relativeFolder = path.dirname(file.relativePath);
      const targetFolder = path.join(destDir, relativeFolder);
      
      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
      }
      
      const targetPath = path.join(targetFolder, newName);
      fs.writeFileSync(targetPath, content, 'utf8');
      copied++;
    }
    console.log(`\nSuccess! Copied ${copied} files to:\n👉 ${destDir}\n`);
  }
}

main();
