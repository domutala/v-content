// import type { CollectionDefinition } from "./collection/collection.js";
// import type {
//   ResolvedDataEntry,
//   ResolvedPageEntry,
// } from "./collection/resolve.js";
// import type { CollectionQuery, NavigationItem } from "./store/query.js";

// export class ContentNotFoundError extends Error {}

// export interface ContentRequestParams {
//   collection: string;
//   slugs?: string[];
// }

// /**
//  * Resolves a route param object (`:collection` + `*slugs`) to either a
//  * navigation tree (when the last slug is "navigation") or a single entry
//  * looked up by the rebuilt path.
//  */
// export function resolveContent<
//   TCollections extends Record<string, CollectionDefinition<any>>,
// >(
//   collections: TCollections,
//   collection: <K extends keyof TCollections & string>(
//     name: K,
//   ) => CollectionQuery<any>,
//   params: ContentRequestParams,
// ): NavigationItem[] | ResolvedPageEntry<any> | ResolvedDataEntry<any> {
//   const { collection: name, slugs = [] } = params;

//   if (!(name in collections)) {
//     throw new ContentNotFoundError(`unknown collection "${name}"`);
//   }

//   const query = collection(name as keyof TCollections & string);

//   if (slugs.length === 1 && slugs[0] === "navigation") {
//     return query.navigation();
//   }

//   const path = "/" + [name, ...slugs].join("/");
//   const entry = query.path(path).first();

//   if (!entry) {
//     throw new ContentNotFoundError(`entry not found for "${path}"`);
//   }

//   return entry;
// }
