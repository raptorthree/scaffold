# @raptorthree/scaffold

Scaffold projects from curated stacks or any GitHub repo. Like shadcn, but for full project templates.

## Usage

```bash
# Interactive mode
npx @raptorthree/scaffold

# From curated stack
npx @raptorthree/scaffold my-app --stack ash-stack

# From any GitHub repo
npx @raptorthree/scaffold my-app --from username/repo

# From local path (for testing your template)
npx @raptorthree/scaffold my-app --from ./my-template

# Skip confirmations
npx @raptorthree/scaffold my-app --from ./my-template -y

# List curated stacks
npx @raptorthree/scaffold --list
```

## Curated Stacks

| Stack | Description |
|-------|-------------|
| `ash-stack` | Rails 8 + Inertia.js + Vue 3 + Vite |

## Creating Your Own Stack

Any GitHub repo can be a stack. Add a `.scaffold` folder for extra features:

```
my-template/
├── .scaffold/
│   ├── config.json       # Ignore patterns, metadata
│   └── post-install.sh   # Runs after scaffold
├── src/
├── package.json
└── ...
```

### `.scaffold/config.json`

```json
{
  "name": "my-stack",
  "description": "My awesome stack",
  "ignore": ["node_modules", "tmp", "*.lock"]
}
```

### `.scaffold/post-install.sh`

```bash
#!/bin/bash
echo "Installing dependencies..."
bun install
```

### Testing Locally

```bash
# Create your template
mkdir my-stack && cd my-stack
# ... build it ...

# Test it
npx @raptorthree/scaffold test-app --from ../my-stack

# Push to GitHub
git push

# Now anyone can use it
npx @raptorthree/scaffold my-app --from yourname/my-stack
```

### Adding to Curated List

Submit a PR adding your stack to `src/stacks.ts`.

## Development

```bash
bun install
bun run dev          # Run locally
bun run build        # Build for publish
```

## License

MIT
