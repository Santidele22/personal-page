import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

/**
 * The diario bodies are markdown saved in the backend and rendered with
 * `set:html`, so the sanitizer's allowlist is the security boundary. These
 * tests pin the article markup the editor writes (the palette spans added by
 * the full-page editor) and the shapes that must never leak.
 */
describe('renderMarkdown', () => {
	it('renders the article markup the editor stores', () => {
		const html = renderMarkdown('## Hola\n\n> una cita\n\n- uno\n\n```js\nconst x = 1;\n```');

		expect(html).toContain('<h2>Hola</h2>');
		expect(html).toContain('<blockquote>');
		expect(html).toContain('una cita');
		expect(html).toContain('<li>uno</li>');
		expect(html).toContain('<pre');
	});

	it('discards raw html outside the allowlist but keeps its text', () => {
		const stripped = renderMarkdown('<script>alert(1)</script>después');

		expect(stripped).not.toContain('<script');
		expect(stripped).toContain('después');
		expect(renderMarkdown('<em>hola</em>')).toContain('<em>hola</em>');
	});

	it('keeps the editor accent spans with the approved palette classes', () => {
		expect(renderMarkdown('<span class="c-aka">crítico</span>')).toContain('<span class="c-aka">crítico</span>');
		expect(renderMarkdown('texto <span class="c-muted">suave</span> final')).toContain(
			'<span class="c-muted">suave</span>'
		);
	});

	it('drops spans with any other class or attribute payload', () => {
		const stripped = renderMarkdown('<span class="c-crimson onmouseover=alert(1)">texto</span>');

		expect(stripped).toContain('texto');
		expect(stripped).not.toContain('class');
		expect(stripped).not.toContain('onmouseover');
	});
});
