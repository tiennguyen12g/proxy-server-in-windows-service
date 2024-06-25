import type { ConfigEnv, UserConfig } from 'vite';
import { defineConfig, mergeConfig } from 'vite';
import { getBuildConfig, getBuildDefine, external, pluginHotRestart } from './vite.base.config';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';


// https://vitejs.dev/config
export default defineConfig((env) => {
  const forgeEnv = env as ConfigEnv<'build'>;
  const { forgeConfigSelf } = forgeEnv;
  const define = getBuildDefine(forgeEnv);
  const config: UserConfig = {
    build: {
      lib: {
        entry: forgeConfigSelf.entry!,
        fileName: () => '[name].js',
        formats: ['cjs'],
      },
      rollupOptions: {
        external,
        plugins: [
          {
            name: 'copy-proxy-server-file',
            generateBundle() {
              copyProxyServerFiles();
            },
          },
          nodeResolve(),
          commonjs()
        ],
      },
    },
    plugins: [pluginHotRestart('restart')],
    define,
    resolve: {
      // Load the Node.js entry.
      mainFields: ['module', 'jsnext:main', 'jsnext'],
    },
  };

  return mergeConfig(getBuildConfig(forgeEnv), config);
});


// Custom function to copy files to the build directory
const copyProxyServerFiles = () => {
  const sourceDir = resolve(__dirname, 'ManageProxyService');
  const destinationDir = resolve(__dirname, '.vite/build/ManageProxyService');

  // Ensure the destination directory exists
  mkdirSync(destinationDir, { recursive: true });

  // Copy all files from the source directory to the destination directory
  readdirSync(sourceDir).forEach(file => {
    const sourceFile = resolve(sourceDir, file);
    const destFile = resolve(destinationDir, file);
    copyFileSync(sourceFile, destFile);
  });
};