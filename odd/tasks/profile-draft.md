# Feature: profile-draft — Borrador del panel de perfil

Objetivo: guardar cambios del panel PERFIL como borrador sin publicarlos, con la misma
estrategia del diario y enviando solo los campos que cambiaron.
Branch: `feature/profile-draft` (desde main). Estrategia de entrega: `ask-on-risk`.
Test runner: backend `vitest run` (pnpm test, raíz backend/); frontend `pnpm astro check` + `pnpm exec tsc --noEmit` (desde personal-app/).

## Specs

Entidades / decisiones del parent (marcadas como decisión, no exigen usuario):

- **D1 Backend**: la base guarda el borrador como el diario (respuesta del usuario
  del 2026-11-03): tabla nueva singleton `profile_draft` con snapshot completo del
  contenido en una columna `json` (`content`) + `updatedAt`, portable entre
  PostgreSQL y SQLite. La tabla `profile` publicada no cambia.
- **D2 Endpoints** (todo bajo `ProfileController`, con `@Roles(['admin'])`):
  - `GET /profile/draft` → el borrador (`ProfileContent`) o `null`.
  - `PUT /profile/draft` → body parcial (`UpdateProfileDto`); merge sobre el
    borrador existente o, si no hay, sobre el contenido publicado; guarda y
    devuelve el borrador actualizado. Si el merge queda igual al publicado,
    borra el borrador y devuelve `null`.
  - `DELETE /profile/draft` → descarta el borrador.
  - `POST /profile/publish` → body parcial; upsert sobre la fila publicada
    (mismo merge de `PUT /profile`) + borra el borrador en la misma llamada;
    devuelve el contenido publicado nuevo.
- **D3 Frontend base de comparación**: si hay borrador, el form se precarga con él;
  el baseline para "Guardar borrador" es el borrador; el body de "Publicar" se
  calcula con `changedProfileFields(published, form)` contra el estado publicado
  cargado al inicio, así cubre cambios guardados en borrador + no guardados.
- **D4 Botón "Descartar borrador"** en el banner cuando hay borrador, con
  confirmación; restaura el form desde el publicado.

S1 (petición original, verbatim): «Hoy [panel] no deja hacer pequeños cambios sin
publicarlo. por ejemplo estoy escribiendo una nueva bio. no puedo guardarla sin
publicarla.» → El panel PERFIL debe poder guardar el estado editado sin que la web
pública cambie. Criterio: guardar como borrador solo toca la tabla de borradores;
`GET /profile` público sigue devolviendo lo publicado.

S2: «la misma estrategia que en 'diario' que te deja guardar como borrador» → misma
mentalidad del editor de diario: botón **Guardar borrador** para guardar sin
publicar, y **Publicar** cuando quiero que la landing lo muestre.

S3: «en vez de guardar tooodo guardemos solo aquellos inputs que cambiaron» → tanto
Guardar borrador como Publicar envían solo los campos cambiados
(`changedProfileFields`), el backend hace merge parcial.

S4: corrección del usuario: «No solamente agregale un boton que diga 'Guardar
Borrador' o 'Publicar'» → no reestructurar el panel: se agrega el botón de borrador
y el botón de guardado pasa a llamarse **Publicar**; el flujo existente compara
contra `savedForm` como hoy.

S5: borrador persistente en la base (decisión del usuario): sobrevive recargas,
sesiones y dispositivos; es contenido privado del admin (las rutas de borrador
exigen sesión admin; la pública nunca lo lee).

S6: textos y feedback del panel en español, estados reales (carga, éxito, error);
no simular éxito del backend.

## Tasks

- T1 · S5/D1 · backend: entidad `ProfileDraft` (singleton, `content` json +
  `updatedAt`) y registro en `ProfileModule`. → commit (impl)
- T2 · S1–S3/S5/D2 · backend: métodos de servicio (`findDraft`, `upsertDraft`,
  `publishProfileChanges`, `discardDraft`) + rutas del controller + tests en
  `profile.service.spec.ts`. → commit (impl)
- T3 · S3/S5 · frontend: helpers en `features/profile/api/profile.ts`
  (`fetchProfileDraft`, `saveProfileDraft`, `publishProfileChanges`,
  `discardProfileDraft`). → commit (impl)
