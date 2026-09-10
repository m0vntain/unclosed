export type Page = "radar" | "closed" | "ignored" | "settings";
export type Mutation = (path: string, body?: unknown) => Promise<boolean>;
