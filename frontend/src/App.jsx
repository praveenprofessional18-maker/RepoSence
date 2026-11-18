import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import Dashboard from './pages/Dashboard'
import PlaceholderPage from './pages/PlaceholderPage'
import AnalyzePage from './pages/AnalyzePage'

const pages = [
  ['explorer', 'Structure Explorer', 'Browse repository folders, files and selected source content.'],
  ['technologies', 'Technology Stack', 'Understand the languages, frameworks and tools used by a repository.'],
  ['insights', 'AI Insights', 'Review AI-generated project explanations and code quality recommendations.'],
  ['readme', 'README Generator', 'Create and preview professional Markdown documentation.'],
  ['history', 'Analysis History', 'Revisit and manage your previous repository analyses.']
]

export default function App() {
  return <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route element={<AppShell />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/analyze" element={<AnalyzePage />} />
      {pages.map(([path, title, description]) => <Route key={path} path={`/${path}`} element={<PlaceholderPage title={title} description={description} />} />)}
  </Route>
  <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
}
