#!/usr/bin/env node
/** Bundle edge-agent for macOS + Windows (Node 20+). Copyright (c) 2026 Conzex Global Private Limited */
import * as esbuild from 'esbuild';
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const entry = path.join(root, 'src', 'index.ts');
const outs = [
  path.join(root, 'macos', 'agent-bundle.cjs'),
  path.join(root, 'windows', 'agent-bundle.cjs'),
];

for (const out of outs) {
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: out,
    sourcemap: false,
    logLevel: 'info',
  });
  console.log('[edge-agent] bundle:', out);
}

const winCmd = `@echo off\r\ncd /d "%~dp0"\r\nnode "%~dp0agent-bundle.cjs"\r\n`;
fs.writeFileSync(path.join(root, 'windows', 'run-uidrac-agent.cmd'), winCmd, 'utf8');
console.log('[edge-agent] windows launcher: run-uidrac-agent.cmd');
