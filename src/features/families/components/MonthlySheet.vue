<script setup lang="ts">
import { computed } from 'vue'
import type { BulkPrintFamily } from '@/features/families/composables/useBulkPrintData'

const props = withDefaults(
  defineProps<{
    families: BulkPrintFamily[]
    rowsPerPage: number
    amountLabel?: string
  }>(),
  { amountLabel: 'المبلغ' },
)

const pages = computed(() => {
  const size = props.rowsPerPage

  // No families (the "download blank sheet" flow) still prints one page of
  // empty rows — no need for a separate blank-mode prop.
  if (props.families.length === 0) return [Array(size).fill(null)]

  const chunks: (BulkPrintFamily | null)[][] = []
  for (let i = 0; i < props.families.length; i += size) {
    const chunk: (BulkPrintFamily | null)[] = props.families.slice(i, i + size)
    while (chunk.length < size) chunk.push(null)
    chunks.push(chunk)
  }
  return chunks
})
</script>

<template>
  <div class="sheet" dir="rtl">
    <div v-for="(page, pageIndex) in pages" :key="pageIndex" class="page">
      <table>
        <colgroup>
          <col class="col-name" />
          <col class="col-mobile" />
          <col class="col-id" />
          <col class="col-amount" />
          <col class="col-reason" />
          <col class="col-sign" />
        </colgroup>

        <tr class="header-top">
          <td class="title-cell" colspan="5">
            جمعية صناع الحياة المحلة الكبرى<br />
            المشهرة برقم 1622 لسنة 2012
          </td>
          <td class="logo-cell">
            <img src="/logo.svg" alt="" class="logo" />
          </td>
        </tr>

        <tr>
          <th>الاسم</th>
          <th>رقم الموبايل</th>
          <th>الرقم القومي</th>
          <th>{{ amountLabel }}</th>
          <th>السبب</th>
          <th>الإمضاء</th>
        </tr>

        <tr v-for="(family, rowIndex) in page" :key="rowIndex" class="data-row">
          <td>{{ family?.name ?? '' }}</td>
          <td>{{ family?.phone ?? '' }}</td>
          <td>{{ family?.nationalId ?? '' }}</td>
          <td></td>
          <td></td>
          <td></td>
        </tr>

        <tr class="signature-row">
          <td colspan="2"></td>
          <td>أمين الصندوق</td>
          <td></td>
          <td colspan="2">رئيس مجلس الإدارة</td>
        </tr>
      </table>
    </div>
  </div>
</template>

<style>
@page {
  size: A4 landscape;
  margin: 1cm;
}

.sheet {
  font-family: Arial, sans-serif;
  color: #000;
  background: #fff;
}
.page {
  page-break-after: always;
  /* Printable area of A4 landscape minus the 1cm @page margin on each side. */
  height: 19cm;
}
.page:last-child {
  page-break-after: auto;
}
.sheet table {
  width: 100%;
  height: 100%;
  border-collapse: collapse;
  background: #fff;
  text-align: center;
  table-layout: fixed;
}
.sheet th,
.sheet td {
  /* height on a content-box cell is on top of padding+border, not
     inclusive of it — with padding: 12px that alone pushed the row sum
     past one physical page and spilled the signature row onto a 2nd
     page. border-box makes the declared heights below authoritative. */
  box-sizing: border-box;
  border: 1px solid #000;
  padding: 6px 8px;
  font-size: 16px;
  vertical-align: middle;
}
.sheet tr {
  page-break-inside: avoid;
  break-inside: avoid;
}
.sheet th {
  font-weight: bold;
  background-color: #fff;
  height: 0.9cm;
}

.header-top td {
  height: 2.3cm;
  font-weight: bold;
  font-size: 18px;
}
.title-cell {
  text-align: center;
  line-height: 1.6;
}
.logo-cell {
  text-align: center;
}
.logo {
  margin-inline: auto;
  max-height: 70px;
  print-color-adjust: exact;
}

/* Rows sized so 8 of them plus the header/signature rows sum well under
   the 19cm page (~16.3cm) — .page's own height: 19cm + table height:
   100% then has browsers distribute the ~2.7cm slack across all rows
   proportionally, filling the page without risking a 2nd-page spill. */
.data-row td {
  height: 1.6cm;
}

.signature-row td {
  height: 1.3cm;
  border: none;
  font-weight: bold;
  font-size: 18px;
  text-align: center;
}

.col-name {
  width: 25%;
}
.col-mobile {
  width: 15%;
}
.col-id {
  width: 20%;
}
.col-amount {
  width: 10%;
}
.col-reason {
  width: 15%;
}
.col-sign {
  width: 15%;
}
</style>
