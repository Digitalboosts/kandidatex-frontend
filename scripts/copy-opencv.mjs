// Serves opencv.js as a static file for the stream analyzer worker, so its 14 MB
// isn't bundled into the app and is only fetched when the live page opens.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const source = join(dirname(require.resolve('@techstark/opencv-js/package.json')), 'dist', 'opencv.js');
mkdirSync(join(root, 'public', 'vendor'), { recursive: true });
copyFileSync(source, join(root, 'public', 'vendor', 'opencv.js'));
