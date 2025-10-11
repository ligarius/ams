const path = require('node:path');
const tsConfig = require('./tsconfig.json');
const tsconfigPaths = require('tsconfig-paths');

const compilerOptions = tsConfig.compilerOptions ?? {};
const outDir = compilerOptions.outDir ?? 'dist';
const paths = compilerOptions.paths ?? {};

const distBaseUrl = path.resolve(__dirname, outDir);
const distPaths = Object.fromEntries(
  Object.entries(paths).map(([alias, targetPaths]) => [
    alias,
    targetPaths.map((targetPath) => {
      const cleaned = targetPath.replace(/^\.\//, '');
      if (cleaned.startsWith('src/')) {
        return cleaned.slice('src/'.length);
      }
      return cleaned;
    }),
  ]),
);

tsconfigPaths.register({
  baseUrl: distBaseUrl,
  paths: distPaths,
});
