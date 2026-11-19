export default function FeatureCard({ icon: Icon, title, description }) {
  return <article className="feature-card"><span className="feature-icon"><Icon size={18} /></span><h3>{title}</h3><p>{description}</p></article>;
}
