import { plain } from '../utils';
import type { ParseResult } from './types';

const SPECIAL_CHARS = new Set(['*', '_', '~', '`', ':', '\n', '<', '[', ']', '!', ' ', '\t', '(', ')', '\\', '|']);

/**
 * Parses one or more consecutive non-special characters starting at `pos`.
 * Equivalent to: PlainRun = run:$[^*_~`:\n<\[\]! \t()\\|]+ { return plain(run); }
 */
export function parsePlainRun(input: string, pos: number): ParseResult {
	if (pos >= input.length || SPECIAL_CHARS.has(input[pos])) {
		return { success: false };
	}
	let end = pos + 1;
	while (end < input.length && !SPECIAL_CHARS.has(input[end])) {
		end++;
	}
	return { success: true, node: plain(input.substring(pos, end)), newPos: end };
}
