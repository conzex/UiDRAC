#!/usr/bin/env node
/**
 * Bundle edge-agent for macOS (single CJS file, requires system Node 20+).
 * Copyright (c) 2026 Conzex Global Private Limited
 */
import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, '..', 'macos', 'agent-bundle.cjs');

await esbuild.build({
  entryPoints: [path.join(__dirname, '..', 'src', 'index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: out,
  sourcemap: false,
  logLevel: 'info',
});

console.log('[edge-agent] macOS bundle:', out);
