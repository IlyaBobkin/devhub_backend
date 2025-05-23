<script setup>
import { onMounted } from 'vue';
import { useUserStore } from '@/stores/userStore.ts';

const userStore = useUserStore();

onMounted(() => {
  userStore.loadFromStorage();
});
</script>

<template>
  <router-view />
</template>

<style scoped></style>