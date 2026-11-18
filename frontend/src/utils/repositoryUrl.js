const ownerPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/
const repositoryPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/

export function validateRepositoryInput(value) {
  const input = value.trim()
  if (!input) return 'Enter a GitHub repository URL or owner/repository.'

  let path = input
  if (/^https?:\/\//i.test(input)) {
    let url
    try {
      url = new URL(input)
    } catch {
      return 'Enter a valid GitHub repository URL.'
    }

    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.username || url.password) {
      return 'Use a secure URL from github.com.'
    }
    if (url.search || url.hash) return 'Remove query parameters and fragments from the repository URL.'
    path = url.pathname.replace(/^\/|\/$/g, '')
  } else if (input.includes('://')) {
    return 'Enter a GitHub repository URL or owner/repository.'
  }

  const parts = path.split('/')
  if (parts.length !== 2) return 'Enter a repository as owner/repository.'

  const [owner, rawRepository] = parts
  const repository = rawRepository.endsWith('.git') ? rawRepository.slice(0, -4) : rawRepository
  if (!ownerPattern.test(owner) || !repositoryPattern.test(repository)) {
    return 'Enter a valid GitHub owner and repository name.'
  }

  return ''
}
