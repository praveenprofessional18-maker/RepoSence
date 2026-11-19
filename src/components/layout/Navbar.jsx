import { Link } from "react-router-dom";
import { ArrowUpRight, Github, Menu, X } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "../common";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return <header className="landing-nav"><div className="container flex h-[68px] items-center justify-between"><Link to="/" className="brand"><span className="brand-mark"><Github size={17} /></span>Repo<span>Sense</span></Link>
    <nav className="hidden items-center gap-8 md:flex"><a href="#features">Features</a><a href="#workflow">How it works</a><a href="#technology">Tech</a></nav>
    <div className="hidden items-center gap-3 md:flex"><ThemeToggle /><Link to="/login" className="nav-login">Log in</Link><Link to="/register" className="btn btn-primary btn-sm">Get started <ArrowUpRight size={14} /></Link></div>
    <div className="flex items-center gap-2 md:hidden"><ThemeToggle /><button className="icon-btn" aria-label="Toggle navigation" onClick={() => setOpen(!open)}>{open ? <X size={18} /> : <Menu size={18} />}</button></div>
  </div>{open && <div className="mobile-nav"><a href="#features" onClick={() => setOpen(false)}>Features</a><a href="#workflow" onClick={() => setOpen(false)}>How it works</a><a href="#technology" onClick={() => setOpen(false)}>Tech</a><Link to="/login">Log in</Link><Link to="/register" className="btn btn-primary">Get started</Link></div>}</header>;
}
