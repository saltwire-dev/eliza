/**
 * Unit tests for `cleanUrl` / `extractUrls` (`utils.ts`), which pick the URLs
 * out of an inbound Discord message for link enrichment. Trailing punctuation
 * and wrapping syntax must be trimmed without cutting into the URL itself.
 */
import { describe, expect, it } from "vitest";
import { cleanUrl, extractUrls } from "../utils";

describe("cleanUrl", () => {
	it("keeps a closing parenthesis that balances one inside the URL", () => {
		expect(cleanUrl("https://en.wikipedia.org/wiki/Test_(assessment)")).toBe(
			"https://en.wikipedia.org/wiki/Test_(assessment)",
		);
	});

	it("drops only the unbalanced parenthesis of a wrapping pair", () => {
		expect(cleanUrl("https://en.wikipedia.org/wiki/Test_(assessment))")).toBe(
			"https://en.wikipedia.org/wiki/Test_(assessment)",
		);
		expect(cleanUrl("https://en.wikipedia.org/wiki/Test_(assessment)).")).toBe(
			"https://en.wikipedia.org/wiki/Test_(assessment)",
		);
	});

	it("matches the trailing parenthesis by order, not by raw count", () => {
		// Example from review: an earlier stray ")" must not cancel the later pair.
		expect(cleanUrl("https://example.com/?q=a)b_(c)")).toBe(
			"https://example.com/?q=a)b_(c)",
		);
		expect(cleanUrl("https://example.com/a)bc(def)")).toBe(
			"https://example.com/a)bc(def)",
		);
		expect(cleanUrl("https://example.com/a)(b)")).toBe(
			"https://example.com/a)(b)",
		);
	});

	it("strips only the unmatched closers after a stray parenthesis", () => {
		expect(cleanUrl("https://example.com/a)(b))")).toBe(
			"https://example.com/a)(b)",
		);
		expect(cleanUrl("https://example.com/a)(b)).")).toBe(
			"https://example.com/a)(b)",
		);
		expect(cleanUrl("https://example.com/a(b)c)")).toBe(
			"https://example.com/a(b)c",
		);
	});

	it("still strips wrapping parentheses and trailing punctuation", () => {
		expect(cleanUrl("https://example.com/docs)")).toBe(
			"https://example.com/docs",
		);
		expect(cleanUrl("https://example.com/docs).")).toBe(
			"https://example.com/docs",
		);
		expect(cleanUrl("https://example.com/docs>,")).toBe(
			"https://example.com/docs",
		);
	});
});

describe("extractUrls", () => {
	it("extracts a bare URL whose path ends in a balanced parenthesis", () => {
		expect(
			extractUrls("read https://en.wikipedia.org/wiki/Mercury_(planet) first"),
		).toEqual(["https://en.wikipedia.org/wiki/Mercury_(planet)"]);
	});

	it("keeps a balanced tail after an earlier stray parenthesis", () => {
		expect(
			extractUrls("(see https://example.com/?q=a)b_(c)) for details"),
		).toEqual(["https://example.com/?q=a)b_(c)"]);
	});

	it("extracts the full URL from a markdown link and a parenthetical", () => {
		expect(
			extractUrls(
				"[Mercury](https://en.wikipedia.org/wiki/Mercury_(planet)) and (see https://example.com/a)",
			),
		).toEqual([
			"https://en.wikipedia.org/wiki/Mercury_(planet)",
			"https://example.com/a",
		]);
	});
});
