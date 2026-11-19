import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#8b5cf6", "#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#14b8a6", "#06b6d4", "#64748b"];

export default function FileTypeChart({ distribution }) {
  return <section className="card min-w-0">
    <div className="card-header"><span className="card-title">File type distribution</span><span className="tag">{distribution.reduce((sum, item) => sum + item.count, 0)} files</span></div>
    {!distribution.length ? <p className="p-5 text-center text-xs text-muted">No file types are available.</p> : <div className="flex flex-col items-center gap-3 p-3 sm:flex-row">
      <div className="h-[190px] w-full max-w-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={distribution} dataKey="count" nameKey="type" innerRadius={52} outerRadius={78} paddingAngle={2}>
              {distribution.map((item, index) => <Cell key={item.type} fill={COLORS[index % COLORS.length]}/>)}
            </Pie>
            <Tooltip formatter={(value, name) => [`${value} files`, name]} contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 10 }}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid w-full grid-cols-2 gap-2 text-[9px]">
        {distribution.slice(0, 8).map((item, index) => <div className="flex min-w-0 items-center gap-2" key={item.type}>
          <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLORS[index % COLORS.length] }}/>
          <span className="truncate">{item.type}</span><span className="ml-auto text-muted">{item.count}</span>
        </div>)}
      </div>
    </div>}
  </section>;
}
