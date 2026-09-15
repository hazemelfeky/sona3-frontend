<script setup lang="ts">
import { useInstallPrompt } from '@/composables/useInstallPrompt'

const { visible, canPrompt, showIosInstructions, install, dismiss } = useInstallPrompt()
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="translate-y-full opacity-0"
    leave-active-class="transition duration-200 ease-in"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="visible"
      dir="rtl"
      role="dialog"
      aria-label="تثبيت التطبيق"
      class="fixed inset-x-0 bottom-0 z-[90] px-3 pt-3 print:hidden"
      style="padding-bottom: calc(env(safe-area-inset-bottom) + 0.75rem)"
    >
      <div
        class="mx-auto flex max-w-xl items-start gap-3 rounded-2xl bg-[#12385D] p-4 text-white shadow-2xl ring-1 ring-white/10"
      >
        <img
          src="/pwa-maskable-192x192.png"
          alt=""
          class="size-12 shrink-0 rounded-xl"
        />

        <div class="min-w-0 flex-1 text-start">
          <p class="font-semibold">ثبّت تطبيق صنّاع الحياة</p>

          <p v-if="canPrompt" class="mt-1 text-sm text-white/80">
            ضيف التطبيق على الشاشة الرئيسية عشان تفتحه أسرع وتوصلك الإشعارات.
          </p>

          <p v-else-if="showIosInstructions" class="mt-1 text-sm leading-relaxed text-white/80">
            اضغط على زر المشاركة
            <UIcon name="i-lucide-share" class="mx-0.5 inline-block size-4 align-text-bottom text-white" />
            في المتصفح، وبعدين اختار
            <span class="font-semibold text-white">«إضافة إلى الشاشة الرئيسية»</span>
            (Add to Home Screen).
          </p>

          <div v-if="canPrompt" class="mt-3 flex gap-2">
            <button
              type="button"
              class="cursor-pointer rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#12385D] transition-opacity hover:opacity-90"
              @click="install"
            >
              تثبيت التطبيق
            </button>
            <button
              type="button"
              class="cursor-pointer rounded-xl px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10"
              @click="dismiss"
            >
              لاحقًا
            </button>
          </div>
        </div>

        <button
          type="button"
          aria-label="إغلاق"
          class="shrink-0 cursor-pointer rounded-lg p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          @click="dismiss"
        >
          <UIcon name="i-lucide-x" class="size-5" />
        </button>
      </div>
    </div>
  </Transition>
</template>
