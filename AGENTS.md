## Project Configuration

- SvelteKit using runes, remote-functions
- TypeScript
- Tailwindcss

## Git

Use conventional commit messages like 'feat:', 'fix:', 'chore:', ...

## Feedback Loop

Use `package.json` scripts over `pnpx` and `npx` commands.
Validate your changes with `pnpm run check`.

## Testing

This is a template for vibe projects - you must not write any tests.

## Documentation

- Only add a comment when complexity is genuinely high **and** the naming does not already convey enough information.
- A comment that restates the function name, parameters, or return type is worthless — delete it. Well-named identifiers are the documentation.
- Never add a comment just because a function is public or exported.
- When a comment truly is warranted, prefer explaining _why_ over _what_, use JSDoc syntax, and keep it short and concise.

---

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
