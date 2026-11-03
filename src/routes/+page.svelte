<script lang="ts">
	import JobQueue from '#lib/components/JobQueue.svelte';
	import SubmitForm from '#lib/components/SubmitForm.svelte';
</script>

<main
	class="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-12 px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(4rem,env(safe-area-inset-bottom))]"
>
	<header class="flex flex-col gap-2">
		<h1 class="text-5xl leading-none font-extrabold tracking-tight [font-stretch:75%]">
			jellydrop
		</h1>
		<p class="text-haze">YouTube audio, filed straight into your Jellyfin libraries.</p>
	</header>

	<SubmitForm />
	<JobQueue />
</main>
