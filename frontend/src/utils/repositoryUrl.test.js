import assert from 'node:assert/strict'
import test from 'node:test'
import { validateRepositoryInput } from './repositoryUrl.js'

test('accepts owner/repository input and surrounding whitespace', () => {
  assert.equal(validateRepositoryInput('  octocat/hello-world  '), '')
})

test('accepts HTTPS GitHub repository URLs with optional .git and trailing slash', () => {
  assert.equal(validateRepositoryInput('https://github.com/octocat/hello-world.git/'), '')
})

test('rejects empty and incomplete repository inputs', () => {
  assert.match(validateRepositoryInput('  '), /Enter a GitHub repository/)
  assert.match(validateRepositoryInput('octocat'), /owner\/repository/)
})

test('rejects non-GitHub, insecure, and lookalike hosts', () => {
  assert.match(validateRepositoryInput('http://github.com/octocat/hello-world'), /secure URL/)
  assert.match(validateRepositoryInput('https://github.com.evil.example/octocat/hello-world'), /secure URL/)
  assert.match(validateRepositoryInput('https://gitlab.com/octocat/hello-world'), /secure URL/)
})

test('rejects extra path segments and URL query or fragment data', () => {
  assert.match(validateRepositoryInput('octocat/hello-world/tree/main'), /owner\/repository/)
  assert.match(validateRepositoryInput('https://github.com/octocat/hello-world?tab=readme'), /query parameters/)
  assert.match(validateRepositoryInput('https://github.com/octocat/hello-world#readme'), /query parameters/)
})
