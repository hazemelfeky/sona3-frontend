<script setup lang="ts">
import { computed } from 'vue'
import type { BulkPrintFamily } from '@/features/families/composables/useBulkPrintData'

const props = defineProps<{
  families: BulkPrintFamily[]
  rowsPerPage: number
}>()

const pages = computed(() => {
  const size = props.rowsPerPage
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
          <th>المبلغ</th>
          <th>السبب</th>
          <th>الإمضاء</th>
        </tr>

        <tr v-for="(family, rowIndex) in page" :key="rowIndex">
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
.sheet table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  text-align: center;
}
.sheet th,
.sheet td {
  border: 1px solid #000;
  padding: 12px 8px;
  font-size: 16px;
  height: 35px;
}
.sheet tr {
  page-break-inside: avoid;
  break-inside: avoid;
}
.sheet th {
  font-weight: bold;
  background-color: #fff;
}

.header-top td {
  height: 90px;
  vertical-align: middle;
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

.signature-row td {
  border: none;
  padding-top: 25px;
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

.page {
  page-break-after: always;
}
.page:last-child {
  page-break-after: auto;
}
</style>