- T4 · S1–S4/S6/D3/D4 · frontend: `ProfileEditorPanel` — carga de borrador,
  banner, botones Guardar borrador / Publicar, Descartar con confirmación,
  feedbacks. → commit (impl)
- T5 · infra: verificar cómo la tabla nueva llega a producción (DB_MODE=prod no
  sincroniza; mirar el flujo de deploy de las tablas previas) y documentar el paso
  si hace falta. → commit (docs si aplica)
- T6 · verificación obligatoria del AGENTS.md: build, astro check, tsc, tests
  backend, peticiones reales en dev. → evidencia

## Log

- L1 (2026-11-03) — pedido original verbatim: «Vamos a agregarle esta feature a el
  panel: Hoy [Image 1] no deja hacer pequeños cambios sin publicarlo. por ejemplo
  estoy escribiendo una nueva bio. no puedo guardarla sin publicarla. entonces vamos
  a hacer la misma estrategia que en "diario" que te deja guardar como borrador. y
  vamos a usar la mismas estrategia que estamos usando ahora para que en vez de
  guardar tooodo guardemos solo aquellos inputs que cambiaram»
- L2 (2026-11-03) — corrección verbatim: «No solamente agregale un boton que diga
  "Guardar Borrador" o "Publicar"» → alcance mínimo, sin rediseño del panel.
- L3 (2026-11-03) — decisión de usuario: el borrador del perfil se guarda en la
  base, como diario (opción elegida del question tool).
- L4 (2026-11-03) — acotación de divergencia de repos detectada durante T1: el
  monorepo del root ignora `/backend/` (repo git anidado en
  `backend/`, rama `feature/profile-draft`); el frontend vive en el repo root
  (misma rama). Commits separados por repo.
- L5 (2026-11-03) — T1 ✅ T2 ✅ backend: entidad `profile_draft` + rutas
  draft/publish + tests. Verificación: `pnpm vitest run src/profile` 16/16 y
  suite completa 244/244 PASS. Commit backend `0505049`.
- L6 (2026-11-03) — T3 ✅ T4 ✅ frontend: helpers + panel con banner, botones
  «Guardar borrador»/«Publicar», diálogo de descarte y feedbacks. `astro check`
  0 errores, `tsc --noEmit` exit 0, `pnpm build` OK, suite `src/features/profile`
  3/3 pass. Nota: al guardar, el gestor refresca el borrador con un `GET`
  porque los helpers mutadores existen con retorno `void` (no se toca
  `shared/api/http.ts`, que tiene otro WIP sin commit de otra sesión). Commit
  root `814911c`.
- L7 (2026-11-03) — T5 ✅: prod no sincroniza; se creó el re-sync aditivo
  `backend/src/database/sync-schema.ts` + README (commit backend `072426b`);
  `migrate-local-content` ahora incluye `ProfileDraft`. Paso manual pendiente
  del dueño al deployar (ver «Next step»).
- L8 (2026-11-03) — T6 ✅ verificación con peticiones reales contra la API dev
  (`pnpm start:dev`, AUTH_MODE=dev, DB_MODE=dev): 401 en draft sin sesión ✔;
  `PUT /profile/draft` con un solo campo → snapshot completo ✔; el público
  nunca lee el borrador ✔; `POST /profile/publish` aplica y limpia el
  borrador ✔; guardar un borrador idéntico al publicado lo limpia ✔;
  `DELETE /profile/draft` descarta ✔. Quirk observado: el body de una
  respuesta `null` (sin borrador) llega vacío, no literal `null`; el frontend
  lo absorbe (`catch → null`) en ambos puntos de lectura. Estado local
  restaurado al final (name repuesto, borrador eliminado, servidor parado y
  temporales borrados).

**Next step (decisión del dueño, no bloquea el código):** al deployar, correr
el re-sync aditivo contra prod documentado en el README del backend
(`DATABASE_URL_UNPOOLED=... node dist/database/sync-schema.js`) para crear
`profile_draft` — DDL en prod, queda a cargo del dueño. Pendiente también:
merge de las dos ramas `feature/profile-draft` (root y backend) bajo su
política de entrega normal.
