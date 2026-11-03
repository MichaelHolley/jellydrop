import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { copyFile, mkdir, readdir, rename, rm, stat, unlink } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import type { Job, TagOverrides, Target } from '#lib/types.js';
import { getConfig } from './config.ts';
import { downloadAudio } from './ytdlp.ts';

const PROGRESS_THROTTLE_MS = 500;

type Entry = { job: Job; destDir: string };

const entries = new Map<string, Entry>();
const pending: Entry[] = [];
const changes = new EventEmitter();
let progressTimer: NodeJS.Timeout | undefined;
let draining = false;

export function enqueue(input: {
	url: string;
	target: Target;
	destDir: string;
	overrides: TagOverrides;
}): Job {
	const job: Job = {
		id: randomUUID(),
		url: input.url,
		target: input.target,
		overrides: input.overrides,
		status: 'queued',
		createdAt: Date.now()
	};
	const entry = { job, destDir: input.destDir };
	entries.set(job.id, entry);
	pending.push(entry);
	notify();
	void drain();
	return job;
}

export function list(): Job[] {
	return [...entries.values()].map(({ job }) => ({ ...job })).reverse();
}

export function clearFinished() {
	for (const [id, { job }] of entries) {
		if (job.status === 'done' || job.status === 'failed') entries.delete(id);
	}
	notify();
}

export function subscribe(listener: () => void): () => void {
	changes.on('change', listener);
	return () => changes.off('change', listener);
}

export async function resetStaging() {
	const { stagingDir } = getConfig();
	await mkdir(stagingDir, { recursive: true });
	for (const name of await readdir(stagingDir)) {
		await rm(join(stagingDir, name), { recursive: true, force: true });
	}
}

function notify() {
	clearTimeout(progressTimer);
	progressTimer = undefined;
	changes.emit('change');
}

function notifyProgress() {
	progressTimer ??= setTimeout(notify, PROGRESS_THROTTLE_MS);
}

async function drain() {
	if (draining) return;
	draining = true;
	try {
		for (let entry = pending.shift(); entry; entry = pending.shift()) await runJob(entry);
	} finally {
		draining = false;
	}
}

async function runJob({ job, destDir }: Entry) {
	const { stagingDir, cookiesFile } = getConfig();
	const workDir = join(stagingDir, job.id);
	try {
		job.status = 'downloading';
		job.progress = 0;
		notify();
		await mkdir(workDir, { recursive: true });
		// yt-dlp writes cookies back on exit; a per-job copy keeps the mounted file untouched
		const jobCookies = cookiesFile && join(workDir, 'cookies.txt');
		if (jobCookies) await copyFile(cookiesFile, jobCookies);
		const file = await downloadAudio({
			url: job.url,
			outputDir: workDir,
			overrides: job.overrides,
			cookiesFile: jobCookies,
			onTitle: (title) => {
				job.title = title;
				notify();
			},
			onProgress: (percent) => {
				job.progress = Math.round(percent);
				notifyProgress();
			}
		});

		job.status = 'moving';
		job.progress = 100;
		notify();
		await moveIntoLibrary(file, destDir);
		job.status = 'done';
	} catch (error) {
		job.status = 'failed';
		job.error = error instanceof Error ? error.message : String(error);
	} finally {
		await rm(workDir, { recursive: true, force: true });
		notify();
	}
}

async function moveIntoLibrary(file: string, destDir: string) {
	const dest = await freePath(destDir, basename(file));
	try {
		await rename(file, dest);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error;
		// Copy under a non-audio name so Jellyfin never sees a half-written track
		const partial = join(destDir, `.${basename(dest)}.jellydrop-partial`);
		try {
			await copyFile(file, partial);
			await rename(partial, dest);
		} finally {
			await rm(partial, { force: true });
		}
		await unlink(file);
	}
}

async function freePath(dir: string, fileName: string) {
	const ext = extname(fileName);
	const stem = basename(fileName, ext);
	for (let n = 1; ; n++) {
		const candidate = join(dir, n === 1 ? fileName : `${stem} (${n})${ext}`);
		if (!(await stat(candidate).catch(() => undefined))) return candidate;
	}
}
