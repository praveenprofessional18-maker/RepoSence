import { Link } from "react-router-dom";
import { ArrowLeft, Github } from "lucide-react";
export default function NotFound() {
  return <main className="grid min-h-screen place-items-center px-6 text-center"><div><Link to="/" className="brand mx-auto w-fit"><span className="brand-mark"><Github size={17} /></span>Repo<span>Sense</span></Link><div className="mt-14 text-7xl font-bold tracking-tighter text-violet-400">404</div><h1 className="mt-4 text-2xl font-semibold">This page wandered off.</h1><p className="mt-3 text-sm text-muted">The page you’re looking for doesn’t exist or has moved.</p><Link to="/" className="btn btn-primary mt-7"><ArrowLeft size={15} />Back to home</Link></div></main>;
}
