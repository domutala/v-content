---
"v-content": patch
---

Parse runtime HTML directly with `hast-util-from-html` to avoid bundling Unified and its CommonJS `extend` dependency in browser components.
