# @raptorthree/scaffold

Scaffold projects from any git repo or local template.

> **npm publish coming soon.** For now, use locally.

## Local Setup

```bash
git clone https://github.com/raptorthree/scaffold.git
cd scaffold
bun install
bun run build

# Add to PATH (run once)
ln -s $(pwd)/dist/index.js ~/.bun/bin/scaffold
chmod +x ~/.bun/bin/scaffold

# Make sure ~/.bun/bin is in your PATH
# Add to ~/.zshrc if not: export PATH="$HOME/.bun/bin:$PATH"
```

Now use from anywhere:

```bash
scaffold my-app --from user/repo
```

## Usage

```bash
# From GitHub (default)
scaffold my-app --from user/repo

# From GitLab
scaffold my-app --from gitlab:user/repo

# From Bitbucket
scaffold my-app --from bitbucket:user/repo

# From local path
scaffold my-app --from ./my-template

# Non-interactive (for CI/AI)
scaffold my-app --from user/repo -y
```

## Creating a Template

Any repo works. Add `.scaffold/` for extras:

```
my-template/
├── .scaffold/
│   ├── config.json
│   ├── pre-install.sh   # runs before copying (optional)
│   └── post-install.sh  # runs after copying (optional)
└── ...
```

**Execution order:**
1. `pre-install.sh` - before files copied (check requirements)
2. Files copied to target
3. Prompts run (if defined in config.json)
4. `post-install.sh` - after copying, with prompt answers

### config.json

```json
{
  "name": "my-stack",
  "description": "What it is",
  "ignore": ["node_modules", "tmp", "*.lock"],
  "prompts": [
    {
      "name": "db",
      "type": "select",
      "message": "Database?",
      "options": ["sqlite", "postgresql", "mysql"],
      "initialValue": "sqlite"
    }
  ]
}
```

### Prompt Types

```json
// Text input
{ "name": "app_name", "type": "text", "message": "App name?", "initialValue": "my-app" }

// Select one
{ "name": "db", "type": "select", "message": "Database?", "options": ["sqlite", "pg"], "initialValue": "sqlite" }

// Yes/No
{ "name": "typescript", "type": "confirm", "message": "TypeScript?", "initialValue": true }

// Select multiple
{ "name": "features", "type": "multiselect", "message": "Features?", "options": ["auth", "api"], "initialValue": ["auth"] }
```

Options can be strings or objects: `{ "value": "pg", "label": "PostgreSQL", "hint": "Recommended" }`

### post-install.sh

```sh
#!/bin/sh

# Prompt answers available as env vars
echo "Using database: $SCAFFOLD_DB"

# Check for non-interactive mode
if [ "$SCAFFOLD_NON_INTERACTIVE" = "1" ]; then
  echo "Running in CI mode..."
fi

bun install
```

**Environment variables:**
- `SCAFFOLD_TARGET` - path to scaffolded project
- `SCAFFOLD_NON_INTERACTIVE` - "1" if `-y` flag used
- `SCAFFOLD_<NAME>` - prompt answers (uppercase)

## Development

```bash
bun install
bun run dev      # run directly
bun run build    # build dist
bun test         # run tests
```

## License

MIT
