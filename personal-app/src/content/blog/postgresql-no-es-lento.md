---
title: 'PostgreSQL no es lento: tus índices sí'
description: 'Tres consultas que creíamos condenadas y cómo un EXPLAIN a tiempo las volvió triviales. Con los planes de ejecución incluidos.'
pubDate: '2026-10-08'
category: 'Backend'
icon: 'database'
readMin: 9
---

Tres consultas que creíamos condenadas y cómo un `EXPLAIN ANALYZE` a tiempo las volvió triviales. Con los planes de ejecución incluidos.

Borrador: estructura tentativa de la entrada final.

- Cada una de las tres consultas: contexto, plan de ejecución original y qué revelaba.
- El índice que faltaba en cada caso y por qué nadie lo había notado antes.
- La regla de bolsillo: medir con EXPLAIN antes de culpar a la base de datos.
