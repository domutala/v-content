---
"v-content": patch
---

Parse runtime HTML directly with `hast-util-from-html` to avoid bundling Unified and its CommonJS `extend` dependency in browser components.

Index only visible page text for full-text search, excluding HTML markup, attributes, scripts, and styles.
