export const cache = <T extends (...args: unknown[]) => unknown>(fn: T): T => fn;
