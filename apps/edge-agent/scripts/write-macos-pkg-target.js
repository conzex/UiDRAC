#!/usr/bin/env node
/** Pick node20-macos-arm64 or node20-macos-x64 for @yao-pkg/pkg on this host. */
const { writeFileSync } = require('fs');
const { join } = require('path');
const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
const target = `node20-macos-${arch}`;
writeFileSync(join(__dirname, '..', 'macos', '.pkg-target'), target, 'utf8');
console.log('[edge-agent] pkg target:', target);
