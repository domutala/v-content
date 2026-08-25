# Changesets

Run `pnpm changeset` when a pull request changes the published `v-content`
package. Commit the generated Markdown file with the pull request.

The release workflow collects these files into a version pull request and
publishes the package after that pull request is merged.
