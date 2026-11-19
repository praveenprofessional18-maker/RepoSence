import { Skeleton } from "../../common";

export default function HealthSkeleton() {
  return <div className="grid gap-4" aria-label="Loading code health report">
    <Skeleton className="h-40 w-full"/>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <Skeleton className="h-24 w-full" key={index}/>)}</div>
    <Skeleton className="h-48 w-full"/>
    <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-72 w-full"/><Skeleton className="h-72 w-full"/></div>
    <Skeleton className="h-64 w-full"/>
  </div>;
}
