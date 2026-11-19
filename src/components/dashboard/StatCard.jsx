export default function StatCard({ label, value, footnote, icon: Icon }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={15} /></span></div><div className="stat-value">{value}</div><div className="stat-foot">{footnote}</div></div>;
}
