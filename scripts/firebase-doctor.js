const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const appJsonPath = path.join(rootDir, 'app.json');
const rootGoogleServicesPath = path.join(rootDir, 'google-services.json');
const androidGoogleServicesPath = path.join(rootDir, 'android', 'app', 'google-services.json');
const debugKeystorePath = path.join(rootDir, 'android', 'app', 'debug.keystore');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeFingerprint(value) {
  return value.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
}

function formatFingerprint(hex) {
  return (hex.match(/.{1,2}/g) || []).join(':');
}

function getAppConfig() {
  const appJson = readJson(appJsonPath);
  const expo = appJson.expo ?? {};
  const android = expo.android ?? {};

  return {
    packageName: android.package ?? null,
    googleServicesFile: android.googleServicesFile ?? null,
  };
}

function getGoogleServicesSummary(filePath) {
  const json = readJson(filePath);
  const client = json.client?.[0];
  const packageName = client?.client_info?.android_client_info?.package_name ?? null;
  const sha1Entries = (client?.oauth_client ?? [])
    .filter((entry) => entry.client_type === 1 && entry.android_info?.certificate_hash)
    .map((entry) => normalizeFingerprint(entry.android_info.certificate_hash));

  return {
    packageName,
    sha1Entries,
  };
}

function getKeystoreFingerprints() {
  const javaHomeKeytool = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'keytool.exe') : null;
  const fallbackKeytool = path.join('C:', 'Program Files', 'Android', 'Android Studio', 'jbr', 'bin', 'keytool.exe');
  const keytoolPath =
    (javaHomeKeytool && fs.existsSync(javaHomeKeytool) && javaHomeKeytool) ||
    (fs.existsSync(fallbackKeytool) && fallbackKeytool) ||
    'keytool';

  const result = spawnSync(
    keytoolPath,
    [
      '-list',
      '-v',
      '-alias',
      'androiddebugkey',
      '-keystore',
      debugKeystorePath,
      '-storepass',
      'android',
      '-keypass',
      'android',
    ],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) {
    return null;
  }

  const sha1Match = result.stdout.match(/SHA1:\s*([A-F0-9:]+)/i);
  const sha256Match = result.stdout.match(/SHA256:\s*([A-F0-9:]+)/i);

  if (!sha1Match || !sha256Match) {
    return null;
  }

  return {
    sha1: normalizeFingerprint(sha1Match[1]),
    sha256: normalizeFingerprint(sha256Match[1]),
  };
}

function printCheck(label, ok, details) {
  const status = ok ? 'OK' : 'FAIL';
  console.log(`[${status}] ${label}${details ? `: ${details}` : ''}`);
}

function main() {
  const appConfig = getAppConfig();
  const rootGoogle = getGoogleServicesSummary(rootGoogleServicesPath);
  const androidGoogle = getGoogleServicesSummary(androidGoogleServicesPath);
  const fingerprints = getKeystoreFingerprints();

  const expectedPath = './google-services.json';
  const packageName = appConfig.packageName;

  console.log('Firebase Doctor');
  console.log(`Package: ${packageName ?? '(missing)'}`);
  if (fingerprints) {
    console.log(`Debug SHA-1: ${formatFingerprint(fingerprints.sha1)}`);
    console.log(`Debug SHA-256: ${formatFingerprint(fingerprints.sha256)}`);
  } else {
    console.log('Debug SHA-1: (not read by script in this environment)');
    console.log('Debug SHA-256: (not read by script in this environment)');
  }
  console.log('');

  printCheck(
    'app.json android.googleServicesFile',
    appConfig.googleServicesFile === expectedPath,
    `current=${appConfig.googleServicesFile ?? '(missing)'}, expected=${expectedPath}`
  );

  printCheck(
    'Root google-services package name',
    rootGoogle.packageName === packageName,
    `current=${rootGoogle.packageName ?? '(missing)'}`
  );

  printCheck(
    'Android google-services package name',
    androidGoogle.packageName === packageName,
    `current=${androidGoogle.packageName ?? '(missing)'}`
  );

  if (fingerprints) {
    const keystoreSha1 = fingerprints.sha1;

    printCheck(
      'Root google-services has current debug SHA-1',
      rootGoogle.sha1Entries.includes(keystoreSha1),
      rootGoogle.sha1Entries.length
        ? rootGoogle.sha1Entries.map(formatFingerprint).join(', ')
        : 'no Android SHA-1 entries found'
    );

    printCheck(
      'android/app google-services has current debug SHA-1',
      androidGoogle.sha1Entries.includes(keystoreSha1),
      androidGoogle.sha1Entries.length
        ? androidGoogle.sha1Entries.map(formatFingerprint).join(', ')
        : 'no Android SHA-1 entries found'
    );
  } else {
    printCheck(
      'Root google-services Android SHA-1 entries found',
      rootGoogle.sha1Entries.length > 0,
      rootGoogle.sha1Entries.length
        ? rootGoogle.sha1Entries.map(formatFingerprint).join(', ')
        : 'no Android SHA-1 entries found'
    );

    printCheck(
      'android/app google-services Android SHA-1 entries found',
      androidGoogle.sha1Entries.length > 0,
      androidGoogle.sha1Entries.length
        ? androidGoogle.sha1Entries.map(formatFingerprint).join(', ')
        : 'no Android SHA-1 entries found'
    );
  }

  printCheck(
    'Root and android/app google-services files match',
    JSON.stringify(rootGoogle) === JSON.stringify(androidGoogle),
    'replace both files together after each Firebase download'
  );

  console.log('');
  console.log('Manual Firebase Console checks still required:');
  if (fingerprints) {
    console.log(`- Add SHA-1 in Firebase Console: ${formatFingerprint(fingerprints.sha1)}`);
    console.log(`- Add SHA-256 in Firebase Console: ${formatFingerprint(fingerprints.sha256)}`);
  } else {
    console.log('- Read SHA values manually with:');
    console.log('  cmd /c keytool -list -v -alias androiddebugkey -keystore android\\app\\debug.keystore -storepass android -keypass android');
  }
  console.log('- Download a fresh google-services.json after saving fingerprints');
  console.log('- Uninstall the old app from the device/emulator before reinstalling after keystore changes');
}

try {
  main();
} catch (error) {
  console.error('[FAIL] Firebase Doctor could not complete');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
