import type { ASTNode } from '../definitions';
import type { Options } from '../index';
import type { ParserFunction, ParserFunctionWithOptions } from './types';

/**
 * Calls a TypeScript parser function from a PEG.js semantic predicate action.
 *
 * Returns `{ node, newPos }` on success so the grammar action can:
 *   1. Assign `peg$currPos = result.newPos`
 *   2. Return `result.node`
 *
 * Returns `null` on failure so the grammar action can return `FAILED`.
 * Any exception thrown by the parser function is caught and logged to
 * `console.error` so that a bug in a migrated rule degrades gracefully
 * (the grammar backtracks) rather than crashing the entire parser.
 */
export function callTsParser(parser: ParserFunction, input: string, pos: number): { node: ASTNode; newPos: number } | null {
	try {
		const result = parser(input, pos);
		if (result.success) {
			return { node: result.node, newPos: result.newPos };
		}
		return null;
	} catch (err) {
		console.error('[callTsParser] parser threw an exception:', err);
		return null;
	}
}

/**
 * Same as `callTsParser` but forwards the PEG.js `options` object to a
 * `ParserFunctionWithOptions` (e.g., rules that need katex.dollarSyntax,
 * emoticons, or customDomains from the parse options).
 */
export function callTsParserWithOptions(
	parser: ParserFunctionWithOptions,
	input: string,
	pos: number,
	options: Options,
): { node: ASTNode; newPos: number } | null {
	try {
		const result = parser(input, pos, options);
		if (result.success) {
			return { node: result.node, newPos: result.newPos };
		}
		return null;
	} catch (err) {
		console.error('[callTsParserWithOptions] parser threw an exception:', err);
		return null;
	}
}
