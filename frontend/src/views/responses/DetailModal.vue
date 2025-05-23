<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useVacancy, useResume } from '@/composables/requests';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

interface Props {
  modelValue: boolean;
  type: 'vacancy' | 'resume' | 'resumeByUser';
  id: string;
}


const props = defineProps<Props>();
const emit  = defineEmits(['update:modelValue']);

const visible = computed<boolean>({
  get:  () => props.modelValue,
  set: v => emit('update:modelValue', v)
});

const loading = ref(false);
const item: any = ref(null);

const { getVacancyById: fetchVacancy } = useVacancy();
const { getResumeById: fetchResumeId,  getResumeByUserId: fetchResumeUser} = useResume();

const isVacancy = computed(() => props.type === 'vacancy');

async function loadItem() {
  loading.value = true;
  try {
    if (props.type === 'vacancy') {
      item.value = await fetchVacancy(props.id);
    } else if (props.type === 'resume') {
      item.value = await fetchResumeId(props.id);
    } else {
      item.value = await fetchResumeUser(props.id);
    }
  } finally {
    loading.value = false;
  }
}


watch(visible, v => {
  if (v) loadItem();
});
</script>

<template>
  <Dialog
      v-model:visible="visible"
      :header="isVacancy ? 'Детали вакансии' : 'Детали резюме'"
      :modal="true"
      :closable="true"
      :style="{ width: '90%', maxWidth: '500px' }"
  >
    <div class="detail-container">
      <div v-if="loading" class="detail-loading">Загрузка…</div>

      <div v-else-if="item" class="detail-content">
        <h2 class="detail-title">{{ item.title }}</h2>
        <p class="detail-desc">{{ item.description }}</p>
        <ul class="detail-list">
          <li v-if="isVacancy">Компания: <strong>{{ item.company_name }}</strong></li>
          <li v-else>Соискатель: <strong>{{ item.applicant_name }}</strong></li>
          <li>Локация: <strong>{{ item.location }}</strong></li>
          <li v-if="isVacancy">
            Зарплата:
            <strong>
              {{ item.salary_from }}
              <span v-if="item.salary_to">– {{ item.salary_to }}</span>
            </strong>
          </li>
          <li v-else-if="item.expected_salary">
            Ожидаемая з/п: <strong>{{ item.expected_salary }}</strong>
          </li>
          <li>Специализация: <strong>{{ item.specialization_name }}</strong></li>
          <li>Уровень: <strong>{{ item.experience_level }}</strong></li>
          <li>Создано: <strong>{{ new Date(item.created_at).toLocaleDateString('ru-RU') }}</strong></li>
        </ul>
      </div>

      <div v-else class="detail-empty">Не найдено</div>
    </div>

    <template #footer>
      <Button label="Закрыть" icon="pi pi-times" @click="visible = false" class="p-button-text" />
    </template>
  </Dialog>
</template>

<style scoped>
.detail-container {
  min-height: 150px;
  max-height: 60vh;
  overflow-y: auto;
  padding: 0.5rem 1rem;
}

.detail-loading,
.detail-empty {
  text-align: center;
  color: #666;
  padding: 2rem 0;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-title {
  margin: 0;
  font-size: 1.25rem;
  color: #3260a8;
}

.detail-desc {
  margin: 0;
  color: #333;
}

.detail-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.detail-list li {
  margin: 0.25rem 0;
  font-size: 0.95rem;
  color: #444;
}

.p-dialog .p-dialog-header {
  background-color: #3260a8;
  color: white;
  font-weight: 500;
}

.p-dialog .p-dialog-content {
  padding: 0;
}

.p-dialog .p-dialog-footer {
  border-top: 1px solid #ececec;
  padding: 0.5rem 1rem;
}
</style>
