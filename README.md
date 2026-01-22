# @raptorthree/scaffold

Scaffold projects from any git repo or local template.

> **npm publish coming soon.** For now, use locally.

## Local Usage

```bash
# Clone and install
git clone https://github.com/raptorthree/scaffold.git
cd scaffold
bun install
bun link

# Now use from anywhere
scaffold my-app --from user/repo
```

## Examples

```bash
# From GitHub (default)
scaffold my-app --from user/repo

# From GitLab
scaffold my-app --from gitlab:user/repo

# From Bitbucket
scaffold my-app --from bitbucket:user/repo

# From local path
scaffold my-app --from ./my-template

# Skip prompts
scaffold my-app --from ./template -y
```

## Creating a Stack

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
bun run dev
bun run build
bun test
```

## License

MIT
