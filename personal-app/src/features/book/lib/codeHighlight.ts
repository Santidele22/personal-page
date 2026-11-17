export type CodeTokenKind =
	| 'comment'
	| 'preproc'
	| 'string'
	| 'number'
	| 'keyword'
	| 'type'
	| 'fn'
	| 'punct'
	| 'plain';

export type CodeToken = {
	kind: CodeTokenKind;
	text: string;
};

const KEYWORDS = new Set([
	'if',
	'else',
	'while',
	'for',
	'do',
	'switch',
	'case',
	'default',
	'break',
	'continue',
	'return',
	'goto',
	'typedef',
	'struct',
	'union',
	'enum',
	'sizeof',
	'static',
	'extern',
	'const',
	'volatile',
	'register',
	'auto',
	'inline',
	'class',
	'interface',
	'extends',
	'implements',
	'public',
	'private',
	'protected',
	'virtual',
	'override',
	'final',
	'abstract',
	'new',
	'delete',
	'try',
	'catch',
	'finally',
	'throw',
	'throws',
	'import',
	'from',
	'export',
	'as',
	'package',
	'using',
	'namespace',
	'def',
	'lambda',
	'pass',
	'raise',
	'with',
	'elif',
	'fn',
	'func',
	'function',
	'let',
	'var',
	'mut',
	'pub',
	'impl',
	'trait',
	'match',
	'type',
	'async',
	'await',
	'yield',
	'in',
	'of',
	'is',
	'not',
	'and',
	'or',
	'true',
	'false',
	'null',
	'nil',
	'None',
	'True',
	'False',
	'self',
	'this',
	'super',
	'SELECT',
	'FROM',
	'WHERE',
	'INSERT',
	'INTO',
	'VALUES',
	'UPDATE',
	'SET',
	'DELETE',
	'CREATE',
	'TABLE',
	'JOIN',
	'ON',
	'GROUP',
	'BY',
	'ORDER',
]);

const TYPES = new Set([
	'void',
	'int',
	'char',
	'short',
	'long',
	'float',
	'double',
	'signed',
	'unsigned',
	'bool',
	'boolean',
	'byte',
	'size_t',
	'ssize_t',
	'ptrdiff_t',
	'int8_t',
	'int16_t',
	'int32_t',
	'int64_t',
	'uint8_t',
	'uint16_t',
	'uint32_t',
	'uint64_t',
	'string',
	'number',
	'any',
	'unknown',
	'never',
	'object',
	'str',
	'usize',
	'isize',
	'i8',
	'i16',
	'i32',
	'i64',
	'u8',
	'u16',
	'u32',
	'u64',
	'f32',
	'f64',
]);

const CONSTANTS = new Set(['TRUE', 'FALSE', 'NULL', 'EOF', 'STDIN', 'STDOUT', 'STDERR', 'NaN', 'Infinity']);

const PREPROC_DIRECTIVE_RE = /^#\s*(?:define|include|ifdef|ifndef|endif|if|else|elif|pragma|undef)\b/;
const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*/;
const NUMBER_RE = /^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?[uUlLfF]*)/;
const PUNCT_RE = /^[{}()[\];,.=+\-*/%&|^~!<>?:]+/;

function pushToken(tokens: CodeToken[], kind: CodeTokenKind, text: string) {
	if (!text) return;
	const prev = tokens[tokens.length - 1];
	if (prev && prev.kind === kind) {
		prev.text += text;
	} else {
		tokens.push({ kind, text });
	}
}

function readQuotedString(source: string, start: number, quote: string): number {
	let i = start + 1;
	while (i < source.length) {
		const ch = source[i];
		if (ch === '\\') {
			i += 2;
			continue;
		}
		if (ch === quote) {
			return i + 1;
		}
		if (ch === '\n' && quote !== '`') {
			return i;
		}
		i += 1;
	}
	return source.length;
}

/**
 * Losslessly tokenizes a code snippet into syntax-highlightable spans.
 * Concatenating all returned token texts always reproduces `source` verbatim.
 */
export function tokenizeCode(source: string): CodeToken[] {
	if (!source) return [];
	const tokens: CodeToken[] = [];
	let i = 0;

	while (i < source.length) {
		const rest = source.slice(i);

		// Whitespace (spaces, tabs, newlines)
		const wsMatch = rest.match(/^[ \t\r\n]+/);
		if (wsMatch) {
			pushToken(tokens, 'plain', wsMatch[0]);
			i += wsMatch[0].length;
			continue;
		}

		// Block comment /* ... */
		if (rest.startsWith('/*')) {
			const end = source.indexOf('*/', i + 2);
			const nextIdx = end >= 0 ? end + 2 : source.length;
			pushToken(tokens, 'comment', source.slice(i, nextIdx));
			i = nextIdx;
			continue;
		}

		// Line comment // ...
		if (rest.startsWith('//')) {
			const nl = source.indexOf('\n', i + 2);
			const nextIdx = nl >= 0 ? nl : source.length;
			pushToken(tokens, 'comment', source.slice(i, nextIdx));
			i = nextIdx;
			continue;
		}

		// Preprocessor directive (#define, #include, ...) vs # comment (Python/Shell)
		if (rest[0] === '#') {
			const preMatch = rest.match(PREPROC_DIRECTIVE_RE);
			if (preMatch) {
				pushToken(tokens, 'preproc', preMatch[0]);
				i += preMatch[0].length;
				continue;
			}
			const nl = source.indexOf('\n', i + 1);
			const nextIdx = nl >= 0 ? nl : source.length;
			pushToken(tokens, 'comment', source.slice(i, nextIdx));
			i = nextIdx;
			continue;
		}

		// String literals
		const ch = rest[0];
		if (ch === '"' || ch === "'" || ch === '`') {
			const nextIdx = readQuotedString(source, i, ch);
			pushToken(tokens, 'string', source.slice(i, nextIdx));
			i = nextIdx;
			continue;
		}

		// Numbers
		const numMatch = rest.match(NUMBER_RE);
		if (numMatch) {
			pushToken(tokens, 'number', numMatch[0]);
			i += numMatch[0].length;
			continue;
		}

		// Identifiers, keywords, types, constants, and function calls
		const identMatch = rest.match(IDENT_RE);
		if (identMatch) {
			const word = identMatch[0];
			const after = source.slice(i + word.length);
			let kind: CodeTokenKind = 'plain';
			if (KEYWORDS.has(word)) {
				kind = 'keyword';
			} else if (TYPES.has(word)) {
				kind = 'type';
			} else if (CONSTANTS.has(word)) {
				kind = 'number';
			} else if (/^[ \t]*\(/.test(after)) {
				kind = 'fn';
			} else if (/^[A-Z][A-Za-z0-9_]*$/.test(word) && /[a-z]/.test(word)) {
				kind = 'type';
			}
			pushToken(tokens, kind, word);
			i += word.length;
			continue;
		}

		// Punctuation & operators
		const punctMatch = rest.match(PUNCT_RE);
		if (punctMatch) {
			pushToken(tokens, 'punct', punctMatch[0]);
			i += punctMatch[0].length;
			continue;
		}

		// Any remaining character
		pushToken(tokens, 'plain', rest[0]);
		i += 1;
	}

	return tokens;
}
