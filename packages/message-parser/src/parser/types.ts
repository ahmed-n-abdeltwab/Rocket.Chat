import type { ASTNode } from '../definitions';
import type { Options } from '../index';

/**
 * Discriminated union returned by every migrated parser function.
 * On success: the parsed AST node and the new cursor position.
 * On failure: no additional data (the caller must not advance the cursor).
 *
 * Invariant: on success, `newPos >= pos` (cursor never moves backwards).
 */
export type ParseResult = { success: true; node: ASTNode; newPos: number } | { success: false };

/**
 * Signature for a migrated parser function that does not need parse options.
 */
export type ParserFunction = (input: string, pos: number) => ParseResult;

/**
 * Signature for a migrated parser function that needs the parse options
 * (e.g., for katex.dollarSyntax, emoticons, customDomains).
 */
export type ParserFunctionWithOptions = (input: string, pos: number, options: Options) => ParseResult;
