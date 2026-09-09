import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SHOPCO_DIR = join(ROOT, 'shopco');
const WIDGET_SRC = join(ROOT, 'src');
const WIDGET_DEST = join(SHOPCO_DIR, 'src', 'duplex-widget');
const PATCHES_DIR = join(__dirname, 'shopco-patches');
const SHOPCO_REPO = 'https://github.com/mohammadoftadeh/next-ecommerce-shopco.git';

const FILE_PATCHES = [
  ['src/app/providers.tsx', 'providers.tsx'],
  ['src/components/common/ProductCard.tsx', 'ProductCard.tsx'],
  ['src/components/common/ProductPrice.tsx', 'ProductPrice.tsx'],
  ['src/components/product-page/Header/AddToCartBtn.tsx', 'AddToCartBtn.tsx'],
  ['src/components/product-page/Header/PhotoSection.tsx', 'PhotoSection.tsx'],
  ['src/data/catalog.ts', 'catalog.ts'],
  ['src/lib/formatPrice.ts', 'formatPrice.ts'],
  ['src/lib/productPaths.ts', 'productPaths.ts'],
];

function log(step, message) {
  console.log(`[setup-shopco] ${step}: ${message}`);
}

function run(command, cwd = ROOT) {
  execSync(command, { cwd, stdio: 'inherit', shell: true });
}

function ensureShopcoClone() {
  if (existsSync(join(SHOPCO_DIR, '.git'))) {
    log('clone', 'shopco/ already exists — skipping clone');
    return;
  }

  log('clone', `cloning ${SHOPCO_REPO}`);
  run(`git clone --depth 1 ${SHOPCO_REPO} "${SHOPCO_DIR}"`);
}

const REQUIRED_WIDGET_FILES = [
  'components/duplex-widget/ProductImageGlow.tsx',
  'components/duplex-widget/ProductMicButton.tsx',
  'components/duplex-widget/DuplexWidgetProvider.tsx',
];

function copyWidgetModule() {
  mkdirSync(join(SHOPCO_DIR, 'src'), { recursive: true });
  cpSync(WIDGET_SRC, WIDGET_DEST, { recursive: true, force: true });
  log('copy', 'widget module copied to shopco/src/duplex-widget');

  for (const relativePath of REQUIRED_WIDGET_FILES) {
    const destPath = join(WIDGET_DEST, relativePath);
    if (!existsSync(destPath)) {
      throw new Error(
        `[setup-shopco] missing widget file after copy: ${relativePath}. ` +
          'Ensure it exists in src/ before patching Shopco.',
      );
    }
  }
}

function applyPatch(relativeTargetPath, patchFileName) {
  const targetPath = join(SHOPCO_DIR, relativeTargetPath);
  const patchPath = join(PATCHES_DIR, patchFileName);

  if (!existsSync(patchPath)) {
    log('skip', `patch missing: ${patchFileName}`);
    return;
  }

  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, readFileSync(patchPath, 'utf8'), 'utf8');
  log('patch', relativeTargetPath);
}

function applyFilePatches() {
  for (const [target, patch] of FILE_PATCHES) {
    applyPatch(target, patch);
  }
}

function applyDuplexNavigationBridge() {
  const targetPath = join(SHOPCO_DIR, 'src', 'components', 'duplex', 'DuplexNavigationBridge.tsx');
  const patchPath = join(PATCHES_DIR, 'DuplexNavigationBridge.tsx');

  if (!existsSync(patchPath)) {
    log('skip', 'DuplexNavigationBridge patch missing');
    return;
  }

  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, readFileSync(patchPath, 'utf8'), 'utf8');
  log('patch', 'src/components/duplex/DuplexNavigationBridge.tsx');
}

