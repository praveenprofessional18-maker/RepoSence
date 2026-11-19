import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#8b5cf6", "#22c55e", "#f59e0b", "#06b6d4", "#ec4899", "#6366f1", "#14b8a6"];

export default function LanguageCompareChart({ comparison, names }) {
  const shared = new Set(comparison.languages.shared.map((item) => item.toLowerCase()));
  const data = useMemo(() => names.map((name, index) => {
    const breakdown = comparison.languageBreakdown[index === 0 ? "a" : "b"] || {};
    return {
      repository: name,
      ...Object.fromEntries(Object.entries(breakdown).map(([language, percentage]) => [
        language,
        Number.isFinite(Number(percentage)) ? Number(percentage) : 0
      ]))
    };
  }), [comparison.languageBreakdown, names]);
  const languageNames = [...new Set(data.flatMap((item) => Object.keys(item).filter((key) => key !== "repository")))];

  return <section className="card min-w-0">
    <div className="card-header"><div><h2 className="card-title m-0">Language mix</h2><p className="mb-0 mt-1 text-[9px] text-muted">Shared languages are highlighted in green.</p></div></div>
    {!languageNames.length ? <div className="p-5 text-center text-[10px] text-muted">Language percentages are unavailable.</div> :
      <div className="h-64 p-3" role="img" aria-label="Stacked bar chart comparing repository language percentages">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false}/>
            <XAxis type="number" domain={[0, 100]} tick={{ fill: "var(--muted)", fontSize: 9 }} unit="%"/>
            <YAxis type="category" dataKey="repository" width={95} tick={{ fill: "var(--muted)", fontSize: 9 }}/>
            <Tooltip formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]} contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 10 }}/>
            <Legend wrapperStyle={{ fontSize: 9 }}/>
            {languageNames.map((language, index) => <Bar
              key={language}
              dataKey={language}
              stackId="languages"
              fill={shared.has(language.toLowerCase()) ? "#22c55e" : COLORS[index % COLORS.length]}
              maxBarSize={34}
            />)}
          </BarChart>
        </ResponsiveContainer>
      </div>}
    <div className="flex flex-wrap gap-1.5 border-t border-line p-3 text-[9px]">
      {comparison.languages.shared.map((language) => <span className="tag tag-success" key={`shared-${language}`}>{language} shared</span>)}
      {comparison.languages.onlyA.map((language) => <span className="tag" key={`a-${language}`}>{language} · A</span>)}
      {comparison.languages.onlyB.map((language) => <span className="tag" key={`b-${language}`}>{language} · B</span>)}
    </div>
  </section>;
}
