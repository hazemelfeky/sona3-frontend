<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { formatMoney, formatValue } from '@/utils/format'

// Dummy data — page shows the shape of the finance dashboard, not real figures.

const summaryCards = [
  { key: 'services_done', label: 'خدمات منجزة', value: 128, format: 'number' as const, icon: 'i-lucide-check-circle', color: 'success' },
  { key: 'beneficiary_families', label: 'عدد الأسر المستفيدة', value: 74, format: 'number' as const, icon: 'i-lucide-home', color: 'primary' },
  { key: 'services_cost', label: 'تكلفة الخدمات', value: 512300, format: 'money' as const, icon: 'i-lucide-wallet', color: 'warning' },
]

const balanceCard = { label: 'الرصيد الحالي', value: 187450, icon: 'i-lucide-piggy-bank' }

const topIntentions = [
  { name: 'كسوة الشتاء', amount: 62000 },
  { name: 'مساعدات طارئة', amount: 41500 },
  { name: 'رعاية صحية', amount: 28900 },
]

interface ServiceRow {
  date: string
  family: string
  service: string
  cost: number
}

const recentServices: ServiceRow[] = [
  { date: '2026-08-12', family: 'أسرة محمد عبد الله', service: 'صرف مساعدة مالية', cost: 3500 },
  { date: '2026-08-11', family: 'أسرة سعاد إبراهيم', service: 'كسوة شتوية', cost: 1200 },
  { date: '2026-08-10', family: 'أسرة أحمد فتحي', service: 'رعاية صحية', cost: 4800 },
  { date: '2026-08-08', family: 'أسرة نجوى السيد', service: 'دعم تعليمي', cost: 950 },
  { date: '2026-08-06', family: 'أسرة كريم حسن', service: 'صرف مساعدة مالية', cost: 2700 },
]

const serviceColumns: TableColumn<ServiceRow>[] = [
  { accessorKey: 'date', header: 'التاريخ' },
  { accessorKey: 'family', header: 'الأسرة' },
  { accessorKey: 'service', header: 'نوع الخدمة' },
  { accessorKey: 'cost', header: 'التكلفة' },
]

interface VolunteerRow {
  name: string
  amount: number
}

const topVolunteers: VolunteerRow[] = [
  { name: 'ياسمين طارق', amount: 34500 },
  { name: 'عمر خالد', amount: 29800 },
  { name: 'هدى منصور', amount: 24100 },
  { name: 'محمود سامي', amount: 19700 },
  { name: 'ريم عادل', amount: 15300 },
]

const colorClasses: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-semibold">الرئيسية</h1>

    <!-- Section 1: money -->
    <section class="space-y-4">
      <UPageGrid class="gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UCard v-for="card in summaryCards" :key="card.key">
          <div class="flex items-center gap-3 p-2">
            <div class="shrink-0 rounded-lg p-2" :class="colorClasses[card.color]">
              <UIcon :name="card.icon" class="size-5" />
            </div>
            <div>
              <p class="text-dimmed text-sm">{{ card.label }}</p>
              <p class="text-xl font-semibold">{{ formatValue(card.value, card.format) }}</p>
            </div>
          </div>
        </UCard>
      </UPageGrid>

      <UPageGrid class="gap-4 sm:grid-cols-2">
        <UCard>
          <div class="flex items-center gap-3 p-2">
            <div class="bg-info/10 text-info shrink-0 rounded-lg p-2">
              <UIcon :name="balanceCard.icon" class="size-5" />
            </div>
            <div>
              <p class="text-dimmed text-sm">{{ balanceCard.label }}</p>
              <p class="text-xl font-semibold">{{ formatMoney(balanceCard.value) }}</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header><h3 class="font-medium">أعلى 3 نوايا برصيد</h3></template>
          <ul class="divide-default divide-y">
            <li v-for="(intention, i) in topIntentions" :key="intention.name" class="flex items-center justify-between px-4 py-2 text-sm">
              <span class="flex items-center gap-2">
                <UBadge color="neutral" variant="subtle" size="sm">{{ i + 1 }}</UBadge>
                {{ intention.name }}
              </span>
              <span class="font-medium">{{ formatMoney(intention.amount) }}</span>
            </li>
          </ul>
        </UCard>
      </UPageGrid>
    </section>

    <!-- Section 2: services -->
    <section>
      <UCard>
        <template #header><h3 class="font-medium">آخر 5 خدمات منجزة</h3></template>
        <UTable :data="recentServices" :columns="serviceColumns">
          <template #cost-cell="{ row }">{{ formatMoney(row.getValue('cost')) }}</template>
        </UTable>
      </UCard>
    </section>

    <!-- Section 3: volunteers -->
    <section>
      <UCard>
        <template #header><h3 class="font-medium">أعلى 5 متطوعين جمعاً للمال</h3></template>
        <ul class="divide-default divide-y">
          <li v-for="(volunteer, i) in topVolunteers" :key="volunteer.name" class="flex items-center justify-between px-4 py-2 text-sm">
            <span class="flex items-center gap-2">
              <UBadge color="neutral" variant="subtle" size="sm">{{ i + 1 }}</UBadge>
              {{ volunteer.name }}
            </span>
            <span class="font-medium">{{ formatMoney(volunteer.amount) }}</span>
          </li>
        </ul>
      </UCard>
    </section>
  </div>
</template>
