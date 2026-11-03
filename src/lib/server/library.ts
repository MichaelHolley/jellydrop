import { mkdir, readdir, realpath, stat } from 'node:fs/promises';
import { join, sep } from 'node:path';
import type { Target, TargetGroup } from '#lib/types.js';
import { folderNameProblem } from '#lib/validation.js';
import { getConfig } from './config.ts';

const MAX_DEPTH = 2;

export class TargetError extends Error {
	constructor(
		readonly field: 'root' | 'path' | 'newFolder',
		message: string
	) {
		super(message);
	}
}

export async function listTargets(): Promise<TargetGroup[]> {
	return Promise.all(
		[...getConfig().roots].map(async ([root, dir]) => ({
			root,
			targets: [{ root, path: '' }, ...(await listSubfolders(root, dir, '', 1))]
		}))
	);
}

async function listSubfolders(
	root: string,
	dir: string,
	prefix: string,
	depth: number
): Promise<Target[]> {
	const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
	const names = entries
		.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
		.map((entry) => entry.name)
		.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));

	const targets: Target[] = [];
	for (const name of names) {
		const path = prefix ? `${prefix}/${name}` : name;
		targets.push({ root, path });
		if (depth < MAX_DEPTH) {
			targets.push(...(await listSubfolders(root, join(dir, name), path, depth + 1)));
		}
	}
	return targets;
}

/** The only way to get a writable library directory: `(root, path)` must match a fresh scan. */
export async function resolveTarget(root: string, path: string, newFolder?: string) {
	const rootDir = getConfig().roots.get(root);
	if (!rootDir) throw new TargetError('root', 'Unknown library');

	const group = (await listTargets()).find((g) => g.root === root);
	if (!group?.targets.some((target) => target.path === path)) {
		throw new TargetError('path', 'That folder no longer exists, pick another one');
	}

	const dir = await realpathInside(rootDir, join(rootDir, path));
	if (!newFolder) return dir;

	const problem = folderNameProblem(newFolder);
	if (problem) throw new TargetError('newFolder', problem);

	const created = join(dir, newFolder);
	await mkdir(created).catch(async (error: NodeJS.ErrnoException) => {
		if (error.code !== 'EEXIST' || !(await stat(created)).isDirectory()) throw error;
	});
	return realpathInside(rootDir, created);
}

async function realpathInside(rootDir: string, dir: string) {
	const real = await realpath(dir);
	if (real !== rootDir && !real.startsWith(rootDir + sep)) {
		throw new TargetError('path', 'That folder points outside the library');
	}
	return real;
}