function patchProductDetailImports() {
  const pagePath = join(SHOPCO_DIR, 'src', 'app', 'shop', 'product', '[...slug]', 'page.tsx');
  const legacyPagePath = join(SHOPCO_DIR, 'src', 'app', 'shop', 'product', '[id]', 'page.tsx');
  const targetPath = existsSync(pagePath) ? pagePath : legacyPagePath;

  if (!existsSync(targetPath)) {
    log('skip', 'product detail page not found — glow wired via PhotoSection patch');
    return;
  }

  let content = readFileSync(targetPath, 'utf8');

  if (content.includes('@/data/catalog')) {
    log('patch', 'product detail page already uses @/data/catalog');
    return;
  }

  content = content.replace(
    /from "@\/app\/page"/g,
    'from "@/data/catalog"',
  );

  writeFileSync(targetPath, content, 'utf8');
  log('patch', 'product detail page imports -> @/data/catalog');
}

function patchTailwindDuplexWidget() {
  const configPath = join(SHOPCO_DIR, 'tailwind.config.ts');

  if (!existsSync(configPath)) {
    log('skip', 'tailwind.config.ts not found');
    return;
  }

  let content = readFileSync(configPath, 'utf8');
  const marker = './src/duplex-widget/**/*.{js,ts,jsx,tsx,mdx}';

  if (content.includes(marker)) {
    log('patch', 'tailwind already scans duplex-widget');
    return;
  }

  content = content.replace(
    /("\.\/src\/app\/\*\*\/\*\.{js,ts,jsx,tsx,mdx}",)/,
    `$1\n    "${marker}",`,
  );

  writeFileSync(configPath, content, 'utf8');
  log('patch', 'tailwind.config.ts -> duplex-widget content path');
}

function patchGlobalsGlow() {
  const globalsPath = join(SHOPCO_DIR, 'src', 'styles', 'globals.css');
  const snippetPath = join(PATCHES_DIR, 'globals-duplex-glow.css');

  if (!existsSync(globalsPath) || !existsSync(snippetPath)) {
    log('skip', 'globals.css glow patch skipped');
    return;
  }

  const globals = readFileSync(globalsPath, 'utf8');

  if (globals.includes('duplex-product-glow')) {
    log('patch', 'globals.css already has duplex glow');
    return;
  }

  const snippet = readFileSync(snippetPath, 'utf8');
  writeFileSync(globalsPath, `${globals.trimEnd()}\n${snippet}`, 'utf8');
  log('patch', 'globals.css -> duplex glow animation');
}

function writeEnvLocal() {
  const envPath = join(SHOPCO_DIR, '.env.local');
  const envContent = ['NEXT_PUBLIC_DUPLEX_WS_URL=ws://localhost:8787', ''].join('\n');

  writeFileSync(envPath, envContent, 'utf8');
  log('env', '.env.local written');
}

function ensureTsPathAlias() {
  const tsconfigPath = join(SHOPCO_DIR, 'tsconfig.json');
  const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));

  tsconfig.compilerOptions.paths = {
    ...tsconfig.compilerOptions.paths,
    '@/*': ['./src/*'],
    '@/duplex-widget/*': ['./src/duplex-widget/*'],
  };

  writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`, 'utf8');
  log('tsconfig', 'path alias @/duplex-widget/* ensured');
}

function installDependencies() {
  log('install', 'running npm install inside shopco/');
  run('npm install', SHOPCO_DIR);
}

function main() {
  ensureShopcoClone();
  copyWidgetModule();
  applyFilePatches();
  applyDuplexNavigationBridge();
  patchProductDetailImports();
  patchTailwindDuplexWidget();
  patchGlobalsGlow();
  writeEnvLocal();
  ensureTsPathAlias();
  installDependencies();

  console.log('');
  console.log('Shopco Full-Duplex wiring complete.');
  console.log('');
  console.log('Visual automation applied:');
  console.log('  - ProductCard + PhotoSection glow (ProductImageGlow + highlightedProductId)');
  console.log('  - DuplexNavigationBridge (NAVIGATE_TO_PRODUCT -> router + highlight)');
  console.log('  - catalog.ts + productPaths.ts + globals glow CSS + tailwind scan');
  console.log('');
  console.log('Next steps:');
  console.log('  1) npm run orchestrator:dev');
  console.log('  2) npm --prefix shopco run dev');
  console.log('  3) Open http://localhost:3000/shop and say "tunjukin celana pendek"');
}

main();
