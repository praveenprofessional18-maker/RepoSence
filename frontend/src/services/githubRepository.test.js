import assert from 'node:assert/strict'
import test from 'node:test'
import { countRepositoryEntries, filterRepositoryEntries, parseGitHubRepository } from './githubRepository.js'

test('parses owner/repository and HTTPS GitHub URL inputs', () => {
  assert.deepEqual(parseGitHubRepository('octocat/hello-world'), { owner: 'octocat', repo: 'hello-world' })
  assert.deepEqual(parseGitHubRepository('https://github.com/octocat/hello-world.git/'), { owner: 'octocat', repo: 'hello-world' })
})

test('rejects unsupported hosts and malformed repository paths', () => {
  assert.throws(() => parseGitHubRepository('https://github.com.evil.example/a/b'), /secure URL/)
  assert.throws(() => parseGitHubRepository('owner'), /owner\/repository/)
  assert.throws(() => parseGitHubRepository('owner/repo/tree/main'), /owner\/repository/)
})

test('filters by name and entry type while sorting folders first', () => {
  const entries = [
    { name: 'zeta.txt', path: 'zeta.txt', type: 'file' },
    { name: 'src', path: 'src', type: 'dir' },
    { name: 'README.md', path: 'README.md', type: 'file' }
  ]

  assert.deepEqual(filterRepositoryEntries(entries).map(({ name }) => name), ['src', 'README.md', 'zeta.txt'])
  assert.deepEqual(filterRepositoryEntries(entries, 'readme').map(({ name }) => name), ['README.md'])
  assert.deepEqual(filterRepositoryEntries(entries, '', 'folders').map(({ name }) => name), ['src'])
})

test('counts directories separately from file-like entries', () => {
  assert.deepEqual(countRepositoryEntries([
    { type: 'dir' },
    { type: 'file' },
    { type: 'symlink' }
  ]), { folders: 1, files: 2 })
})
