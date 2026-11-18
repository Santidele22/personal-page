# Plan de Refactorización (`scc --by-file`)

Inventario generado con `scc --by-file` sobre las dos áreas del plan, en el orden en que se
refactorizaron:

1. `personal-app/src/` — cerrada
2. `backend/` — cerrada

## Criterios para `¿Se refactoriza?` (`true` / `false`)

- **Frontend (`personal-app/src/`)**: tope duro de **400 líneas de código** por archivo. `true`
  cuando un archivo lo supera; `false` en el resto.
- **Backend (`backend/`)**: tope duro de **600 líneas de código** por archivo. `true` cuando un
  archivo lo supera; `false` en el resto, incluida la documentación y las suites de tests.
- La **complejidad** queda como dato de seguimiento, no como criterio de refactor: al final de cada
  sección se listan los archivos de producción con `cx >= 25` para decidir próximos pasos con
  información, sin convertirlos en deuda automática.

## Resumen

| Orden | Alcance | Archivos | Líneas de código | Complejidad total | A refactorizar (`true`) |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | `personal-app/src/` | 355 | 28461 | 3264 | 0 |
| 2 | `backend/` | 253 | 18490 | 2746 | 0 |
| **Total** | **Proyecto** | **608** | **46951** | **6010** | **0** |

### Estado

- **Etapa 1 (frontend)**: cerrada el 2026-11-18. Ningún archivo supera las 400 líneas de código; el
  máximo es 369 (`personal-app/src/features/menu/MenuItemsEditorPanel.tsx`). Tareas y commits en
  `odd/tasks/front-refactor-400.md`; desplegada a producción.
- **Etapa 2 (backend)**: cerrada el 2026-11-18. Ningún archivo supera
  las 600 líneas de código; el máximo es 576 (`backend/src/books/reading/reading.xml-blocks.ts`). Tareas y commits
  en `odd/tasks/backend-refactor-600.md`.

Nota sobre las métricas: `scc` mide por lenguaje, así que estos totales no son comparables uno a uno
con inventarios anteriores del mismo código. El `<script>` embebido de `pages/lecturas/[id].astro`
no aportaba líneas de TypeScript ni complejidad hasta que se extrajo a módulos, y lo mismo pasa con
las funciones que el backend movió a módulos propios: el código es el mismo, ahora medido en su
lenguaje real.

## 1. `personal-app/src/`

