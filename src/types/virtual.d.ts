declare module "virtual:v-content/compressed" {
  const value: { compresseds: Record<string, string>; token: string };
  export default value;
}

interface ImportMeta {
  readonly env?: Record<string, unknown>;
}
