import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Github, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { Button, Input } from "../components/common";

export default function AuthPage({ mode }) {
  const registerMode = mode === "register";
  const { login, register, continueAsGuest } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const update = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: "" })); };
  const validate = () => {
    const next = {};
    if (registerMode && !form.name.trim()) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Enter a valid email address.";
    if (form.password.length < 8) next.password = "Password must be at least 8 characters.";
    if (registerMode && form.confirm !== form.password) next.confirm = "Passwords do not match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try { if (registerMode) await register(form); else await login({ email: form.email, password: form.password }); toast.success(registerMode ? "Account created" : "Welcome back"); navigate("/dashboard"); }
    catch (error) { toast.error(error.message || "Unable to continue"); }
    finally { setLoading(false); }
  };
  const guest = () => { continueAsGuest(); navigate("/dashboard"); };
  const strength = form.password.length >= 12 ? 3 : form.password.length >= 8 ? 2 : form.password.length >= 4 ? 1 : 0;
  return <main className="auth-page"><section className="auth-promo"><Link to="/" className="brand"><span className="brand-mark"><Github size={17} /></span>Repo<span>Sense</span></Link><div className="auth-promo-copy"><span className="eyebrow"><Sparkles size={13} /> A BETTER WAY TO EXPLORE CODE</span><h1>Find your footing in any codebase.</h1><p>Clear architecture insights, practical recommendations, and a good place to start.</p></div><div className="text-[10px] text-zinc-500">AI output is advisory. Public repositories only.</div></section>
    <section className="auth-form-wrap"><form className="auth-form" onSubmit={submit} noValidate><Link to="/" className="mb-9 inline-flex md:hidden"><span className="brand"><span className="brand-mark"><Github size={17} /></span>Repo<span>Sense</span></span></Link><h2>{registerMode ? "Create your account" : "Welcome back"}</h2><p>{registerMode ? "Start understanding your repositories in minutes." : "Sign in to continue to your workspace."}</p>
      {registerMode && <div className="auth-field"><label htmlFor="name">Name</label><Input id="name" autoComplete="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Alex Morgan" error={errors.name} /></div>}
      <div className="auth-field"><label htmlFor="email">Email address</label><Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" error={errors.email} /></div>
      <div className="auth-field"><label htmlFor="password">Password</label><div className="password-wrap"><input id="password" className={`input ${errors.password ? "input-error" : ""}`} type={showPassword ? "text" : "password"} autoComplete={registerMode ? "new-password" : "current-password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="At least 8 characters" /><button type="button" className="password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>{errors.password && <span className="mt-1.5 block text-xs text-rose-400">{errors.password}</span>}{registerMode && <div className="strength" aria-label={`Password strength: ${strength} of 3`}>{[1,2,3].map((n) => <i key={n} className={strength >= n ? "on" : ""} />)}</div>}</div>
      {registerMode && <div className="auth-field"><label htmlFor="confirm">Confirm password</label><Input id="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => update("confirm", e.target.value)} placeholder="Enter your password again" error={errors.confirm} /></div>}
      {!registerMode && <label className="checkline"><input type="checkbox" defaultChecked /> Remember me</label>}
      <Button className="auth-submit" type="submit" disabled={loading}>{loading ? "Please wait..." : registerMode ? "Create account" : "Sign in"}</Button>
      <div className="auth-divider">or</div><Button variant="secondary" className="w-full" type="button" onClick={guest}>Continue as guest</Button>
      <div className="auth-switch">{registerMode ? "Already have an account? " : "New to RepoSense? "}<Link to={registerMode ? "/login" : "/register"}>{registerMode ? "Sign in" : "Create an account"}</Link></div>
    </form></section></main>;
}
