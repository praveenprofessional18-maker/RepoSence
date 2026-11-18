const GITHUB_API = 'https://api.github.com'
const ownerPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/
const repositoryPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/

export function parseGitHubRepository(value) {
  const input = value.trim()
  if (!input) throw new Error('Enter a GitHub repository URL or owner/repository.')

  let path = input
  if (/^https?:\/\//i.test(input)) {
    let url
    try {
      url = new URL(input)
    } catch {
      throw new Error('Enter a valid GitHub repository URL.')
    }

    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.username || url.password) {
      throw new Error('Use a secure URL from github.com.')
    }
    if (url.search || url.hash) throw new Error('Remove query parameters and fragments from the repository URL.')
    path = url.pathname.replace(/^\/|\/$/g, '')
  } else if (input.includes('://')) {
    throw new Error('Enter a GitHub repository URL or owner/repository.')
  }

  const parts = path.split('/')
  if (parts.length !== 2) throw new Error('Enter a repository as owner/repository.')

  const [owner, rawRepository] = parts
  const repo = rawRepository.endsWith('.git') ? rawRepository.slice(0, -4) : rawRepository
  if (!ownerPattern.test(owner) || !repositoryPattern.test(repo)) {
    throw new Error('Enter a valid GitHub owner and repository name.')
  }

  return { owner, repo }
}

async function requestJson(url, signal) {
  const response = await fetch(url, {
    signal,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })

  if (!response.ok) {
    if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
      throw new Error('GitHub API rate limit reached. Try again later.')
    }
    if (response.status === 404) throw new Error('Repository not found or it is not public.')
    throw new Error(`GitHub API request failed (${response.status}).`)
  }

  return response.json()
}

export async function fetchRepositoryContents({ owner, repo }, signal) {
  const encodedOwner = encodeURIComponent(owner)
  const encodedRepo = encodeURIComponent(repo)
  const [metadata, entries] = await Promise.all([
    requestJson(`${GITHUB_API}/repos/${encodedOwner}/${encodedRepo}`, signal),
    requestJson(`${GITHUB_API}/repos/${encodedOwner}/${encodedRepo}/contents`, signal)
  ])

  if (!Array.isArray(entries)) throw new Error('GitHub returned an unexpected repository structure.')

  return {
    fullName: metadata.full_name,
    description: metadata.description || '',
    defaultBranch: metadata.default_branch,
    url: metadata.html_url,
    entries
  }
}
