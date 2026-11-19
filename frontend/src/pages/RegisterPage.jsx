import { ArrowLeft, ArrowRight, Braces, Eye, EyeOff, GitBranch, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!name.trim() || !email.trim() || !password) {
      setError('Complete all fields to create your account.')
      return
    }
    setError('')
    navigate('/dashboard')
  }

  return (
    <main className="auth-page auth-space">
      <div className="auth-stars" aria-hidden="true" />
      <Link to="/" className="auth-logo"><span><Braces size={19} /></span> RepoSence</Link>
      <Link to="/" className="auth-back"><ArrowLeft size={15} /> Back to home</Link>
      <section className="auth-card auth-space-card" aria-labelledby="register-title">
        <div className="auth-heading">
          <span className="auth-lock"><LockKeyhole size={18} /></span>
          <h2 id="register-title">Create account</h2>
          <p>Start exploring repositories in seconds</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="auth-field"><span>Full name</span><input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" /></label>
          <label className="auth-field"><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
          <label className="auth-field">
            <span>Password</span>
            <div className="auth-password">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create a password" autoComplete="new-password" />
              <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </label>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button type="submit" className="auth-submit">Create account <ArrowRight size={16} /></button>
          <div className="auth-divider"><span>Or continue with</span></div>
          <button type="button" className="auth-github" onClick={() => navigate('/dashboard')}><GitBranch size={17} /> Continue with GitHub</button>
          <p className="auth-signup">Already have an account? <Link to="/login">Sign in</Link></p>
        </form>
      </section>
      <div className="auth-space-caption"><small>START YOUR NEXT ADVENTURE</small><strong>Build with repository clarity.</strong></div>
    </main>
  )
}
