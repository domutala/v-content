<script lang="ts">
import { createColumnHelper, FlexRender, useTable } from "@tanstack/vue-table";

import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createExpandedRowModel,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
} from "@tanstack/vue-table";

export const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  expandedRowModel: createExpandedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

export type DataTableFeatures = typeof features;
</script>

<script lang="ts" setup>
import { computed } from "vue";

const props = defineProps<{ raws: string }>();

const data = computed(() => {
  return JSON.parse(props.raws) as {
    columns: { key: string; label: string }[];
    rows: Record<string, string>[];
  };
});

type TableRow = Record<string, string>;
// Use `accessor` for data columns and `display` for columns without one.
const columnHelper = createColumnHelper<DataTableFeatures, TableRow>();

const columns = columnHelper.columns(
  data.value.columns.map((column) =>
    columnHelper.accessor(column.key, { header: column.label }),
  ),
);

const table = useTable({
  features,
  get data() {
    return data.value.rows;
  },
  get columns() {
    return columns;
  },
});
</script>

<template>
  <div class="border rounded-md">
    <UTable>
      <UTableHeader>
        <UTableRow
          v-for="headerGroup in table.getHeaderGroups()"
          :key="headerGroup.id"
          class="bg-muted dark:bg-muted/10 [&>:not(:last-child)]:border-r"
        >
          <UTableHead v-for="header in headerGroup.headers" :key="header.id">
            <FlexRender v-if="!header.isPlaceholder" :header="header" />
          </UTableHead>
        </UTableRow>
      </UTableHeader>

      <UTableBody>
        <template v-if="table.getRowModel().rows?.length">
          <UTableRow
            v-for="row in table.getRowModel().rows"
            :key="row.id"
            :data-state="row.getIsSelected() && 'selected'"
            class="[&>:not(:last-child)]:border-r"
          >
            <UTableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
              <FlexRender :cell="cell" />
            </UTableCell>
          </UTableRow>
        </template>
        <template v-else>
          <UTableRow>
            <UTableCell :colspan="columns.length" class="h-24 text-center">
              No results.
            </UTableCell>
          </UTableRow>
        </template>
      </UTableBody>
    </UTable>
  </div>
</template>
