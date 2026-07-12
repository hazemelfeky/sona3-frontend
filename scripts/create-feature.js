/**
 * Usage:
 *   pnpm run create:feature <feature-name>
 *
 * Creates:
 *   src/features/<feature-name>/
 *     ├── components/
 *     ├── pages/
 *     ├── composables/
 *     ├── store/
 *     ├── api/
 *     ├── types.ts
 *     └── index.vue
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
const files = ['index.vue', 'types.ts']
files.forEach((file) => {
  const filePath = path.join(root, file)
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '')
    console.log(`📄  Created ${path.relative(process.cwd(), filePath)}`)
  }
})

console.log(`✅  Feature “${feature}” scaffolded under src/features/${feature}`)
