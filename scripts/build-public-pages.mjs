import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, extname, isAbsolute, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(root, 'deploy/public-pages.txt');
const blockedMediaHashPath = resolve(root, 'deploy/quarantined-media-sha256.txt');
const outputRoot = resolve(root, '_site');

const blockedPrefixes = [
  '.git/',
  '.github/',
  '.understand-anything/',
  'deploy/',
  'docs/',
  'plans/',
  'research/',
  'scripts/',
  'tests/',
];
const blockedFragments = [
  /customer-uploaded plan corpus/i,
  /private source plan \(on file\)/i,
  /cleaned-review corpus/i,
  /source_reference/i,
  /teacher_layout_count/i,
];
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.svg', '.txt', '.xml']);

function fail(message) {
  throw new Error(`Public Pages build rejected: ${message}`);
}

const blockedMediaHashLines = (await readFile(blockedMediaHashPath, 'utf8'))
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));
if (!blockedMediaHashLines.length || blockedMediaHashLines.some((hash) => !/^[a-f0-9]{64}$/.test(hash))) {
  fail('quarantined-media SHA-256 denylist is empty or malformed');
}
const blockedPublicAssetSha256 = new Set(blockedMediaHashLines);
if (blockedPublicAssetSha256.size !== blockedMediaHashLines.length) {
  fail('quarantined-media SHA-256 denylist contains duplicates');
}

function inside(parent, candidate) {
  const rel = relative(parent, candidate);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

function normaliseManifestEntry(raw) {
  const value = raw.trim();
  if (!value || value.startsWith('#')) return null;
  if (value.includes('\\') || isAbsolute(value) || value.startsWith('/')) {
    fail(`invalid manifest path: ${value}`);
  }
  const clean = posix.normalize(value);
  if (clean !== value || clean === '..' || clean.startsWith('../')) {
    fail(`non-canonical manifest path: ${value}`);
  }
  if (blockedPrefixes.some((prefix) => clean === prefix.slice(0, -1) || clean.startsWith(prefix))) {
    fail(`blocked path requested by manifest: ${value}`);
  }
  return clean;
}

async function walk(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) fail(`symbolic link in artifact: ${relative(outputRoot, absolute)}`);
    if (entry.isDirectory()) found.push(...await walk(absolute));
    else if (entry.isFile()) found.push(absolute);
    else fail(`unsupported artifact entry: ${relative(outputRoot, absolute)}`);
  }
  return found;
}

function localReference(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.includes('{{')) return null;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(trimmed)) return null;
  const pathOnly = trimmed.split('#', 1)[0].split('?', 1)[0];
  if (!pathOnly) return null;
  try {
    return decodeURIComponent(pathOnly);
  } catch {
    fail(`invalid URL encoding in local reference: ${value}`);
  }
}

function referencesFor(file, source) {
  const refs = [];
  const assetPatterns = [
    /(?:^|\s)(?:src|href)\s*=\s*["']([^"']+)["']/gim,
    /url\(\s*["']?([^"')]+)["']?\s*\)/g,
  ];
  const modulePatterns = [
    /\b(?:import|export)\b\s+(?:[^'";]+?\s+from\s+)?["']([^"']+)["']/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of assetPatterns) {
    for (const match of source.matchAll(pattern)) {
      const ref = localReference(match[1]);
      if (ref) refs.push({ file, ref });
    }
  }
  for (const pattern of modulePatterns) {
    for (const match of source.matchAll(pattern)) {
      if (!match[1].startsWith('.') && !match[1].startsWith('/')) continue;
      const ref = localReference(match[1]);
      if (ref) refs.push({ file, ref });
    }
  }
  return refs;
}

const manifest = (await readFile(manifestPath, 'utf8'))
  .split(/\r?\n/)
  .map(normaliseManifestEntry)
  .filter(Boolean);

if (!manifest.length) fail('manifest is empty');
if (new Set(manifest).size !== manifest.length) fail('manifest contains duplicate paths');
if (outputRoot !== resolve(root, '_site')) fail('unexpected output directory');

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const canonicalRoot = await realpath(root);
for (const entry of manifest) {
  const source = resolve(root, entry);
  const destination = resolve(outputRoot, entry);
  if (!inside(root, source) || !inside(outputRoot, destination)) fail(`path escaped build root: ${entry}`);
  const stat = await lstat(source).catch(() => null);
  if (!stat) fail(`manifest file does not exist: ${entry}`);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`manifest entry is not a regular file: ${entry}`);
  const canonicalSource = await realpath(source);
  if (!inside(canonicalRoot, canonicalSource)) fail(`source resolves outside repository: ${entry}`);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

const artifactFiles = await walk(outputRoot);
const artifactSet = new Set(artifactFiles.map((file) => relative(outputRoot, file).split(sep).join('/')));
const references = [];

for (const file of artifactFiles) {
  const publicPath = relative(outputRoot, file).split(sep).join('/');
  if (blockedPrefixes.some((prefix) => publicPath.startsWith(prefix))) fail(`blocked artifact path: ${publicPath}`);
  const contents = await readFile(file);
  const sha256 = createHash('sha256').update(contents).digest('hex');
  if (blockedPublicAssetSha256.has(sha256)) fail(`unverified-publication asset in ${publicPath}`);
  if (!textExtensions.has(extname(file).toLowerCase())) continue;
  const source = contents.toString('utf8');
  if (extname(file).toLowerCase() === '.html' && /(?:^|\s)(?:src|srcset|poster|href|action|formaction)\s*=\s*["'][^"']*\{\{/im.test(source)) {
    fail(`browser-fetching attribute contains an unhydrated template in ${publicPath}`);
  }
  for (const blocked of blockedFragments) {
    if (blocked.test(source)) fail(`customer/research-derived marker in ${publicPath}: ${blocked}`);
  }
  references.push(...referencesFor(publicPath, source));
}

for (const { file, ref } of references) {
  const target = ref.startsWith('/')
    ? posix.normalize(ref.slice(1) || 'index.html')
    : posix.normalize(posix.join(posix.dirname(file), ref));
  if (target === '..' || target.startsWith('../')) fail(`reference escapes artifact from ${file}: ${ref}`);
  if (!artifactSet.has(target)) fail(`missing local dependency from ${file}: ${ref} -> ${target}`);
}

console.log(`Built privacy-scoped Pages artifact: ${artifactFiles.length} files from ${manifest.length} explicit entries.`);
