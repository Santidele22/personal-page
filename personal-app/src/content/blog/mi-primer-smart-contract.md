---
title: 'Mi primer smart contract (y todo lo que casi sale mal)'
description: 'Gas, reentrancy y la diferencia entre «funciona en el test» y «funciona en mainnet». Notas desde la trinchera.'
pubDate: '2026-09-30'
category: 'Blockchain'
icon: 'blocks'
readMin: 11
---

Gas, reentrancy y la diferencia entre «funciona en el test» y «funciona en mainnet». Notas desde la trinchera.

Borrador: notas a ordenar para la versión final.

- El primer motivo experimental y por qué elegí la cadena elegida.
- Gas: dónde se fue el presupuesto sin decidirlo y qué patrón lo corrigió.
- Reentrancy: el chequeo que falta en el test y el que no puede faltar en producción.
- La lista de cosas que "casi salen mal" y el hábito que las detecta temprano.
