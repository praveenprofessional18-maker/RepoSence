export function buildReadmeMarkdown({ projectName, description }) {
  const title = projectName.trim()
  const summary = description.trim()
  const sections = [`# ${title}`]

  if (summary) sections.push(summary)

  return `${sections.join('\n\n')}\n`
}
