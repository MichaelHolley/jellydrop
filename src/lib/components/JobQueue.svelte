<script lang="ts">
	import { clearFinishedJobs, getJobs } from '#lib/jobs.remote.js';
	import type { Job, JobStatus } from '#lib/types.js';
	import Waveform from './Waveform.svelte';

	const jobs = getJobs();
	const list = $derived(await jobs);
	const hasFinished = $derived(list.some(isFinished));

	let clearing = $state(false);

	const statusLabel: Record<JobStatus, string> = {
		queued: 'Waiting',
		downloading: 'Downloading',
		moving: 'Filing into library',
		done: 'In library',
		failed: 'Failed'
	};

	const statusClass: Record<JobStatus, string> = {
		queued: 'text-haze',
		downloading: 'text-amber',
		moving: 'text-amber',
		done: 'text-mint',
		failed: 'text-coral'
	};

	function isFinished(job: Job) {
		return job.status === 'done' || job.status === 'failed';
	}

	function waveTone(job: Job) {
		if (job.status === 'queued') return 'idle';
		if (job.status === 'done' || job.status === 'failed') return job.status;
		return 'active';
	}

	function destination(job: Job) {
		return [job.target.root, ...job.target.path.split('/').filter(Boolean)].join(' / ');
	}

	async function clearFinished() {
		clearing = true;
		try {
			await clearFinishedJobs();
		} finally {
			clearing = false;
		}
	}
</script>

<section aria-labelledby="queue-heading" class="flex flex-col gap-4">
	<div class="flex items-center gap-3">
		<h2 id="queue-heading" class="text-xl font-semibold tracking-tight">Queue</h2>

		{#if jobs.connected}
			<span class="flex items-center gap-1.5 text-sm text-haze">
				<span class="size-2 rounded-full bg-mint"></span>
				Live
			</span>
		{:else}
			<button
				type="button"
				class="flex items-center gap-1.5 rounded-full text-sm text-coral"
				onclick={() => jobs.reconnect()}
			>
				<span class="size-2 rounded-full bg-coral motion-safe:animate-pulse"></span>
				Offline, tap to reconnect
			</button>
		{/if}

		{#if hasFinished}
			<button
				type="button"
				class="ml-auto rounded-lg px-2 py-1 text-sm text-haze hover:text-mist disabled:opacity-50"
				disabled={clearing}
				onclick={clearFinished}
			>
				Clear finished
			</button>
		{/if}
	</div>

	{#if list.length === 0}
		<p class="text-haze">Nothing queued. Jobs you add show up here with live progress.</p>
	{:else}
		<ul class="flex flex-col divide-y divide-plum-800 border-y border-plum-800">
			{#each list as job (job.id)}
				{@const percent = Math.round(job.progress ?? 0)}
				<li class="flex flex-col gap-2 py-4">
					<div class="flex items-baseline justify-between gap-4">
						<p class={['min-w-0 truncate font-medium', !job.title && 'text-haze']}>
							{job.title ?? job.url}
						</p>
						<span class={['shrink-0 text-sm font-medium', statusClass[job.status]]}>
							{statusLabel[job.status]}
						</span>
					</div>

					<div
						class="flex items-center gap-3"
						role="progressbar"
						aria-label="Download progress"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={percent}
					>
						<div class="min-w-0 flex-1">
							<Waveform seed={job.id} progress={job.progress} tone={waveTone(job)} />
						</div>
						<span class="w-10 shrink-0 text-right text-sm text-haze tabular-nums">
							{job.status === 'queued' ? '' : `${percent}%`}
						</span>
					</div>

					<p class="truncate text-sm text-haze">{destination(job)}</p>

					{#if job.error}
						<p class="text-sm break-words text-coral">{job.error}</p>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>
