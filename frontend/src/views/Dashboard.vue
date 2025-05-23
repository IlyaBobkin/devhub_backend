<script setup lang="ts">
// Импортируем только Feed
import Feed from '@/views/Feed.vue';

// Если ваш Store или другие зависимости нужны — добавьте их здесь
</script>

<template>
  <div class="dashboard grid grid-cols-12 gap-8">
    <!-- Лента вакансий/резюме -->
    <section class="dashboard__feed col-span-12">
      <Feed />
    </section>
  </div>
</template>

<style scoped>
.dashboard {
  /* Можете добавить отступы или фон для сетки */
}
.dashboard__feed {
  grid-column: span 12;
}
</style>
