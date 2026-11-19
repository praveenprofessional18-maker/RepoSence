import { Skeleton } from "../../common";

export default function SecuritySkeleton() {
  return <div className="grid gap-3" role="status" aria-label="Loading security scan">
    <div className="card flex flex-wrap items-center gap-5 p-5"><Skeleton className="h-28 w-28 rounded-full"/><div className="grid flex-1 gap-3"><Skeleton className="w-1/3"/><Skeleton className="h-8 w-1/4"/></div></div>
    <Skeleton className="h-10 w-full"/>
    {[0, 1, 2].map((item) => <Skeleton className="h-36 w-full" key={item}/>)}
  </div>;
}
