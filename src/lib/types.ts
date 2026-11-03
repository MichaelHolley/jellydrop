export type JobStatus = 'queued' | 'downloading' | 'moving' | 'done' | 'failed';

export type Target = { root: string; path: string };

export type TargetGroup = { root: string; targets: Target[] };

export type TagOverrides = { artist?: string; title?: string; album?: string };

export type Job = {
	id: string;
	url: string;
	title?: string;
	target: Target;
	overrides: TagOverrides;
	status: JobStatus;
	progress?: number;
	error?: string;
	createdAt: number;
};
