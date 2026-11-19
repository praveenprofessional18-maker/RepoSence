import { Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "../common";

const categories = ["documentation", "testing", "structure", "dependencies", "maintainability"];

export default function RadarCompareChart({ metrics, names, healthAvailable, onRunMissing }) {
  const data = categories.map((category) => {
    const metric = metrics.find((item) => item.id === `health-${category}`);
    return {
      category: `${category[0].toUpperCase()}${category.slice(1)}`,
      a: typeof metric?.a === "number" ? metric.a : null,
      b: typeof metric?.b === "number" ? metric.b : null
    };
  });
  const hasScores = data.some((item) => item.a !== null || item.b !== null);
  const missingHealth = healthAvailable.some((available) => !available);

  return <section className="card min-w-0">
    <div className="card-header"><div><h2 className="card-title m-0">Health profile</h2><p className="mb-0 mt-1 text-[9px] text-muted">Available heuristic category scores, out of 100.</p></div></div>
    {!hasScores ? <div className="grid min-h-56 place-items-center p-5 text-center">
      <div><p className="mb-3 text-[10px] text-muted">No Health scores are available to plot.</p>{missingHealth && <Button variant="secondary" size="sm" onClick={onRunMissing}>Run missing scans</Button>}</div>
    </div> : <div className="h-64 p-3" role="img" aria-label="Radar chart comparing health category scores">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--border)"/>
          <PolarAngleAxis dataKey="category" tick={{ fill: "var(--muted)", fontSize: 9 }}/>
          <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "var(--muted)", fontSize: 8 }} axisLine={false}/>
          <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 10 }}/>
          <Radar name={names[0]} dataKey="a" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} connectNulls={false}/>
          <Radar name={names[1]} dataKey="b" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} connectNulls={false}/>
        </RadarChart>
      </ResponsiveContainer>
    </div>}
    <div className="flex flex-wrap gap-3 border-t border-line px-4 py-3 text-[9px] text-muted">
      <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-500"/>Repo A · {names[0]}</span>
      <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500"/>Repo B · {names[1]}</span>
      {missingHealth && <button className="ml-auto text-violet-400 underline" onClick={onRunMissing}>Run missing scans</button>}
    </div>
  </section>;
}
