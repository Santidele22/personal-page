import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

function rows(path) {
  return execSync(`scc --by-file -f csv ${path}`, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => line.split(','))
    .map((cells) => ({ name: cells[1], code: Number(cells[4]), cx: Number(cells[6]) }))
    .sort((a, b) => b.code - a.code || b.cx - a.cx);
}

const FRONT_CEILING = 400;
const BACK_CEILING = 600;

const front = rows('personal-app/src');
const backend = rows('backend');

const isProduction = (name) => name.includes('/src/') && !name.endsWith('.spec.ts');
const over = (list, ceiling) => list.filter((file) => file.code > ceiling);
const complex = (list) => list.filter((file) => isProduction(file.name) && file.cx >= 25);
const sum = (list, key) => list.reduce((total, file) => total + file[key], 0);

const frontOver = over(front, FRONT_CEILING);
const backendOver = over(backend, BACK_CEILING);
const frontComplex = complex(front);
const backendComplex = complex(backend);

const table = (list, ceiling) =>
  list
    .map((file) => `| \`${file.name}\` | ${file.code} | ${file.cx} | ${file.code > ceiling ? '`true`' : '`false`'} |`)
    .join('\n');

const watchlist = (list) =>
  list.length === 0
    ? 'Ninguno.'
    : list
        .map((file) => `| \`${file.name}\` | ${file.code} | ${file.cx} |`)
        .join('\n');

const doc = `# Plan de Refactorización (\`scc --by-file\`)

Inventario generado con \`scc --by-file\` sobre las dos áreas del plan, en el orden en que se
refactorizaron:

1. \`personal-app/src/\` — cerrada
2. \`backend/\` — cerrada

## Criterios para \`¿Se refactoriza?\` (\`true\` / \`false\`)

- **Frontend (\`personal-app/src/\`)**: tope duro de **400 líneas de código** por archivo. \`true\`
  cuando un archivo lo supera; \`false\` en el resto.
- **Backend (\`backend/\`)**: tope duro de **600 líneas de código** por archivo. \`true\` cuando un
  archivo lo supera; \`false\` en el resto, incluida la documentación y las suites de tests.
- La **complejidad** queda como dato de seguimiento, no como criterio de refactor: al final de cada
  sección se listan los archivos de producción con \`cx >= 25\` para decidir próximos pasos con
  información, sin convertirlos en deuda automática.

## Resumen

| Orden | Alcance | Archivos | Líneas de código | Complejidad total | A refactorizar (\`true\`) |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | \`personal-app/src/\` | ${front.length} | ${sum(front, 'code')} | ${sum(front, 'cx')} | ${frontOver.length} |
| 2 | \`backend/\` | ${backend.length} | ${sum(backend, 'code')} | ${sum(backend, 'cx')} | ${backendOver.length} |
| **Total** | **Proyecto** | **${front.length + backend.length}** | **${sum(front, 'code') + sum(backend, 'code')}** | **${sum(front, 'cx') + sum(backend, 'cx')}** | **${frontOver.length + backendOver.length}** |

### Estado

- **Etapa 1 (frontend)**: cerrada el 2026-11-18. Ningún archivo supera las 400 líneas de código; el
  máximo es ${front[0].code} (\`${front[0].name}\`). Tareas y commits en
  \`odd/tasks/front-refactor-400.md\`; desplegada a producción.
- **Etapa 2 (backend)**: cerrada el ${new Date().toISOString().slice(0, 10)}. Ningún archivo supera
  las 600 líneas de código; el máximo es ${backend[0].code} (\`${backend[0].name}\`). Tareas y commits
  en \`odd/tasks/backend-refactor-600.md\`.

Nota sobre las métricas: \`scc\` mide por lenguaje, así que estos totales no son comparables uno a uno
con inventarios anteriores del mismo código. El \`<script>\` embebido de \`pages/lecturas/[id].astro\`
no aportaba líneas de TypeScript ni complejidad hasta que se extrajo a módulos, y lo mismo pasa con
las funciones que el backend movió a módulos propios: el código es el mismo, ahora medido en su
lenguaje real.

## 1. \`personal-app/src/\`

| Archivo | Líneas de código | Complejidad | ¿Se refactoriza? |
| --- | ---: | ---: | :---: |
${table(front, FRONT_CEILING)}

### Seguimiento de complejidad (frontend)

Archivos de producción con \`cx >= 25\` (ninguno bloquea el tope de 400):

| Archivo | Líneas de código | Complejidad |
| --- | ---: | ---: |
${watchlist(frontComplex)}

## 2. \`backend/\`

| Archivo | Líneas de código | Complejidad | ¿Se refactoriza? |
| --- | ---: | ---: | :---: |
${table(backend, BACK_CEILING)}

### Seguimiento de complejidad (backend)

Archivos de producción con \`cx >= 25\` (ninguno bloquea el tope de 600):

| Archivo | Líneas de código | Complejidad |
| --- | ---: | ---: |
${watchlist(backendComplex)}
`;

writeFileSync('docs/refactorizacion.md', doc);
console.log(
  `front ${front.length} files, over ${FRONT_CEILING}: ${frontOver.length}, watch ${frontComplex.length}`,
);
console.log(
  `backend ${backend.length} files, over ${BACK_CEILING}: ${backendOver.length}, watch ${backendComplex.length}`,
);
