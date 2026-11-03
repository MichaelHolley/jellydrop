import { command, form, query } from '$app/server';
import { invalid } from '@sveltejs/kit';
import { listTargets, resolveTarget, TargetError } from '#lib/server/library.js';
import * as queue from '#lib/server/queue.js';
import { submitJobSchema } from '#lib/validation.js';

export const getTargets = query(() => listTargets());

export const submitJob = form(submitJobSchema, async (data, issue) => {
	const { url, root, path, newFolder, artist, title, album } = data;
	let destDir: string;
	try {
		destDir = await resolveTarget(root, path, newFolder);
	} catch (error) {
		if (error instanceof TargetError) invalid(issue[error.field](error.message));
		throw error;
	}

	const target = { root, path: newFolder ? [path, newFolder].filter(Boolean).join('/') : path };
	queue.enqueue({ url, target, destDir, overrides: { artist, title, album } });

	// Only the folder list can change here; the live job stream updates itself
	void getTargets().refresh();
	return { target };
});

export const getJobs = query.live(async function* () {
	let wake: (() => void) | undefined;
	let changed: boolean;
	const unsubscribe = queue.subscribe(() => {
		changed = true;
		wake?.();
	});
	try {
		while (true) {
			changed = false;
			yield queue.list();
			if (!changed) await new Promise<void>((resolve) => (wake = resolve));
			wake = undefined;
		}
	} finally {
		unsubscribe();
	}
});

export const clearFinishedJobs = command(() => queue.clearFinished());
