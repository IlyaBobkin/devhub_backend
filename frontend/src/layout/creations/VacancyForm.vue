<script lang="ts" setup>
import { useRouter } from 'vue-router';
import Card from 'primevue/card';
import VacancyEditForm from '@/views/VacancyEditForm.vue';

const router = useRouter();

// Обработка успешного создания
const handleSubmit = () => {
  router.push('/vacancies/my');
};

// Обработка отмены
const handleCancel = () => {
  router.go(-1);
};
</script>

<template>
  <div class="vacancy-create-container">
    <Card class="vacancy-card">
      <template #title>Создание новой вакансии</template>
      <template #content>
        <VacancyEditForm
            :is-edit-mode="false"
            @submit="handleSubmit"
            @cancel="handleCancel"
        />
      </template>
    </Card>
  </div>
</template>

<style scoped>
.vacancy-create-container {
  padding: 1rem;
}

.vacancy-card {
  max-width: 800px;
  margin: 0 auto;
}
</style>
