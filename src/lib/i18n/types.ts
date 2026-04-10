/** Recursively make all properties optional — used by it/es/fr translation files */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
