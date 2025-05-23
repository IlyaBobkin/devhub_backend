<template>
  <div class="my-vacancies-container">
    <Toast />
    <h2>Мои вакансии</h2>
    <div v-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="vacancies.length">
      <Card
          v-for="vacancy in vacancies"
          :key="vacancy.id"
          class="vacancy-card"
      >
        <template #title>{{ vacancy.title }}</template>
        <template #content>
          <p class="description">{{ vacancy.description }}</p>
          <p>
            Зарплата: от {{ formatSalary(vacancy.salary_from) }}
            {{ vacancy.salary_to ? `до ${formatSalary(vacancy.salary_to)}` : '' }}
          </p>
          <p>Специализация: {{ getSpecializationName(vacancy.specialization_id) }}</p>
          <p>Уровень: {{ formatExperienceLevel(vacancy.experience_level) }}</p>
          <p>Местоположение: {{ vacancy.location }}</p>
          <p>
            Создано:
            {{ new Date(vacancy.created_at).toLocaleDateString('ru-RU') }}
          </p>
        </template>
        <template #footer>
          <Button
              label="Редактировать"
              icon="pi pi-pencil"
              @click="editVacancy(vacancy)"
          />
          <Button
              label="Удалить"
              icon="pi pi-trash"
              class="p-button-danger ml-2"
              @click="deleteVacancyById(vacancy.id)"
          />
        </template>
      </Card>
    </div>
    <p v-else>У вас пока нет вакансий.</p>

    <!-- Модальное окно для редактирования -->
    <Dialog
        v-model:visible="showEditDialog"
        header="Редактирование вакансии"
        :modal="true"
        :style="{ width: '50vw' }"
        :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
    >
      <VacancyEditForm
          :initialVacancy="selectedVacancy"
          :is-edit-mode="true"
          @submit="handleVacancySubmit"
          @cancel="handleVacancyCancel"
      />
    </Dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useVacancy, API_ADDRESS } from '@/composables/requests';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import VacancyEditForm from './VacancyEditForm.vue';

const router = useRouter();
const userStore = useUserStore();
const toast = useToast();
const { getMyVacancies, deleteVacancy, loading, error } = useVacancy();

const vacancies = ref<Array<any>>([]);
const specializations = ref<Array<{ id: string; name: string }>>([]);
const showEditDialog = ref(false);
const selectedVacancy = ref<any>(null);

const formatSalary = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatExperienceLevel = (level: string) => {
  const levels: Record<string, string> = {
    junior: 'Junior',
    middle: 'Middle',
    senior: 'Senior',
  };
  return levels[level] || level;
};

const getSpecializationName = (id: string) => {
  const spec = specializations.value.find(s => s.id === id);
  return spec ? spec.name : 'Неизвестная специализация';
};

const loadSpecializations = async () => {
  try {
    const res = await fetch(`${API_ADDRESS}/specializations`);
    specializations.value = await res.json();
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Не удалось загрузить специализации',
      life: 3000,
    });
  }
};

const loadVacancies = async () => {
  if (!userStore.currentUser?.id) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Пользователь не авторизован',
      life: 3000,
    });
    return router.push('/auth/login');
  }

  try {
    vacancies.value = await getMyVacancies(userStore.currentUser.id);
    if (!vacancies.value.length) {
      toast.add({
        severity: 'info',
        summary: 'Информация',
        detail: 'У вас пока нет вакансий',
        life: 3000,
      });
    }
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: error.value || e.message,
      life: 3000,
    });
  }
};

onMounted(async () => {
  await loadSpecializations();
  await loadVacancies();
});

const editVacancy = (vacancy: any) => {
  selectedVacancy.value = { ...vacancy };
  showEditDialog.value = true;
};

const handleVacancySubmit = async () => {
  showEditDialog.value = false;
  selectedVacancy.value = null;
  await loadVacancies();
};

const handleVacancyCancel = () => {
  showEditDialog.value = false;
  selectedVacancy.value = null;
};

async function deleteVacancyById(id: string) {
  try {
    await deleteVacancy(id);
    toast.add({
      severity: 'success',
      summary: 'Удалено',
      detail: 'Вакансия удалена',
      life: 3000,
    });
    await loadVacancies();
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: e.message,
      life: 3000,
    });
  }
}
</script>

<style scoped>
.my-vacancies-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.vacancy-card {
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.description {
  max-height: 150px;
  overflow: auto;
  word-wrap: break-word;
}

.loading {
  text-align: center;
  font-size: 1.2rem;
  color: #666;
}

.vacancy-card .p-card-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
