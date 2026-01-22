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
```

## Creating a Template

Any repo works. Add `.scaffold/` for extras:

```
my-template/
├── .scaffold/
│   ├── config.json
│   └── post-install.sh
└── ...
```

### config.json

```json
{
  "name": "my-stack",
  "description": "What it is",
  "ignore": ["node_modules", "tmp", "*.lock"]
}
```

### post-install.sh

```sh
#!/bin/sh
bun install
```

## Development

```bash
bun install
bun run dev      # run directly
bun run build    # build dist
bun test         # run tests
```

## License

MIT
