#!/usr/bin/env node
import { defineCommand, runMain } from 'citty';
import { analyzeCommand } from './commands/analyze.js';
import { verifyCommand } from './commands/verify.js';

const main = defineCommand({
  meta: {
    name: 'strapishift',
    version: '0.1.0',
    description: 'StrapiShift — Strapi v3 → v5 migration analysis CLI',
  },
  subCommands: {
    analyze: analyzeCommand,
    verify: verifyCommand,
  },
});

runMain(main);
