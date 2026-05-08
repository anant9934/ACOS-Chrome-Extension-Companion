// Shim for libraries that expect 'window' to be defined (e.g., graphlib/lodash fallback)
if (typeof window === "undefined") {
  (globalThis as any).window = globalThis;
}
