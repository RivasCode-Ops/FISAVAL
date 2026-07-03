#!/usr/bin/env node
/**
 * Reseta dados demo da API (JSON) e orienta limpeza do IndexedDB no navegador.
 * Uso: npm run reset:demo
 */
import { existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apiData = join(root, 'api', 'data');

const paths = [
  join(apiData, 'fisaval.json'),
  join(apiData, 'audit-log.json'),
  join(apiData, 'push-subs.json'),
  join(apiData, 'tenants', 'demo', 'fisaval.json'),
  join(apiData, 'tenants', 'demo', 'audit-log.json'),
  join(apiData, 'tenants', 'demo', 'push-subs.json'),
];

let removed = 0;
for (const p of paths) {
  if (existsSync(p)) {
    rmSync(p, { force: true });
    console.log('Removido:', p);
    removed++;
  }
}

console.log('');
if (removed === 0) {
  console.log('Nenhum arquivo JSON da API encontrado (já estava limpo).');
} else {
  console.log(`${removed} arquivo(s) da API removido(s). Reinicie a API para recriar o seed demo.`);
}

console.log('');
console.log('IndexedDB (app no navegador):');
console.log('  1. Abra http://127.0.0.1:5192/?resetDemo=1 (modo dev) — limpa e recarrega');
console.log('  2. Ou DevTools > Application > IndexedDB > fisaval > botão Delete');
console.log('  3. Faça login de novo (gestor@demo / demo123)');
console.log('');
console.log('Depois: npm run dev:all e valide D-1043 + OS-8821 no Painel.');
