import assert from 'node:assert/strict'
import test from 'node:test'
import { buildReadmeMarkdown, validateReadmeInput } from './readmeBuilder.js'

test('builds a README title and description', () => {
  assert.equal(
    buildReadmeMarkdown({ projectName: ' RepoSense ', description: ' Analyze repositories. ' }),
    '# RepoSense\n\nAnalyze repositories.\n'
  )
})

test('includes normalized technology and feature lists', () => {
  assert.equal(
    buildReadmeMarkdown({
      projectName: 'Sample',
      description: 'A project.',
      technologies: 'React, Vite\nNode.js',
      features: 'Search\n\nExport results'
    }),
    '# Sample\n\nA project.\n\n## Tech stack\n- React\n- Vite\n- Node.js\n\n## Features\n- Search\n- Export results\n'
  )
})

test('omits empty optional sections', () => {
  assert.equal(buildReadmeMarkdown({ projectName: 'Sample', description: '' }), '# Sample\n')
})

test('requires a project name and description before export', () => {
  assert.equal(validateReadmeInput({ projectName: '', description: 'A project.' }), 'Enter a project name.')
  assert.equal(validateReadmeInput({ projectName: 'Sample', description: '  ' }), 'Add a short project description.')
  assert.equal(validateReadmeInput({ projectName: 'Sample', description: 'A project.' }), '')
})