| Archivo | Líneas de código | Complejidad | ¿Se refactoriza? |
| --- | ---: | ---: | :---: |
| `personal-app/src/features/menu/MenuItemsEditorPanel.tsx` | 369 | 52 | `false` |
| `personal-app/src/features/book/reader/reader-panels.css` | 365 | 9 | `false` |
| `personal-app/src/widgets/diario-editor/DiarioEditorPage.tsx` | 363 | 37 | `false` |
| `personal-app/src/widgets/recommendations/Recommendations.astro` | 324 | 12 | `false` |
| `personal-app/src/widgets/reading/renderItems.ts` | 320 | 35 | `false` |
| `personal-app/src/features/project/projectForm.test.ts` | 304 | 50 | `false` |
| `personal-app/src/widgets/admin/DiarioEditorPanel.tsx` | 296 | 39 | `false` |
| `personal-app/src/features/project/components/ProjectFields.tsx` | 288 | 19 | `false` |
| `personal-app/src/features/book/lib/codeHighlight.ts` | 276 | 19 | `false` |
| `personal-app/src/features/roadmap/roadmapForm.test.ts` | 273 | 33 | `false` |
| `personal-app/src/features/book/lib/displayItems.ts` | 252 | 24 | `false` |
| `personal-app/src/widgets/projects/Projects.astro` | 250 | 13 | `false` |
| `personal-app/src/widgets/about/WorkshopBenchArt.astro` | 249 | 16 | `false` |
| `personal-app/src/features/book/reader/reader-stage.css` | 238 | 5 | `false` |
| `personal-app/src/widgets/diario-editor/EditorPane.tsx` | 233 | 4 | `false` |
| `personal-app/src/features/book/lib/navigation.ts` | 227 | 20 | `false` |
| `personal-app/src/pages/roadmap.astro` | 225 | 20 | `false` |
| `personal-app/src/features/book/lib/displayItems.test.ts` | 223 | 14 | `false` |
| `personal-app/src/features/book/lib/toc.ts` | 218 | 22 | `false` |
| `personal-app/src/widgets/reading/scroll.ts` | 216 | 31 | `false` |
| `personal-app/src/widgets/hero/duneScene.ts` | 209 | 27 | `false` |
| `personal-app/src/features/book/lib/tocLines.ts` | 208 | 3 | `false` |
| `personal-app/src/shared/api/contentCache.test.ts` | 206 | 46 | `false` |
| `personal-app/src/shared/api/contentCache.ts` | 204 | 35 | `false` |
| `personal-app/src/features/ad-slot/advertisingPlanForm.test.ts` | 200 | 23 | `false` |
| `personal-app/src/features/ad-slot/brandForm.test.ts` | 198 | 31 | `false` |
| `personal-app/src/features/profile/ProfileEditorPanel.tsx` | 198 | 30 | `false` |
| `personal-app/src/widgets/reading/markActions.ts` | 197 | 12 | `false` |
| `personal-app/src/pages/api/[...path].ts` | 193 | 44 | `false` |
| `personal-app/src/widgets/reading/timer.ts` | 193 | 16 | `false` |
| `personal-app/src/widgets/reading/selection.ts` | 191 | 15 | `false` |
| `personal-app/src/app/styles/global.css` | 189 | 26 | `false` |
| `personal-app/src/features/service/serviceForm.test.ts` | 185 | 31 | `false` |
| `personal-app/src/features/profile/profileForm.test.ts` | 178 | 26 | `false` |
| `personal-app/src/features/ad-slot/BrandsEditorPanel.tsx` | 177 | 29 | `false` |
| `personal-app/src/widgets/reading/renderWindow.ts` | 176 | 21 | `false` |
| `personal-app/src/features/book/lib/headings.test.ts` | 176 | 14 | `false` |
| `personal-app/src/features/service/components/ServiceFields.tsx` | 176 | 13 | `false` |
| `personal-app/src/entities/admin/adapter.ts` | 175 | 41 | `false` |
| `personal-app/src/features/project/ProjectsEditorPanel.tsx` | 173 | 36 | `false` |
| `personal-app/src/features/service/ServicesEditorPanel.tsx` | 173 | 36 | `false` |
| `personal-app/src/features/ad-slot/AdvertisingPlansEditorPanel.tsx` | 169 | 28 | `false` |
| `personal-app/src/features/roadmap/RoadmapEditorPanel.tsx` | 168 | 32 | `false` |
| `personal-app/src/widgets/blog/ToolsBlock.astro` | 168 | 14 | `false` |
| `personal-app/src/widgets/reading/annotations.ts` | 161 | 21 | `false` |
| `personal-app/src/widgets/hero/duneGeometry.ts` | 161 | 13 | `false` |
| `personal-app/src/features/book/lib/displayModel.ts` | 159 | 14 | `false` |
| `personal-app/src/features/book/bookForm.test.ts` | 157 | 14 | `false` |
| `personal-app/src/widgets/hero/duneScribePass.ts` | 155 | 18 | `false` |
| `personal-app/src/features/book/lib/toc.test.ts` | 154 | 20 | `false` |
| `personal-app/src/features/profile/components/ProfileEditorSections.tsx` | 151 | 8 | `false` |
| `personal-app/src/middleware.ts` | 151 | 3 | `false` |
| `personal-app/src/widgets/reading/loadReading.ts` | 149 | 16 | `false` |
| `personal-app/src/features/ad-slot/components/BrandFields.tsx` | 146 | 14 | `false` |
| `personal-app/src/features/project/components/ProjectRowCard.tsx` | 143 | 5 | `false` |
| `personal-app/src/features/ad-slot/components/AdvertisingPlanFields.tsx` | 142 | 12 | `false` |
| `personal-app/src/features/book/api/books.test.ts` | 141 | 25 | `false` |
| `personal-app/src/features/auth/ResetPasswordForm.tsx` | 140 | 5 | `false` |
| `personal-app/src/features/book/lib/headings.ts` | 138 | 9 | `false` |
| `personal-app/src/entities/admin/types.ts` | 137 | 22 | `false` |
| `personal-app/src/features/recommendation/recommendationForm.test.ts` | 136 | 14 | `false` |
| `personal-app/src/features/roadmap/components/RoadmapEditorView.tsx` | 136 | 7 | `false` |
| `personal-app/src/features/ad-slot/components/BrandsEditorView.tsx` | 133 | 11 | `false` |
| `personal-app/src/features/roadmap/roadmapForm.ts` | 132 | 25 | `false` |
| `personal-app/src/features/profile/profileForm.ts` | 132 | 17 | `false` |
| `personal-app/src/widgets/contact/Contact.astro` | 132 | 8 | `false` |
| `personal-app/src/features/book/reader/reader-chrome.css` | 132 | 5 | `false` |
| `personal-app/src/features/book/api/books.ts` | 130 | 15 | `false` |
| `personal-app/src/features/ad-slot/components/AdvertisingPlansEditorView.tsx` | 129 | 11 | `false` |
| `personal-app/src/widgets/hero/duneGatePass.ts` | 129 | 6 | `false` |
| `personal-app/src/features/book/lib/noise.ts` | 128 | 10 | `false` |
| `personal-app/src/features/book/lib/prefs.ts` | 127 | 16 | `false` |
| `personal-app/src/widgets/about/aboutSection.ts` | 126 | 26 | `false` |
| `personal-app/src/features/service/components/ServiceRowCard.tsx` | 126 | 4 | `false` |
| `personal-app/src/features/book/BooksEditorPanel.tsx` | 125 | 19 | `false` |
| `personal-app/src/widgets/reading/Reading.astro` | 125 | 7 | `false` |
| `personal-app/src/shared/api/http.ts` | 124 | 26 | `false` |
| `personal-app/src/features/certificate/CertificadosEditorPanel.tsx` | 124 | 17 | `false` |
| `personal-app/src/features/book/lib/noise.test.ts` | 124 | 10 | `false` |
| `personal-app/src/features/book/lib/navigation.test.ts` | 123 | 16 | `false` |
| `personal-app/src/features/profile/components/ProfileEditorView.tsx` | 123 | 7 | `false` |
| `personal-app/src/features/service/components/ServicesEditorView.tsx` | 122 | 5 | `false` |
| `personal-app/src/widgets/hero/Hero.astro` | 120 | 13 | `false` |
| `personal-app/src/app/layouts/EditorLayout.astro` | 120 | 6 | `false` |
| `personal-app/src/widgets/reading/decks.ts` | 119 | 9 | `false` |
| `personal-app/src/features/profile/components/ProfileParagraphGroups.tsx` | 119 | 5 | `false` |
| `personal-app/src/features/ad-slot/components/BrandRowCard.tsx` | 117 | 6 | `false` |
| `personal-app/src/features/tool/toolForm.test.ts` | 115 | 17 | `false` |
| `personal-app/src/widgets/admin/AdminPostTable.astro` | 115 | 10 | `false` |
| `personal-app/src/features/ad-slot/components/AdvertisingPlanRowCard.tsx` | 115 | 6 | `false` |
| `personal-app/src/features/ad-slot/api/carrusel.ts` | 114 | 25 | `false` |
| `personal-app/src/widgets/diario-editor/MetadataDrawer.tsx` | 113 | 12 | `false` |
| `personal-app/src/features/project/components/ProjectsEditorView.tsx` | 113 | 5 | `false` |
| `personal-app/src/pages/lecturas/[id].astro` | 112 | 17 | `false` |
| `personal-app/src/features/recommendation/RecommendationsEditorPanel.tsx` | 109 | 17 | `false` |
| `personal-app/src/features/auth/LoginForm.tsx` | 108 | 13 | `false` |
| `personal-app/src/features/certificate/api/certificates.test.ts` | 107 | 25 | `false` |
| `personal-app/src/features/tool/ToolsEditorPanel.tsx` | 106 | 17 | `false` |
| `personal-app/src/shared/api/http.test.ts` | 104 | 30 | `false` |
| `personal-app/src/widgets/hero/duneMonolithPass.ts` | 103 | 12 | `false` |
| `personal-app/src/widgets/hero/duneSand.ts` | 103 | 8 | `false` |
| `personal-app/src/features/project/projectForm.ts` | 102 | 16 | `false` |
| `personal-app/src/widgets/reading/zen.ts` | 102 | 9 | `false` |
| `personal-app/src/features/certificate/certificateForm.test.ts` | 101 | 10 | `false` |
| `personal-app/src/entities/roadmap/data.ts` | 100 | 1 | `false` |
| `personal-app/src/shared/ui/Icon.astro` | 99 | 3 | `false` |
| `personal-app/src/features/certificate/components/CertificatesEditorView.tsx` | 98 | 4 | `false` |
| `personal-app/src/widgets/brands/Brands.astro` | 98 | 3 | `false` |
| `personal-app/src/shared/ui/admin/createAdminCrudState.test.ts` | 97 | 25 | `false` |
| `personal-app/src/entities/roadmap/format.test.ts` | 96 | 20 | `false` |
| `personal-app/src/features/book/lib/tocLines.test.ts` | 96 | 9 | `false` |
| `personal-app/src/widgets/reading/input.ts` | 96 | 2 | `false` |
| `personal-app/src/widgets/hero/duneScene.test.ts` | 94 | 13 | `false` |
| `personal-app/src/widgets/site-footer/SiteFooter.astro` | 94 | 8 | `false` |
| `personal-app/src/widgets/reading/status.ts` | 93 | 13 | `false` |
| `personal-app/src/shared/ui/PageLoader.astro` | 92 | 14 | `false` |
| `personal-app/src/features/book/lib/state.ts` | 91 | 9 | `false` |
| `personal-app/src/features/book/components/BooksEditorView.tsx` | 91 | 4 | `false` |
| `personal-app/src/features/tool/components/ToolsEditorView.tsx` | 88 | 4 | `false` |
| `personal-app/src/features/profile/components/ProfileFields.tsx` | 86 | 14 | `false` |
| `personal-app/src/pages/admin/publicidad.astro` | 86 | 8 | `false` |
| `personal-app/src/app/layouts/BlogPostLayout.astro` | 86 | 6 | `false` |
| `personal-app/src/entities/ad-slot/AdBand.astro` | 86 | 5 | `false` |
| `personal-app/src/features/project/api/projects.ts` | 85 | 12 | `false` |
| `personal-app/src/widgets/hero/duneStairsPass.ts` | 85 | 8 | `false` |
| `personal-app/src/features/book/components/BookFields.tsx` | 85 | 2 | `false` |
| `personal-app/src/features/ad-slot/advertisingPlanForm.ts` | 84 | 15 | `false` |
| `personal-app/src/entities/roadmap/format.ts` | 83 | 23 | `false` |
| `personal-app/src/widgets/admin/AdminSlotCard.astro` | 83 | 6 | `false` |
| `personal-app/src/widgets/blog/Blog.astro` | 83 | 4 | `false` |
| `personal-app/src/features/book/components/BookRowCard.tsx` | 83 | 4 | `false` |
| `personal-app/src/features/recommendation/components/RecommendationsEditorView.tsx` | 83 | 4 | `false` |
| `personal-app/src/features/book/reader/ReaderDecks.astro` | 82 | 5 | `false` |
| `personal-app/src/widgets/reading/chapterNav.ts` | 81 | 12 | `false` |
| `personal-app/src/widgets/hero/duneTerrainPass.ts` | 81 | 8 | `false` |
| `personal-app/src/widgets/hero/duneVectors.ts` | 80 | 10 | `false` |
| `personal-app/src/features/auth/api/serverSession.ts` | 79 | 17 | `false` |
| `personal-app/src/features/book/bookForm.ts` | 78 | 16 | `false` |
| `personal-app/src/features/book/lib/timers.ts` | 77 | 11 | `false` |
| `personal-app/src/features/book/lib/prefs.test.ts` | 76 | 17 | `false` |
| `personal-app/src/entities/book/types.ts` | 76 | 12 | `false` |
| `personal-app/src/pages/blog/index.astro` | 76 | 4 | `false` |
| `personal-app/src/features/book/lib/reader.ts` | 76 | 1 | `false` |
| `personal-app/src/widgets/admin/AdminSidebar.astro` | 75 | 5 | `false` |
| `personal-app/src/features/book/reader/reader-tokens.css` | 75 | 2 | `false` |
| `personal-app/src/features/roadmap/api/roadmap-admin.ts` | 74 | 18 | `false` |
| `personal-app/src/widgets/about/aboutSection.test.ts` | 74 | 9 | `false` |
| `personal-app/src/features/certificate/api/certificates-admin.ts` | 72 | 15 | `false` |
| `personal-app/src/features/certificate/components/CertificateRowCard.tsx` | 71 | 2 | `false` |
| `personal-app/src/features/certificate/api/certificates.ts` | 70 | 14 | `false` |
| `personal-app/src/features/blog/api/blogs.ts` | 70 | 10 | `false` |
| `personal-app/src/features/recommendation/components/RecommendationFields.tsx` | 70 | 2 | `false` |
| `personal-app/src/features/ad-slot/brandForm.ts` | 69 | 16 | `false` |
| `personal-app/src/features/book/lib/displayQueue.ts` | 69 | 5 | `false` |
| `personal-app/src/pages/lecturas.astro` | 69 | 4 | `false` |
| `personal-app/src/shared/ui/admin/AdminEditableRowCard.tsx` | 69 | 2 | `false` |
| `personal-app/src/widgets/reading/feedback.ts` | 69 | 2 | `false` |
| `personal-app/src/features/roadmap/api/roadmap.ts` | 68 | 13 | `false` |
| `personal-app/src/app/layouts/BaseLayout.astro` | 68 | 4 | `false` |
| `personal-app/src/features/project/api/projects.test.ts` | 67 | 16 | `false` |
| `personal-app/src/features/auth/api/session.ts` | 65 | 22 | `false` |
| `personal-app/src/features/book/api/books-admin.ts` | 65 | 14 | `false` |
| `personal-app/src/features/auth/api/serverSession.test.ts` | 65 | 13 | `false` |
| `personal-app/src/pages/admin/index.astro` | 65 | 6 | `false` |
| `personal-app/src/features/project/ProjectPurchaseDialog.tsx` | 65 | 4 | `false` |
| `personal-app/src/features/service/serviceForm.ts` | 64 | 11 | `false` |
| `personal-app/src/features/roadmap/components/RoadmapStageFields.tsx` | 64 | 2 | `false` |
| `personal-app/src/widgets/reading/prefs.ts` | 63 | 14 | `false` |
| `personal-app/src/pages/certificados.astro` | 63 | 4 | `false` |
| `personal-app/src/pages/proyectos.astro` | 63 | 4 | `false` |
| `personal-app/src/pages/servicios.astro` | 63 | 4 | `false` |
| `personal-app/src/shared/ui/admin/createAdminCrudState.ts` | 62 | 13 | `false` |
| `personal-app/src/features/diario-editor/lib/selection.test.ts` | 61 | 18 | `false` |
| `personal-app/src/widgets/about/About.astro` | 61 | 4 | `false` |
| `personal-app/src/features/admin/api/dashboards.ts` | 60 | 11 | `false` |
| `personal-app/src/features/mobile-navigation/MobileNavigation.tsx` | 60 | 4 | `false` |
| `personal-app/src/shared/lib/adminPanel.test.ts` | 58 | 10 | `false` |
| `personal-app/src/features/recommendation/recommendationForm.ts` | 58 | 10 | `false` |
| `personal-app/src/features/book/lib/state.test.ts` | 57 | 8 | `false` |
| `personal-app/src/features/book/lib/codeHighlight.test.ts` | 56 | 6 | `false` |
| `personal-app/src/features/profile/components/ProfileDiscardDialog.tsx` | 56 | 4 | `false` |
| `personal-app/src/features/book/components/BookFileUpload.tsx` | 56 | 3 | `false` |
| `personal-app/src/shared/ui/PaginationControls.astro` | 56 | 3 | `false` |
| `personal-app/src/features/recommendation/components/RecommendationRowCard.tsx` | 56 | 2 | `false` |
| `personal-app/src/features/roadmap/components/RoadmapMilestoneFields.tsx` | 56 | 2 | `false` |
| `personal-app/src/shared/ui/admin/AdminField.tsx` | 54 | 2 | `false` |
| `personal-app/src/features/tool/components/ToolFields.tsx` | 54 | 2 | `false` |
| `personal-app/src/features/tool/components/ToolRowCard.tsx` | 54 | 2 | `false` |
| `personal-app/src/pages/admin/diario.astro` | 53 | 6 | `false` |
| `personal-app/src/widgets/certificates/Certificates.astro` | 53 | 2 | `false` |
| `personal-app/src/features/roadmap/components/RoadmapMilestoneRowCard.tsx` | 53 | 2 | `false` |
| `personal-app/src/shared/api/pagination.test.ts` | 52 | 9 | `false` |
| `personal-app/src/features/roadmap/components/RoadmapStageRowCard.tsx` | 52 | 3 | `false` |
| `personal-app/src/features/auth/SidebarSession.tsx` | 50 | 7 | `false` |
| `personal-app/src/features/profile/components/ProfileActionBar.tsx` | 50 | 3 | `false` |
| `personal-app/src/features/auth/paths.test.ts` | 50 | 3 | `false` |
| `personal-app/src/widgets/hero/duneFrame.ts` | 49 | 7 | `false` |
| `personal-app/src/entities/certificate/CertificateCard.astro` | 49 | 3 | `false` |
| `personal-app/src/features/certificate/components/CertificateFields.tsx` | 49 | 2 | `false` |
| `personal-app/src/widgets/services/Services.astro` | 49 | 2 | `false` |
| `personal-app/src/pages/api/[...path].test.ts` | 48 | 19 | `false` |
| `personal-app/src/shared/ui/BambooArt.astro` | 48 | 2 | `false` |
| `personal-app/src/features/book/lib/timers.test.ts` | 47 | 8 | `false` |
| `personal-app/src/features/service/api/services.ts` | 47 | 7 | `false` |
| `personal-app/src/entities/book/BookCard.astro` | 47 | 3 | `false` |
| `personal-app/src/pages/admin/login.astro` | 47 | 1 | `false` |
| `personal-app/src/features/profile/api/profile.ts` | 46 | 11 | `false` |
| `personal-app/src/features/diario-editor/api/images.ts` | 46 | 10 | `false` |
| `personal-app/src/features/tool/toolForm.ts` | 46 | 10 | `false` |
| `personal-app/src/widgets/reading/dom.ts` | 46 | 8 | `false` |
| `personal-app/src/widgets/hero/dunePalette.ts` | 46 | 4 | `false` |
| `personal-app/src/pages/admin/recuperar.astro` | 46 | 1 | `false` |
| `personal-app/src/shared/ui/admin/AdminListSection.tsx` | 45 | 3 | `false` |
| `personal-app/src/shared/ui/admin/AdminDeleteButton.tsx` | 45 | 2 | `false` |
| `personal-app/src/features/service/api/services.test.ts` | 44 | 10 | `false` |
| `personal-app/src/widgets/admin/AdminRenewalsCard.astro` | 44 | 3 | `false` |
| `personal-app/src/entities/project/ProjectCard.astro` | 44 | 3 | `false` |
| `personal-app/src/widgets/reading/state.ts` | 43 | 7 | `false` |
| `personal-app/src/features/project/api/projects-admin.ts` | 42 | 7 | `false` |
| `personal-app/src/features/theme-toggle/ThemeToggle.tsx` | 42 | 5 | `false` |
| `personal-app/src/app/layouts/AdminLayout.astro` | 42 | 3 | `false` |
| `personal-app/src/shared/ui/admin/AdminSelectField.tsx` | 42 | 3 | `false` |
| `personal-app/src/features/certificate/certificateForm.ts` | 41 | 8 | `false` |
| `personal-app/src/features/profile/api/profile.test.ts` | 41 | 5 | `false` |
| `personal-app/src/features/manifiesto/default.ts` | 41 | 3 | `false` |
| `personal-app/src/widgets/admin/AdminOccupancyCard.astro` | 39 | 3 | `false` |
| `personal-app/src/pages/index.astro` | 39 | 2 | `false` |
| `personal-app/src/shared/api/authorizedHttp.ts` | 38 | 9 | `false` |
| `personal-app/src/features/book/reader/ReaderFooter.astro` | 38 | 3 | `false` |
| `personal-app/src/shared/api/pagination.ts` | 37 | 8 | `false` |
| `personal-app/src/pages/manifiesto.astro` | 37 | 5 | `false` |
| `personal-app/src/shared/ui/HeroArt.astro` | 37 | 2 | `false` |
| `personal-app/src/features/blog/api/blogs.test.ts` | 36 | 11 | `false` |
| `personal-app/src/features/ad-slot/api/advertising-admin.ts` | 36 | 7 | `false` |
| `personal-app/src/widgets/admin/AdminTrafficChart.tsx` | 36 | 5 | `false` |
| `personal-app/src/pages/404.astro` | 36 | 2 | `false` |
| `personal-app/src/features/diario-editor/lib/selection.ts` | 35 | 9 | `false` |
| `personal-app/src/features/ad-slot/api/ad-slots.ts` | 35 | 5 | `false` |
| `personal-app/src/shared/api/managedAuthClient.ts` | 34 | 9 | `false` |
| `personal-app/src/widgets/hero/duneSkyPass.ts` | 34 | 5 | `false` |
| `personal-app/src/widgets/site-header/SiteHeader.astro` | 34 | 3 | `false` |
| `personal-app/src/entities/admin/format.ts` | 33 | 8 | `false` |
| `personal-app/src/shared/ui/admin/AdminCreateSection.tsx` | 33 | 2 | `false` |
| `personal-app/src/features/recommendation/api/recommendations-admin.ts` | 32 | 7 | `false` |
| `personal-app/src/features/service/api/services-admin.ts` | 32 | 7 | `false` |
| `personal-app/src/widgets/hero/duneState.ts` | 32 | 6 | `false` |
| `personal-app/src/entities/service/ServiceCard.astro` | 32 | 3 | `false` |
| `personal-app/src/features/recommendation/api/recommendations.ts` | 31 | 5 | `false` |
| `personal-app/src/pages/about.astro` | 31 | 4 | `false` |
| `personal-app/src/entities/ad-slot/AdSlot.astro` | 31 | 3 | `false` |
| `personal-app/src/shared/ui/admin/AdminStatusGate.tsx` | 31 | 2 | `false` |
| `personal-app/src/shared/ui/SeigaihaTile.astro` | 31 | 2 | `false` |
| `personal-app/src/widgets/reading/doc.ts` | 30 | 11 | `false` |
| `personal-app/src/features/auth/paths.ts` | 30 | 8 | `false` |
| `personal-app/src/shared/lib/markdown.test.ts` | 30 | 7 | `false` |
| `personal-app/src/features/manifiesto/api.ts` | 30 | 5 | `false` |
| `personal-app/src/widgets/admin/AdminStatCard.astro` | 30 | 3 | `false` |
| `personal-app/src/features/certificate/components/CertificateFileField.tsx` | 30 | 2 | `false` |
| `personal-app/src/features/roadmap/components/RoadmapNumberField.tsx` | 30 | 2 | `false` |
| `personal-app/src/shared/ui/SeigaihaBand.astro` | 30 | 2 | `false` |
| `personal-app/src/entities/project/technologies.ts` | 30 | 2 | `false` |
| `personal-app/src/entities/service/data.ts` | 30 | 1 | `false` |
| `personal-app/src/features/auth/api/devAuth.ts` | 29 | 8 | `false` |
| `personal-app/src/features/book/reader/ReaderTopbar.astro` | 29 | 2 | `false` |
| `personal-app/src/shared/lib/adminPanel.ts` | 28 | 11 | `false` |
| `personal-app/src/entities/recommendation/format.test.ts` | 28 | 6 | `false` |
| `personal-app/src/widgets/admin/AdminOccupancyDonut.tsx` | 28 | 2 | `false` |
| `personal-app/src/features/tool/api/tools-admin.ts` | 27 | 7 | `false` |
| `personal-app/src/features/book/reader/ReaderMargins.astro` | 27 | 4 | `false` |
| `personal-app/src/app/config/site.ts` | 27 | 4 | `false` |
| `personal-app/src/widgets/hero/duneTypes.ts` | 27 | 3 | `false` |
| `personal-app/src/widgets/admin/AdminSummaryBar.astro` | 26 | 4 | `false` |
| `personal-app/src/features/book/reader/ReaderStage.astro` | 26 | 4 | `false` |
| `personal-app/src/widgets/blog/PostCard.astro` | 26 | 3 | `false` |
| `personal-app/src/shared/ui/admin/AdminFeedbackBanner.tsx` | 26 | 2 | `false` |
| `personal-app/src/widgets/admin/AdminPageHeader.astro` | 26 | 2 | `false` |
| `personal-app/src/features/diario-editor/api/post.ts` | 25 | 7 | `false` |
| `personal-app/src/shared/lib/markdown.ts` | 25 | 6 | `false` |
| `personal-app/src/entities/recommendation/format.ts` | 25 | 4 | `false` |
| `personal-app/src/features/book/lib/textNormalize.ts` | 25 | 4 | `false` |
| `personal-app/src/features/tool/api/tools.ts` | 25 | 4 | `false` |
| `personal-app/src/widgets/admin/AdminMetricGrid.astro` | 25 | 3 | `false` |
| `personal-app/src/features/menu/api/menu-items-admin.ts` | 24 | 7 | `false` |
| `personal-app/src/pages/blog/[...slug].astro` | 24 | 5 | `false` |
| `personal-app/src/features/auth/types.ts` | 24 | 4 | `false` |
| `personal-app/src/widgets/admin/AdminTopBar.astro` | 24 | 2 | `false` |
| `personal-app/src/widgets/reading/init.ts` | 24 | 2 | `false` |
| `personal-app/src/widgets/reading/progress.ts` | 24 | 2 | `false` |
| `personal-app/src/features/profile/types.ts` | 24 | 2 | `false` |
| `personal-app/src/features/diario-editor/lib/slug.test.ts` | 23 | 5 | `false` |
| `personal-app/src/features/ad-slot/api/brands-admin.ts` | 22 | 7 | `false` |
| `personal-app/src/entities/ad-slot/types.ts` | 22 | 3 | `false` |
| `personal-app/src/features/admin/api/diario.ts` | 21 | 6 | `false` |
| `personal-app/src/shared/ui/HeaderLink.astro` | 21 | 4 | `false` |
| `personal-app/src/entities/roadmap/types.ts` | 21 | 4 | `false` |
| `personal-app/src/features/auth/TopBarStatus.tsx` | 20 | 6 | `false` |
| `personal-app/src/features/auth/UserBadge.tsx` | 20 | 4 | `false` |
| `personal-app/src/features/book/lib/textNormalize.test.ts` | 20 | 3 | `false` |
| `personal-app/src/widgets/admin/AdminDataNotice.astro` | 20 | 2 | `false` |
| `personal-app/src/entities/certificate/format.ts` | 20 | 2 | `false` |
| `personal-app/src/content.config.ts` | 19 | 2 | `false` |
| `personal-app/src/shared/api/sessionMode.ts` | 18 | 7 | `false` |
| `personal-app/src/features/diario-editor/lib/editorStats.test.ts` | 18 | 4 | `false` |
| `personal-app/src/features/menu/api/menu-links.ts` | 18 | 4 | `false` |
| `personal-app/src/shared/ui/EmptyState.astro` | 18 | 3 | `false` |
| `personal-app/src/entities/project/types.ts` | 18 | 3 | `false` |
| `personal-app/src/shared/ui/ThemeScript.astro` | 18 | 2 | `false` |
| `personal-app/src/pages/rss.xml.js` | 18 | 2 | `false` |
| `personal-app/src/entities/certificate/data.ts` | 18 | 1 | `false` |
| `personal-app/src/features/auth/api/authClient.ts` | 17 | 7 | `false` |
| `personal-app/src/features/admin/api/collections.ts` | 17 | 6 | `false` |
| `personal-app/src/widgets/admin/AdminTrafficCard.astro` | 17 | 3 | `false` |
| `personal-app/src/shared/lib/slug.test.ts` | 16 | 3 | `false` |
| `personal-app/src/widgets/admin/AdminKpiGrid.astro` | 15 | 3 | `false` |
| `personal-app/src/features/auth/api/adminSession.test.ts` | 15 | 2 | `false` |
| `personal-app/src/features/diario-editor/lib/slug.ts` | 14 | 5 | `false` |
| `personal-app/src/features/auth/SessionGuard.tsx` | 14 | 4 | `false` |
| `personal-app/src/content/blog/aprender-ingenieria-en-publico.md` | 14 | 3 | `false` |
| `personal-app/src/content/blog/mi-primer-smart-contract.md` | 14 | 3 | `false` |
| `personal-app/src/content/blog/stack-minimo-api-2026.md` | 14 | 3 | `false` |
| `personal-app/src/features/project/api/purchase.test.ts` | 14 | 2 | `false` |
| `personal-app/src/shared/ui/admin/styles.ts` | 13 | 8 | `false` |
| `personal-app/src/content/blog/postgresql-no-es-lento.md` | 13 | 3 | `false` |
| `personal-app/src/features/project/api/purchase.ts` | 13 | 3 | `false` |
| `personal-app/src/content/blog/tests-que-si-se-mantienen.md` | 13 | 3 | `false` |
| `personal-app/src/shared/ui/FormattedDate.astro` | 13 | 2 | `false` |
| `personal-app/src/pages/admin/certificados.astro` | 13 | 2 | `false` |
| `personal-app/src/pages/admin/herramientas.astro` | 13 | 2 | `false` |
| `personal-app/src/pages/admin/libros.astro` | 13 | 2 | `false` |
| `personal-app/src/pages/admin/menu.astro` | 13 | 2 | `false` |
| `personal-app/src/pages/admin/perfil.astro` | 13 | 2 | `false` |
| `personal-app/src/pages/admin/proyectos.astro` | 13 | 2 | `false` |
| `personal-app/src/pages/admin/recomendaciones.astro` | 13 | 2 | `false` |
| `personal-app/src/pages/admin/roadmap.astro` | 13 | 2 | `false` |
| `personal-app/src/pages/admin/servicios.astro` | 13 | 2 | `false` |
| `personal-app/src/widgets/admin/AdminGreeting.tsx` | 12 | 2 | `false` |
| `personal-app/src/entities/recommendation/data.ts` | 12 | 1 | `false` |
| `personal-app/src/pages/admin/diario/[id].astro` | 11 | 3 | `false` |
| `personal-app/src/pages/marcas.astro` | 11 | 2 | `false` |
| `personal-app/src/entities/post/types.ts` | 11 | 1 | `false` |
| `personal-app/src/features/diario-editor/lib/editorStats.ts` | 10 | 4 | `false` |
| `personal-app/src/shared/ui/Reveal.astro` | 10 | 2 | `false` |
| `personal-app/src/shared/lib/slug.ts` | 9 | 1 | `false` |
| `personal-app/src/entities/service/types.ts` | 9 | 1 | `false` |
| `personal-app/src/features/auth/api/adminSession.ts` | 8 | 3 | `false` |
| `personal-app/src/shared/api/url.ts` | 8 | 3 | `false` |
| `personal-app/src/entities/certificate/types.ts` | 8 | 0 | `false` |
| `personal-app/src/entities/recommendation/types.ts` | 8 | 0 | `false` |
| `personal-app/src/pages/admin/manifiesto.astro` | 7 | 2 | `false` |
| `personal-app/src/pages/admin/diario/nueva.astro` | 7 | 2 | `false` |
| `personal-app/src/entities/tool/types.ts` | 7 | 1 | `false` |
| `personal-app/src/features/book/reader/ReaderAtmosphere.astro` | 6 | 1 | `false` |
| `personal-app/src/shared/api/serverEnvironment.ts` | 5 | 1 | `false` |
| `personal-app/src/app/config/sections.ts` | 1 | 1 | `false` |
| `personal-app/src/features/auth/api/sessionMode.ts` | 1 | 0 | `false` |

