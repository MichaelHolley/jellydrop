import { LIBRARY_ROOTS, STAGING_DIR, YTDLP_COOKIES } from '$app/env/private';
import { realpathSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';

export type Config = {
	roots: Map<string, string>;
	stagingDir: string;
	cookiesFile?: string;
};

let config: Config | undefined;

export function getConfig(): Config {
	config ??= {
		roots: parseLibraryRoots(LIBRARY_ROOTS ?? ''),
		stagingDir: STAGING_DIR || join(tmpdir(), 'jellydrop'),
		cookiesFile: YTDLP_COOKIES || undefined
	};
	return config;
}

function parseLibraryRoots(value: string): Map<string, string> {
	const roots = new Map<string, string>();
	for (const entry of value.split(',')) {
		const separator = entry.indexOf(':');
		const label = entry.slice(0, separator).trim();
		const path = entry.slice(separator + 1).trim();
		if (separator === -1 || !label || !isAbsolute(path)) {
			throw new Error(`LIBRARY_ROOTS: expected "Label:/absolute/path", got "${entry.trim()}"`);
		}
		if (roots.has(label)) throw new Error(`LIBRARY_ROOTS: duplicate label "${label}"`);
		if (!statSync(path, { throwIfNoEntry: false })?.isDirectory()) {
			throw new Error(`LIBRARY_ROOTS: "${path}" (${label}) is not an existing directory`);
		}
		roots.set(label, realpathSync(path));
	}
	return roots;
}
