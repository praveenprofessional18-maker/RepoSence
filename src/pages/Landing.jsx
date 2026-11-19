import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Boxes, BrainCircuit, Check, Code2, FileText, GitBranch, Github, LockKeyhole, Radar, ShieldCheck, Sparkles, Star, Telescope } from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "../components/layout/Navbar";
import { Accordion, Button, Input } from "../components/common";
import FeatureCard from "../components/landing/FeatureCard";

const features = [
  { icon: Radar, title: "Repository intelligence", text: "Get a useful overview of any public repository in seconds." },
  { icon: GitBranch, title: "Structure explorer", text: "Navigate files and folders with context, not guesswork." },
  { icon: Boxes, title: "Stack detection", text: "See languages, frameworks, and dependencies at a glance." },
  { icon: BrainCircuit, title: "AI-powered insights", text: "Understand architecture and key modules in plain language." },
  { icon: ShieldCheck, title: "Code quality signals", text: "Surface practical improvement ideas and quality indicators." },
  { icon: FileText, title: "README generator", text: "Create a polished starting point, ready to tailor to your project." },
  { icon: Telescope, title: "Analysis history", text: "Keep your recent repository explorations organized." },
  { icon: LockKeyhole, title: "Privacy by design", text: "Analyze public repositories without sharing your credentials." }
];

export default function Landing() {
  const [url, setUrl] = useState("");
  const navigate = useNavigate();
  const submit = (event) => {
    event.preventDefault();
    if (!/^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(url.trim())) { toast.error("Enter a public GitHub repository URL"); return; }
    navigate(`/analyze?url=${encodeURIComponent(url.trim())}`);
  };
  return <><Navbar /><main>
    <section className="hero"><div className="container hero-grid"><div><div className="eyebrow"><Sparkles size={13} /> YOUR CODEBASE, UNDERSTOOD</div><h1>Understand any<br /><span className="gradient-text">codebase faster.</span></h1><p className="hero-copy">AI-powered insights that help you explore repositories, understand architecture, and get productive from day one.</p><form className="hero-form" onSubmit={submit}><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/owner/repository" aria-label="Public GitHub repository URL" /><Button type="submit">Analyze repo <ArrowRight size={15} /></Button></form><div className="hero-footnote"><Check size={13} className="text-emerald-400" /> Free to explore <span>·</span> Public repositories only <span>·</span> No setup required</div></div>
      <div className="preview-shell"><div className="preview-top"><span>REPOSENSE / ANALYSIS</span><span className="tag tag-success">● COMPLETE</span></div><div className="preview-card"><div className="preview-repo"><div className="preview-avatar"><Github size={17} /></div><div><strong>vercel / next.js</strong><small>The React Framework for the Web</small></div><span className="ml-auto flex items-center gap-1 text-[10px] text-muted"><Star size={12} /> 129k</span></div><div className="preview-stats"><span>LANGUAGES<b>4 detected</b></span><span>DEPENDENCIES<b>86 packages</b></span><span>QUALITY SCORE<b>92 / 100</b></span></div><div className="text-[9px] font-semibold text-muted">LANGUAGE BREAKDOWN</div><div className="preview-bar mt-2"><i /><i /><i /></div><div className="preview-langs"><span>TypeScript 56%</span><span>JavaScript 29%</span><span>Other 15%</span></div><div className="preview-insight"><BrainCircuit size={15} /><div><strong>Architecture insight</strong>Modular monorepo with a clear separation between the framework core and example apps.</div></div><div className="preview-files"><div><span>▾</span> packages/next/src/server</div><div><span>└─</span> next-server.ts</div></div></div></div>
    </div></section>
    <section id="features" className="section"><div className="container"><div className="section-heading"><span className="eyebrow">BUILT FOR DEVELOPERS</span><h2>Everything you need to get oriented</h2><p>From a quick first look to a deeper architectural understanding, RepoSense makes every repository easier to navigate.</p></div><div className="feature-grid">{features.map(({ icon, title, text }) => <FeatureCard icon={icon} title={title} description={text} key={title}/>)}</div></div></section>
    <section id="workflow" className="section section-muted"><div className="container"><div className="section-heading"><span className="eyebrow">A CLEARER FIRST LOOK</span><h2>Four steps from URL to insight</h2><p>No setup, cloning, or searching through docs before you can get started.</p></div><div className="steps">{[{n:"01",title:"Enter a URL",text:"Paste the link to any public GitHub repository."},{n:"02",title:"Explore the code",text:"We map the file tree, languages, and dependencies."},{n:"03",title:"Get AI insights",text:"See a summary, architecture notes, and recommendations."},{n:"04",title:"Generate a README",text:"Create a useful draft and customize it for your project."}].map((step) => <div className="step" key={step.n}><span className="step-num">{step.n}</span><h3>{step.title}</h3><p>{step.text}</p></div>)}</div></div></section>
    <section id="technology" className="section"><div className="container"><div className="section-heading"><span className="eyebrow">MADE FOR THE WEB</span><h2>Modern tools, thoughtfully combined</h2><p>A familiar interface built with an accessible, battle-tested frontend stack.</p></div><div className="tech-list">{["React", "Vite", "Tailwind CSS", "Recharts", "Axios", "GitHub API", "AI insights"].map((item) => <span className="tag" key={item}><Code2 size={13} />{item}</span>)}</div></div></section>
    <section className="section section-muted"><div className="container"><div className="section-heading"><span className="eyebrow">GOOD TO KNOW</span><h2>Frequently asked questions</h2></div><div className="faq"><Accordion items={[
      { title: "Which repositories can I analyze?", content: "The MVP supports public GitHub repositories. Private repositories are not supported." },
      { title: "Does RepoSense change my code?", content: "No. RepoSense is a read-only analysis experience. Generated README content is a draft for you to review and edit." },
      { title: "Can I rely on AI recommendations?", content: "AI output is advisory and may be incomplete or incorrect. Always review insights and verify recommendations against your codebase." },
      { title: "Do I need an account?", content: "You can continue as a guest to explore the demo. Account registration is optional in this MVP." }
    ]} /></div></div></section>
    <section className="section"><div className="container"><div className="cta-box"><span className="eyebrow">YOUR NEXT REPO, READY</span><h2>Make your first impression count.</h2><p>Get a clear picture of a codebase before you write your first line.</p><Link to="/analyze" className="btn btn-primary mt-3">Start exploring <ArrowUpRight size={14} /></Link></div></div></section>
  </main><footer className="footer"><div className="container footer-inner"><Link to="/" className="brand"><span className="brand-mark"><Github size={15} /></span>Repo<span>Sense</span></Link><span>© 2025 RepoSense · AI output is advisory</span></div></footer></>;
}