### Seguimiento de complejidad (frontend)

Archivos de producción con `cx >= 25` (ninguno bloquea el tope de 400):

| Archivo | Líneas de código | Complejidad |
| --- | ---: | ---: |
| `personal-app/src/features/menu/MenuItemsEditorPanel.tsx` | 369 | 52 |
| `personal-app/src/widgets/diario-editor/DiarioEditorPage.tsx` | 363 | 37 |
| `personal-app/src/widgets/reading/renderItems.ts` | 320 | 35 |
| `personal-app/src/features/project/projectForm.test.ts` | 304 | 50 |
| `personal-app/src/widgets/admin/DiarioEditorPanel.tsx` | 296 | 39 |
| `personal-app/src/features/roadmap/roadmapForm.test.ts` | 273 | 33 |
| `personal-app/src/widgets/reading/scroll.ts` | 216 | 31 |
| `personal-app/src/widgets/hero/duneScene.ts` | 209 | 27 |
| `personal-app/src/shared/api/contentCache.test.ts` | 206 | 46 |
| `personal-app/src/shared/api/contentCache.ts` | 204 | 35 |
| `personal-app/src/features/ad-slot/brandForm.test.ts` | 198 | 31 |
| `personal-app/src/features/profile/ProfileEditorPanel.tsx` | 198 | 30 |
| `personal-app/src/pages/api/[...path].ts` | 193 | 44 |
| `personal-app/src/app/styles/global.css` | 189 | 26 |
| `personal-app/src/features/service/serviceForm.test.ts` | 185 | 31 |
| `personal-app/src/features/profile/profileForm.test.ts` | 178 | 26 |
| `personal-app/src/features/ad-slot/BrandsEditorPanel.tsx` | 177 | 29 |
| `personal-app/src/entities/admin/adapter.ts` | 175 | 41 |
| `personal-app/src/features/project/ProjectsEditorPanel.tsx` | 173 | 36 |
| `personal-app/src/features/service/ServicesEditorPanel.tsx` | 173 | 36 |
| `personal-app/src/features/ad-slot/AdvertisingPlansEditorPanel.tsx` | 169 | 28 |
| `personal-app/src/features/roadmap/RoadmapEditorPanel.tsx` | 168 | 32 |
| `personal-app/src/features/book/api/books.test.ts` | 141 | 25 |
| `personal-app/src/features/roadmap/roadmapForm.ts` | 132 | 25 |
| `personal-app/src/widgets/about/aboutSection.ts` | 126 | 26 |
| `personal-app/src/shared/api/http.ts` | 124 | 26 |
| `personal-app/src/features/ad-slot/api/carrusel.ts` | 114 | 25 |
| `personal-app/src/features/certificate/api/certificates.test.ts` | 107 | 25 |
| `personal-app/src/shared/api/http.test.ts` | 104 | 30 |
| `personal-app/src/shared/ui/admin/createAdminCrudState.test.ts` | 97 | 25 |

