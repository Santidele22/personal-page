import { describe, expect, it } from 'vitest';
import { tokenizeCode } from './codeHighlight';

describe('codeHighlight', () => {
	it('reconstructs input text losslessly across C constructs and multi-line comments', () => {
		const sample = [
			'#define N 100 /* número de ranuras en el búfer */',
			'typedef int semaforo; /* los semáforos son un tipo especial de int */',
			'semaforo mutex = 1; /* controla',
			'  el acceso a la región crítica */',
			'',
			'void productor(void)',
			'{',
			'  int elemento;',
			'  while(TRUE){',
			'    elemento = producir_elemento();',
			'    down(&vacias);',
			'    up(&llenas);',
			'  }',
			'}',
		].join('\n');

		const tokens = tokenizeCode(sample);
		expect(tokens.map((t) => t.text).join('')).toBe(sample);

		expect(tokens).toContainEqual({ kind: 'preproc', text: '#define' });
		expect(tokens).toContainEqual({ kind: 'number', text: '100' });
		expect(tokens).toContainEqual({ kind: 'comment', text: '/* número de ranuras en el búfer */' });
		expect(tokens).toContainEqual({ kind: 'comment', text: '/* controla\n  el acceso a la región crítica */' });
		expect(tokens).toContainEqual({ kind: 'keyword', text: 'typedef' });
		expect(tokens).toContainEqual({ kind: 'type', text: 'int' });
		expect(tokens).toContainEqual({ kind: 'type', text: 'void' });
		expect(tokens).toContainEqual({ kind: 'fn', text: 'productor' });
		expect(tokens).toContainEqual({ kind: 'keyword', text: 'while' });
		expect(tokens).toContainEqual({ kind: 'number', text: 'TRUE' });
		expect(tokens).toContainEqual({ kind: 'fn', text: 'producir_elemento' });
		expect(tokens).toContainEqual({ kind: 'fn', text: 'down' });
		expect(tokens).toContainEqual({ kind: 'fn', text: 'up' });
	});

	it('handles strings with escapes, line comments, URLs inside strings, and Python/JS/TS keywords', () => {
		const sample = [
			'// line comment with "quotes"',
			'const url = "https://example.com/a/*b*/";',
			'const escaped = "hola \\"mundo\\"";',
			'def fetch_data(limit: int = 10): # python comment',
			'  return None',
		].join('\n');

		const tokens = tokenizeCode(sample);
		expect(tokens.map((t) => t.text).join('')).toBe(sample);

		expect(tokens).toContainEqual({ kind: 'comment', text: '// line comment with "quotes"' });
		expect(tokens).toContainEqual({ kind: 'string', text: '"https://example.com/a/*b*/"' });
		expect(tokens).toContainEqual({ kind: 'string', text: '"hola \\"mundo\\""' });
		expect(tokens).toContainEqual({ kind: 'keyword', text: 'def' });
		expect(tokens).toContainEqual({ kind: 'fn', text: 'fetch_data' });
		expect(tokens).toContainEqual({ kind: 'comment', text: '# python comment' });
		expect(tokens).toContainEqual({ kind: 'keyword', text: 'return' });
		expect(tokens).toContainEqual({ kind: 'keyword', text: 'None' });
	});
});
