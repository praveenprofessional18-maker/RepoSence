function normalizeLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function validateReadmeInput({ projectName, description }) {
  if (!projectName.trim()) return 'Enter a project name.'
  if (!description.trim()) return 'Add a short project description.'
  return ''
}

export function buildReadmeMarkdown({ projectName, description, technologies = '', features = '' }) {
  const title = projectName.trim()
  const summary = description.trim()
  const sections = [`# ${title}`]

  if (summary) sections.push(summary)
  const technologyList = normalizeLines(technologies.replace(/,/g, '\n'))
  if (technologyList.length) {
    sections.push(`## Tech stack\n${technologyList.map((item) => `- ${item}`).join('\n')}`)
  }

  const featureList = normalizeLines(features)
  if (featureList.length) {
    sections.push(`## Features\n${featureList.map((item) => `- ${item}`).join('\n')}`)
  }

  return `${sections.join('\n\n')}\n`
}
