import { repositories } from "./data";

export const mockHistory = repositories.map((repo, index) => ({ ...repo, analyzedAt: new Date(Date.now() - index * 86400000 * 2).toISOString(), status: "Completed" }));