## 2. `backend/`

| Archivo | Líneas de código | Complejidad | ¿Se refactoriza? |
| --- | ---: | ---: | :---: |
| `backend/src/books/reading/reading.xml-blocks.ts` | 576 | 33 | `false` |
| `backend/README.md` | 561 | 136 | `false` |
| `backend/test/books.e2e-spec.ts` | 524 | 102 | `false` |
| `backend/src/blogs/blogs.service.spec.ts` | 399 | 66 | `false` |
| `backend/src/books/reading/book-reading.extractor.spec.ts` | 361 | 31 | `false` |
| `backend/src/roadmap/roadmap.service.spec.ts` | 347 | 59 | `false` |
| `backend/src/books/reading/reading.noise.ts` | 323 | 4 | `false` |
| `backend/src/books/books.service.spec.ts` | 281 | 43 | `false` |
| `backend/src/books/reading/reading.pdf-layout.ts` | 265 | 29 | `false` |
| `backend/src/blogs/blogs.controller.ts` | 263 | 14 | `false` |
| `backend/test/tools.e2e-spec.ts` | 262 | 73 | `false` |
| `backend/src/profile/profile.service.spec.ts` | 257 | 51 | `false` |
| `backend/src/books/reading/reading.pdf-xml.ts` | 251 | 3 | `false` |
| `backend/src/recommendations/recommendations.service.spec.ts` | 247 | 38 | `false` |
| `backend/test/dev-auth.e2e-spec.ts` | 239 | 46 | `false` |
| `backend/src/users/users.service.spec.ts` | 235 | 34 | `false` |
| `backend/src/books/books.controller.ts` | 234 | 11 | `false` |
| `backend/src/books/reading/reading.block-rules.ts` | 230 | 15 | `false` |
| `backend/src/certificates/certificates.service.spec.ts` | 225 | 40 | `false` |
| `backend/test/blogs-portada.e2e-spec.ts` | 213 | 50 | `false` |
| `backend/test/books-s3.e2e-spec.ts` | 213 | 37 | `false` |
| `backend/test/projects-portada.e2e-spec.ts` | 196 | 40 | `false` |
| `backend/test/app.e2e-spec.ts` | 191 | 27 | `false` |
| `backend/test/menu-items.e2e-spec.ts` | 182 | 47 | `false` |
| `backend/test/brands.e2e-spec.ts` | 181 | 31 | `false` |
| `backend/src/certificates/certificates.controller.ts` | 179 | 8 | `false` |
| `backend/test/advertising-plans.e2e-spec.ts` | 178 | 43 | `false` |
| `backend/test/auth.e2e-spec.ts` | 170 | 25 | `false` |
| `backend/src/database/seed-roadmap.ts` | 170 | 10 | `false` |
| `backend/src/auth/dev/dev-auth.service.spec.ts` | 169 | 33 | `false` |
| `backend/test/profile.e2e-spec.ts` | 168 | 34 | `false` |
| `backend/src/books/reading/reading.mood.ts` | 165 | 10 | `false` |
| `backend/test/services-portada.e2e-spec.ts` | 162 | 35 | `false` |
| `backend/src/menu-items/menu-items.service.spec.ts` | 161 | 27 | `false` |
| `backend/src/auth/auth-mode.spec.ts` | 157 | 18 | `false` |
| `backend/src/books/reading/reading.chunks.ts` | 151 | 12 | `false` |
| `backend/test/swagger.e2e-spec.ts` | 150 | 16 | `false` |
| `backend/src/blogs/blogs.service.ts` | 146 | 24 | `false` |
| `backend/src/database/seed-projects.ts` | 146 | 6 | `false` |
| `backend/src/brands/brands.service.spec.ts` | 139 | 25 | `false` |
| `backend/src/projects/projects.service.spec.ts` | 137 | 25 | `false` |
| `backend/src/profile/profile.service.ts` | 135 | 34 | `false` |
| `backend/src/advertising-plans/advertising-plans.service.spec.ts` | 135 | 25 | `false` |
| `backend/src/services/services.service.spec.ts` | 134 | 25 | `false` |
| `backend/src/books/storage/s3-book.storage.spec.ts` | 133 | 28 | `false` |
| `backend/src/books/reading/reading.pdf-text.ts` | 132 | 8 | `false` |
| `backend/src/tools/tools.service.spec.ts` | 130 | 25 | `false` |
| `backend/src/auth/dev/dev-session.spec.ts` | 129 | 24 | `false` |
| `backend/src/books/reading/reading.types.ts` | 129 | 16 | `false` |
| `backend/src/roadmap/roadmap.service.ts` | 128 | 22 | `false` |
| `backend/src/recommendations/recommendations.controller.ts` | 127 | 8 | `false` |
| `backend/src/database/seed-blogs.ts` | 126 | 11 | `false` |
| `backend/src/projects/projects.controller.ts` | 126 | 10 | `false` |
| `backend/src/books/books.service.ts` | 117 | 20 | `false` |
| `backend/src/database/migrate-books-to-s3.ts` | 112 | 13 | `false` |
| `backend/src/auth/dev/dev-auth.controller.ts` | 112 | 12 | `false` |
| `backend/src/auth/dev/dev-login-limiter.spec.ts` | 111 | 31 | `false` |
| `backend/src/roadmap/roadmap.controller.ts` | 105 | 8 | `false` |
| `backend/src/auth/dev/dev-auth.service.ts` | 103 | 23 | `false` |
| `backend/src/books/storage/s3-book.storage.ts` | 102 | 11 | `false` |
| `backend/src/books/dto/update-reading-state.dto.ts` | 101 | 15 | `false` |
| `backend/src/http/swagger.ts` | 100 | 5 | `false` |
| `backend/src/config/db-mode.spec.ts` | 99 | 15 | `false` |
| `backend/src/auth/guards/route-auth.guard.spec.ts` | 97 | 16 | `false` |
| `backend/src/services/services.controller.ts` | 95 | 8 | `false` |
| `backend/src/database/seed-profile.ts` | 91 | 18 | `false` |
| `backend/src/blogs/image-files.spec.ts` | 86 | 19 | `false` |
| `backend/src/database/seed-admin.ts` | 85 | 12 | `false` |
| `backend/src/advertising-plans/advertising-plans.controller.ts` | 84 | 6 | `false` |
| `backend/src/books/reading/reading.extract.ts` | 84 | 6 | `false` |
| `backend/package.json` | 83 | 0 | `false` |
| `backend/src/brands/brands.controller.ts` | 82 | 6 | `false` |
| `backend/src/menu-items/menu-items.controller.ts` | 82 | 6 | `false` |
| `backend/src/auth/guards/neon-session.reader.spec.ts` | 79 | 16 | `false` |
| `backend/src/books/lib/book-reading.ts` | 79 | 9 | `false` |
| `backend/src/tools/tools.controller.ts` | 79 | 6 | `false` |
| `backend/src/users/users.controller.ts` | 79 | 6 | `false` |
| `backend/src/profile/profile.controller.ts` | 78 | 7 | `false` |
| `backend/src/books/lib/book-file.ts` | 71 | 10 | `false` |
| `backend/src/blogs/image-files.ts` | 70 | 12 | `false` |
| `backend/src/users/users.service.ts` | 69 | 8 | `false` |
| `backend/src/auth/guards/neon-session.reader.ts` | 67 | 10 | `false` |
| `backend/src/books/reading/reading.state.ts` | 67 | 8 | `false` |
| `backend/src/auth/auth.module.ts` | 67 | 2 | `false` |
| `backend/src/certificates/http/certificate-image.ts` | 66 | 6 | `false` |
| `backend/src/database/migration/table-specs.ts` | 64 | 3 | `false` |
| `backend/src/projects/dto/create-project.dto.ts` | 63 | 12 | `false` |
| `backend/src/certificates/certificates.service.ts` | 62 | 8 | `false` |
| `backend/src/auth/auth.ts` | 62 | 6 | `false` |
| `backend/src/profile/dto/create-profile.dto.ts` | 61 | 17 | `false` |
| `backend/src/database/seed-recommendations.ts` | 61 | 6 | `false` |
| `backend/src/config/db-mode.ts` | 60 | 9 | `false` |
| `backend/src/auth/dev/dev-login-limiter.ts` | 59 | 17 | `false` |
| `backend/src/auth/guards/route-roles.guard.spec.ts` | 58 | 16 | `false` |
| `backend/src/blogs/dto/create-blog.dto.ts` | 58 | 12 | `false` |
| `backend/src/database/sync-schema.ts` | 58 | 5 | `false` |
| `backend/src/recommendations/recommendations.service.ts` | 57 | 10 | `false` |
| `backend/src/auth/dev/dev-session-token.ts` | 56 | 14 | `false` |
| `backend/src/config/database.config.ts` | 56 | 5 | `false` |
| `backend/src/blogs/entities/blog.entity.ts` | 54 | 16 | `false` |
| `backend/src/books/lib/book-reading-state.ts` | 54 | 4 | `false` |
| `backend/src/books/lib/book-columns.ts` | 53 | 7 | `false` |
| `backend/src/books/storage/local-book.storage.spec.ts` | 51 | 14 | `false` |
| `backend/src/menu-items/menu-items.service.ts` | 50 | 10 | `false` |
| `backend/src/books/entities/book.entity.ts` | 48 | 15 | `false` |
| `backend/src/common/pagination/pagination.dto.spec.ts` | 48 | 10 | `false` |
| `backend/src/common/swagger/api-decorators.ts` | 48 | 9 | `false` |
| `backend/src/auth/guards/route-auth.guard.ts` | 48 | 9 | `false` |
| `backend/src/advertising-plans/dto/create-advertising-plan.dto.ts` | 47 | 9 | `false` |
| `backend/src/books/lib/book-download.ts` | 46 | 7 | `false` |
| `backend/src/brands/brands.service.ts` | 46 | 7 | `false` |
| `backend/src/health/health.controller.ts` | 46 | 5 | `false` |
| `backend/render.yaml` | 46 | 0 | `false` |
| `backend/src/profile/entities/profile.entity.ts` | 44 | 19 | `false` |
| `backend/src/books/lib/book-reading-cache.ts` | 44 | 7 | `false` |
| `backend/src/app.module.ts` | 44 | 2 | `false` |
| `backend/src/projects/entities/project.entity.ts` | 43 | 14 | `false` |
| `backend/src/auth/guards/route-roles.guard.ts` | 43 | 8 | `false` |
| `backend/src/advertising-plans/advertising-plans.service.ts` | 43 | 7 | `false` |
| `backend/src/common/pagination/pagination.dto.ts` | 43 | 7 | `false` |
| `backend/src/users/entities/user.entity.ts` | 42 | 15 | `false` |
| `backend/src/certificates/http/certificate-upload.ts` | 42 | 7 | `false` |
| `backend/src/recommendations/dto/create-recommendation.dto.ts` | 42 | 6 | `false` |
| `backend/src/roadmap/dto/create-stage.dto.ts` | 42 | 6 | `false` |
| `backend/src/http/swagger.spec.ts` | 42 | 6 | `false` |
| `backend/test/bootstrap-body-parser.e2e-spec.ts` | 41 | 7 | `false` |
| `backend/src/books/pdf.util.spec.ts` | 40 | 13 | `false` |
| `backend/src/projects/projects.service.ts` | 40 | 7 | `false` |
| `backend/src/services/services.service.ts` | 40 | 7 | `false` |
| `backend/src/tools/tools.service.ts` | 40 | 7 | `false` |
| `backend/src/projects/dto/create-project.dto.spec.ts` | 40 | 6 | `false` |
| `backend/src/services/entities/service.entity.ts` | 39 | 9 | `false` |
| `backend/src/users/dto/create-user.dto.ts` | 38 | 6 | `false` |
| `backend/src/certificates/http/certificate-delivery.ts` | 38 | 4 | `false` |
| `backend/src/books/http/download-response.ts` | 38 | 4 | `false` |
| `backend/src/books/dto/create-book.dto.ts` | 37 | 8 | `false` |
| `backend/src/database/migration/copy-tables.ts` | 36 | 4 | `false` |
| `backend/src/auth/dev/dev-session-payload.ts` | 35 | 8 | `false` |
| `backend/src/books/http/book-upload-config.ts` | 35 | 7 | `false` |
| `backend/src/config/database.config.spec.ts` | 35 | 3 | `false` |
| `backend/src/services/dto/create-service.dto.ts` | 34 | 7 | `false` |
| `backend/src/common/pagination/paginate.spec.ts` | 34 | 7 | `false` |
| `backend/src/health/health.controller.spec.ts` | 34 | 6 | `false` |
| `backend/src/advertising-plans/entities/advertising-plan.entity.ts` | 33 | 11 | `false` |
| `backend/src/auth/dev/dev-session-cookie.ts` | 33 | 6 | `false` |
| `backend/src/brands/entities/brand.entity.ts` | 32 | 8 | `false` |
| `backend/src/roadmap/dto/create-milestone.dto.ts` | 32 | 5 | `false` |
| `backend/src/books/storage/local-book.storage.ts` | 32 | 5 | `false` |
| `backend/src/database/migrate-local-content.ts` | 32 | 4 | `false` |
| `backend/src/database/drop-blogs-author-fk.ts` | 31 | 9 | `false` |
| `backend/src/users/entities/work-experience.entity.ts` | 31 | 8 | `false` |
| `backend/src/brands/dto/create-brand.dto.ts` | 30 | 5 | `false` |
| `backend/src/auth/session-mode.controller.ts` | 30 | 1 | `false` |
| `backend/src/recommendations/entities/recommendation.entity.ts` | 28 | 9 | `false` |
| `backend/src/roadmap/entities/roadmap-stage.entity.ts` | 28 | 9 | `false` |
| `backend/src/books/reading/book-reading.extractor.ts` | 28 | 0 | `false` |
| `backend/src/certificates/entities/certificate.entity.ts` | 26 | 8 | `false` |
| `backend/src/roadmap/entities/roadmap-milestone.entity.ts` | 26 | 8 | `false` |
| `backend/src/books/filters/multer-exception.filter.ts` | 26 | 3 | `false` |
| `backend/src/auth/mode/resolve-auth-mode.ts` | 25 | 5 | `false` |
| `backend/src/menu-items/dto/create-menu-item.dto.ts` | 25 | 3 | `false` |
| `backend/src/books/storage/book-storage.ts` | 24 | 8 | `false` |
| `backend/src/books/lib/book-lookup.ts` | 24 | 5 | `false` |
| `backend/src/certificates/dto/create-certificate.dto.ts` | 24 | 4 | `false` |
| `backend/src/auth/run-auth-migrations.ts` | 23 | 4 | `false` |
| `backend/src/books/dto/books-pagination.query.dto.ts` | 23 | 2 | `false` |
| `backend/src/certificates/http/certificate-presenter.ts` | 23 | 2 | `false` |
| `backend/src/main.ts` | 23 | 1 | `false` |
| `backend/tsconfig.json` | 23 | 0 | `false` |
| `backend/src/books/books.module.ts` | 22 | 1 | `false` |
| `backend/src/database/migration/schema-sync.ts` | 22 | 1 | `false` |
| `backend/src/tools/dto/create-tool.dto.ts` | 21 | 4 | `false` |
| `backend/src/books/http/uploaded-pdf.ts` | 21 | 4 | `false` |
| `backend/src/books/http/book-presenter.ts` | 21 | 2 | `false` |
| `backend/src/database/add-project-type.ts` | 20 | 2 | `false` |
| `backend/src/books/guards/book-exists.guard.ts` | 20 | 2 | `false` |
| `backend/docker-compose.yml` | 20 | 1 | `false` |
| `backend/src/auth/auth-mode.ts` | 19 | 6 | `false` |
| `backend/src/blogs/dto/manifiesto.dto.ts` | 19 | 4 | `false` |
| `backend/src/auth/auth.controller.ts` | 19 | 1 | `false` |
| `backend/src/tools/entities/tool.entity.ts` | 18 | 5 | `false` |
| `backend/src/app.controller.spec.ts` | 18 | 4 | `false` |
| `backend/src/auth/mode/no-auth-policy.ts` | 18 | 3 | `false` |
| `backend/src/books/pdf.util.ts` | 18 | 2 | `false` |
| `backend/src/auth/mode/neon-auth-config.ts` | 17 | 3 | `false` |
| `backend/src/database/migration/admin-account.ts` | 17 | 1 | `false` |
| `backend/src/http/trust-proxy.spec.ts` | 16 | 4 | `false` |
| `backend/src/app.controller.ts` | 16 | 2 | `false` |
| `backend/neon.ts` | 16 | 1 | `false` |
| `backend/src/auth/guards/better-session.reader.ts` | 15 | 3 | `false` |
| `backend/src/common/pagination/paginate.ts` | 15 | 1 | `false` |
| `backend/src/database/migration/row-values.ts` | 15 | 1 | `false` |
| `backend/src/books/http/session-owner.ts` | 14 | 2 | `false` |
| `backend/src/database/database.module.ts` | 14 | 1 | `false` |
| `backend/src/profile/entities/profile-draft.entity.ts` | 13 | 4 | `false` |
| `backend/src/auth/guards/session-reader.ts` | 13 | 4 | `false` |
| `backend/src/books/entities/download-event.entity.ts` | 12 | 4 | `false` |
| `backend/src/menu-items/entities/menu-item.entity.ts` | 12 | 4 | `false` |
| `backend/src/auth/guards/dev-session.reader.ts` | 12 | 3 | `false` |
| `backend/src/auth/dev/dto/dev-login.dto.ts` | 12 | 2 | `false` |
| `backend/src/auth/dev/dev-auth.module.ts` | 12 | 1 | `false` |
| `backend/src/profile/profile.module.ts` | 12 | 1 | `false` |
| `backend/src/roadmap/roadmap.module.ts` | 12 | 1 | `false` |
| `backend/src/users/users.module.ts` | 12 | 1 | `false` |
| `backend/src/auth/dev/dev-session.ts` | 12 | 0 | `false` |
| `backend/src/users/dto/social-link.dto.ts` | 11 | 2 | `false` |
| `backend/src/advertising-plans/advertising-plans.module.ts` | 11 | 1 | `false` |
| `backend/src/blogs/blogs.module.ts` | 11 | 1 | `false` |
| `backend/src/brands/brands.module.ts` | 11 | 1 | `false` |
| `backend/src/certificates/certificates.module.ts` | 11 | 1 | `false` |
| `backend/src/menu-items/menu-items.module.ts` | 11 | 1 | `false` |
| `backend/src/projects/projects.module.ts` | 11 | 1 | `false` |
| `backend/src/recommendations/recommendations.module.ts` | 11 | 1 | `false` |
| `backend/src/database/migration/sequences.ts` | 11 | 1 | `false` |
| `backend/src/services/services.module.ts` | 11 | 1 | `false` |
| `backend/src/tools/tools.module.ts` | 11 | 1 | `false` |
| `backend/src/profile/dto/commitment.dto.ts` | 10 | 2 | `false` |
| `backend/vitest.config.e2e.ts` | 10 | 1 | `false` |
| `backend/vitest.config.ts` | 10 | 1 | `false` |
| `backend/.oxlintrc.json` | 10 | 0 | `false` |
| `backend/src/database/migration/coercion.ts` | 9 | 1 | `false` |
| `backend/src/http/cors-origins.ts` | 8 | 1 | `false` |
| `backend/nest-cli.json` | 8 | 0 | `false` |
| `backend/tsconfig.build.json` | 8 | 0 | `false` |
| `backend/src/app.service.ts` | 7 | 1 | `false` |
| `backend/pnpm-workspace.yaml` | 7 | 1 | `false` |
| `backend/src/auth/mode/dev-credentials.ts` | 7 | 0 | `false` |
| `backend/src/auth/dev/dev-session-credential.ts` | 6 | 2 | `false` |
| `backend/src/common/transformers/decimal.transformer.ts` | 6 | 1 | `false` |
| `backend/src/health/health.module.ts` | 6 | 1 | `false` |
| `backend/src/http/trust-proxy.ts` | 5 | 2 | `false` |
| `backend/src/advertising-plans/dto/update-advertising-plan.dto.ts` | 5 | 1 | `false` |
| `backend/src/recommendations/dto/update-recommendation.dto.ts` | 5 | 1 | `false` |
| `backend/src/common/enums/blog-level.enum.ts` | 5 | 0 | `false` |
| `backend/src/common/enums/reading-status.enum.ts` | 5 | 0 | `false` |
| `backend/src/books/lib/book-sidecar-keys.ts` | 4 | 1 | `false` |
| `backend/src/common/enums/book-kind.enum.ts` | 4 | 0 | `false` |
| `backend/src/common/enums/tool-sponsorship.enum.ts` | 4 | 0 | `false` |
| `backend/src/blogs/dto/update-blog.dto.ts` | 3 | 1 | `false` |
| `backend/src/books/dto/update-book.dto.ts` | 3 | 1 | `false` |
| `backend/src/brands/dto/update-brand.dto.ts` | 3 | 1 | `false` |
| `backend/src/certificates/dto/update-certificate.dto.ts` | 3 | 1 | `false` |
| `backend/src/menu-items/dto/update-menu-item.dto.ts` | 3 | 1 | `false` |
| `backend/src/roadmap/dto/update-milestone.dto.ts` | 3 | 1 | `false` |
| `backend/src/profile/dto/update-profile.dto.ts` | 3 | 1 | `false` |
| `backend/src/projects/dto/update-project.dto.ts` | 3 | 1 | `false` |
| `backend/src/services/dto/update-service.dto.ts` | 3 | 1 | `false` |
| `backend/src/roadmap/dto/update-stage.dto.ts` | 3 | 1 | `false` |
| `backend/src/tools/dto/update-tool.dto.ts` | 3 | 1 | `false` |
| `backend/src/users/dto/update-user.dto.ts` | 3 | 1 | `false` |
| `backend/src/auth/auth-enabled.ts` | 2 | 1 | `false` |
| `backend/src/auth/mode/auth-mode-types.ts` | 2 | 1 | `false` |
| `backend/src/profile/profile.types.ts` | 2 | 1 | `false` |

### Seguimiento de complejidad (backend)

Archivos de producción con `cx >= 25` (ninguno bloquea el tope de 600):

| Archivo | Líneas de código | Complejidad |
| --- | ---: | ---: |
| `backend/src/books/reading/reading.xml-blocks.ts` | 576 | 33 |
| `backend/src/books/reading/reading.pdf-layout.ts` | 265 | 29 |
| `backend/src/profile/profile.service.ts` | 135 | 34 |
