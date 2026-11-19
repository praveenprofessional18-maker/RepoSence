import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatSize(bytes) {
  return Number(bytes) >= 1024 * 1024 ? `${(Number(bytes) / 1024 / 1024).toFixed(1)} MB` : `${(Number(bytes) / 1024).toFixed(0)} KB`;
}

export default function FileSizeChart({ files }) {
  const data = [...files].sort((left, right) => right.size - left.size).slice(0, 10).map((file) => ({
    path: file.path,
    sizeKb: Math.round((Number(file.size) || 0) / 1024)
  }));
  return <section className="card min-w-0">
    <div className="card-header"><span className="card-title">Largest files by size</span><span className="text-[9px] text-muted">Top 10 · {data[0] ? formatSize(data[0].sizeKb * 1024) : "—"}</span></div>
    {!data.length ? <p className="p-5 text-center text-xs text-muted">No file-size data is available.</p> : <div className="h-[270px] p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false}/>
          <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 9 }} axisLine={false} tickLine={false} unit=" KB"/>
          <YAxis type="category" dataKey="path" width={130} tick={{ fill: "var(--muted)", fontSize: 8 }} axisLine={false} tickLine={false}/>
          <Tooltip formatter={(value) => [`${value} KB`, "Size"]} contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 10 }}/>
          <Bar dataKey="sizeKb" name="File size" fill="#8b5cf6" radius={[0, 4, 4, 0]}/>
        </BarChart>
      </ResponsiveContainer>
    </div>}
  </section>;
}
