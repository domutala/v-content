# v-content

## 1.4.1

### Patch Changes

- d5108b5: Always load compressed content from the Vite virtual module in both client and SSR environments.

## 1.4.0

### Minor Changes

- 5763b2e: Include the previous and next page, without their HTML, when querying page content.
  
  Add SQLite FTS5 search across page titles, descriptions, and content, with
  weighted BM25 ranking and highlighted excerpts.
  
  Allow full-text search across several collections with `queryCollections()`.
