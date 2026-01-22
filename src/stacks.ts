export interface Stack {
  name: string
  description: string
  repo: string // GitHub repo in format "owner/repo"
}

// Curated stacks - submit a PR to add yours!
export const stacks: Stack[] = [
  {
    name: 'ash-stack',
    description: 'Rails 8 + Inertia.js + Vue 3 + Vite',
    repo: 'raptorthree/ash-stack',
  },
  // Add more stacks here:
  // {
  //   name: 'next-stack',
  //   description: 'Next.js 15 + Auth.js + Prisma',
  //   repo: 'username/next-stack',
  // },
]

export function getStack(name: string): Stack | undefined {
  return stacks.find((s) => s.name === name)
}

export function listStacks(): Stack[] {
  return stacks
}
