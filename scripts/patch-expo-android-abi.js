const fs = require('fs');
const path = require('path');

const targetPath = path.join(
  process.cwd(),
  'node_modules',
  'expo',
  'node_modules',
  '@expo',
  'cli',
  'build',
  'src',
  'run',
  'android',
  'resolveGradlePropsAsync.js'
);

if (!fs.existsSync(targetPath)) {
  console.warn('[patch-expo-android-abi] Expo CLI file not found, skipping patch.');
  process.exit(0);
}

const source = fs.readFileSync(targetPath, 'utf8');
const search = "    const validAbis = abis.filter((abi)=>VALID_ARCHITECTURES.includes(abi));\n    return validAbis.filter((abi, i, arr)=>arr.indexOf(abi) === i).join(',');\n";
const replacement = "    const validAbis = abis.filter((abi)=>VALID_ARCHITECTURES.includes(abi)).filter((abi, i, arr)=>arr.indexOf(abi) === i);\n    const preferredAbi = validAbis.find((abi)=>abi === 'x86_64') ?? validAbis.find((abi)=>abi === 'arm64-v8a') ?? validAbis[0] ?? '';\n    return preferredAbi;\n";

if (source.includes(replacement)) {
  console.log('[patch-expo-android-abi] Patch already applied.');
  process.exit(0);
}

if (!source.includes(search)) {
  console.warn('[patch-expo-android-abi] Expected source block not found, skipping patch.');
  process.exit(0);
}

fs.writeFileSync(targetPath, source.replace(search, replacement));
console.log('[patch-expo-android-abi] Patched Expo Android ABI selection to a single preferred ABI.');

