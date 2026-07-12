/**
 * Usage:
 *   pnpm run create:feature <feature-name>
 *
 * Creates:
 *   src/features/<feature-name>/
 *     ├── components/
 *     ├── pages/
 *     │   └── index.vue
 *     ├── composables/
 *     ├── store/
 *     ├── api/
 *     └── types.ts
 *
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const feature = process.argv[2]
if (!feature) {
  console.error('❌  Please pass a feature name, e.g.: pnpm run create-feature.js student')
  process.exit(1)
}

const root = path.resolve(process.cwd(), 'src', 'features', feature)
const dirs = ['components', 'pages', 'composables', 'store', 'api']

// create each directory
dirs.forEach((dir) => {
  const dirPath = path.join(root, dir)
  fs.mkdirSync(dirPath, { recursive: true })
  console.log(`📁  Created ${path.relative(process.cwd(), dirPath)}`)
})

// create files
const indexVueContent = `<script setup lang="ts">
</script>

<template>
  <div>
    <h2>${feature}</h2>
  </div>
</template>

<style scoped>
</style>
`

const files = {
  'pages/index.vue': indexVueContent,
  'types.ts': '',
}
Object.entries(files).forEach(([file, content]) => {
  const filePath = path.join(root, file)
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content)
    console.log(`📄  Created ${path.relative(process.cwd(), filePath)}`)
  }
})

console.log(`✅  Feature “${feature}” scaffolded under src/features/${feature}`)
