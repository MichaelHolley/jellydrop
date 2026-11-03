<script lang="ts">
	import { getTargets, submitJob } from '#lib/jobs.remote.js';
	import type { Target } from '#lib/types.js';
	import { submitJobSchema } from '#lib/validation.js';

	const groups = $derived(await getTargets());
	const targets = $derived(groups.flatMap((group) => group.targets));

	let selectedKey = $state<string>();
	const selected = $derived(targets.find((t) => targetKey(t) === selectedKey) ?? targets[0]);

	const form = submitJob.preflight(submitJobSchema);
	const { url, root, path, newFolder, artist, title, album } = form.fields;

	const destination = $derived(targetLabel(selected, newFolder.value()?.trim()));
	const hasTagIssues = $derived(!!(artist.issues() || title.issues() || album.issues()));
	let tagsOpen = $state(false);

	const inputClass =
		'h-12 w-full rounded-xl border border-plum-700 bg-plum-900 px-4 text-base text-mist placeholder:text-haze/60 aria-invalid:border-coral';

	function targetKey(target: Target) {
		return JSON.stringify([target.root, target.path]);
	}

	function targetLabel(target: Target, newFolderName?: string) {
		return [target.root, ...target.path.split('/'), newFolderName].filter(Boolean).join(' / ');
	}

	async function pasteUrl() {
		try {
			url.set((await navigator.clipboard.readText()).trim());
		} catch {
			document.getElementById('url')?.focus();
		}
	}
</script>

{#snippet issues(list: { message: string }[] | undefined)}
	{#each list ?? [] as issue (issue.message)}
		<p class="text-sm text-coral">{issue.message}</p>
	{/each}
{/snippet}

{#snippet tagField(id: string, label: string, field: typeof artist)}
	<div class="flex flex-col gap-2">
		<label for={id} class="text-sm font-medium text-haze">{label}</label>
		<input {id} {...field.as('text')} placeholder="From YouTube" class={inputClass} />
		{@render issues(field.issues())}
	</div>
{/snippet}

<form
	class="flex flex-col gap-6"
	{...form.enhance(async (instance) => {
		if (!(await instance.submit())) return;
		const target = instance.result?.target;
		if (target) selectedKey = targetKey(target);
		for (const field of [url, newFolder, artist, title, album]) field.set('');
	})}
>
	<div class="flex flex-col gap-2">
		<label for="url" class="text-sm font-medium text-haze">YouTube link</label>
		<div class="flex gap-2">
			<input
				id="url"
				{...url.as('url')}
				placeholder="https://youtu.be/…"
				autocomplete="off"
				class={inputClass}
			/>
			<button
				type="button"
				class="h-12 shrink-0 rounded-xl border border-plum-700 px-4 font-medium text-mist hover:bg-plum-800"
				onclick={pasteUrl}
			>
				Paste
			</button>
		</div>
		{@render issues(url.issues())}
	</div>

	<div class="flex flex-col gap-2">
		<label for="target" class="text-sm font-medium text-haze">Save to</label>
		<div class="relative">
			<select
				id="target"
				class={[inputClass, 'appearance-none pr-10']}
				bind:value={() => targetKey(selected), (key) => (selectedKey = key)}
			>
				{#each groups as group (group.root)}
					<optgroup label={group.root}>
						{#each group.targets as target (target.path)}
							<option value={targetKey(target)}>{targetLabel(target)}</option>
						{/each}
					</optgroup>
				{/each}
			</select>
			<svg
				class="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-haze"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				stroke-width="1.75"
				aria-hidden="true"
			>
				<path d="m4 6 4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</div>
		<input {...root.as('hidden', selected.root)} />
		<input {...path.as('hidden', selected.path)} />
		{@render issues(root.issues())}
		{@render issues(path.issues())}
	</div>

	<div class="flex flex-col gap-2">
		<label for="newFolder" class="text-sm font-medium text-haze">
			New folder <span class="font-normal text-haze/70">(optional)</span>
		</label>
		<input
			id="newFolder"
			{...newFolder.as('text')}
			placeholder="Created inside the folder above"
			autocapitalize="words"
			class={inputClass}
		/>
		{@render issues(newFolder.issues())}
		<p class="text-sm text-haze">
			Saves to <span class="text-mist">{destination}</span>
		</p>
	</div>

	<details
		class="group rounded-xl border border-plum-800 px-4"
		open={tagsOpen || hasTagIssues}
		ontoggle={(event) => (tagsOpen = event.currentTarget.open)}
	>
		<summary class="flex h-12 cursor-pointer list-none items-center gap-2 font-medium">
			<svg
				class="size-4 text-haze group-open:rotate-90 motion-safe:transition-transform"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				stroke-width="1.75"
				aria-hidden="true"
			>
				<path d="m6 4 4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
			Fix tags
			<span class="text-sm font-normal text-haze">Artist, title, album</span>
		</summary>
		<div class="flex flex-col gap-4 pb-4">
			{@render tagField('artist', 'Artist', artist)}
			{@render tagField('title', 'Title', title)}
			{@render tagField('album', 'Album', album)}
			<p class="text-sm text-haze">
				Blank fields keep YouTube's tags. Artist also sets the album artist.
			</p>
		</div>
	</details>

	<button
		class="h-13 rounded-xl bg-amber text-lg font-semibold text-plum-950 hover:bg-amber-deep disabled:opacity-60"
		disabled={form.pending > 0}
	>
		{form.pending > 0 ? 'Adding…' : 'Add to library'}
	</button>
</form>
