import { Skeleton } from "../common";

export default function CompareSkeleton() {
  return <div className="grid gap-4" role="status" aria-label="Loading repository comparison">
    <div className="grid gap-3 md:grid-cols-2"><Skeleton className="h-36 w-full"/><Skeleton className="h-36 w-full"/></div>
    <Skeleton className="h-24 w-full"/>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <Skeleton className="h-24 w-full" key={index}/>)}</div>
    <Skeleton className="h-96 w-full"/>
  </div>;
}
