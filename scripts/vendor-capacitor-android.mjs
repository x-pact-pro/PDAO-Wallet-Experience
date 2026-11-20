import { cp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modules = [
  ['@capacitor/android/capacitor', 'capacitor-android'],
  ['@capacitor/app/android', 'capacitor-app'],
  ['@capacitor/browser/android', 'capacitor-browser'],
  ['@capacitor/splash-screen/android', 'capacitor-splash-screen'],
];

for (const [sourceRelative, destinationName] of modules) {
  const source = path.join(root, 'node_modules', sourceRelative);
  const destination = path.join(root, 'android', destinationName);
  await mkdir(destination, { recursive: true });
  await cp(path.join(source, 'build.gradle'), path.join(destination, 'build.gradle'));
  await cp(path.join(source, 'src'), path.join(destination, 'src'), { recursive: true });

  const packageRoot = path.dirname(source);
  await cp(path.join(packageRoot, 'LICENSE'), path.join(destination, 'LICENSE'));

  for (const optionalFile of ['proguard-rules.pro', 'lint.xml', 'lint-baseline.xml']) {
    try {
      await cp(path.join(source, optionalFile), path.join(destination, optionalFile));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

const settings = modules
  .map(([, name]) => `include ':${name}'\nproject(':${name}').projectDir = new File('./${name}')`)
  .join('\n\n');
await writeFile(path.join(root, 'android', 'capacitor.settings.gradle'), `${settings}\n`);

console.log(`Vendored ${modules.length} Capacitor Android projects into android/.`);
