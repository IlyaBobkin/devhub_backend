<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useResume } from '@/composables/requests';
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Toast from 'primevue/toast';
import ResumeEditForm from '@/views/ResumeEditForm.vue';

const router = useRouter();
const toast = useToast();
const { getMyResume, deleteResume, loading } = useResume();

const resume = ref<any>(null);
const showEdit = ref(false);

async function reload() {
  showEdit.value = false;
  try {
    resume.value = await getMyResume();
  } catch (e: any) {
    // если контроллер вернул 404 с текстом "Резюме не найдено" — показываем info
    if (e.message === 'Резюме не найдено') {
      resume.value = null;
      toast.add({
        severity: 'info',
        summary: 'Информация',
        detail: 'У вас пока нет резюме',
        life: 3000,
      });
    } else {
      toast.add({
        severity: 'error',
        summary: 'Ошибка',
        detail: e.message,
        life: 3000,
      });
    }
  }
}

onMounted(reload);

function expLabel(l: string) {
  return { junior: 'Junior', middle: 'Middle', senior: 'Senior' }[l] || l;
}

async function onDelete() {
  try {
    await deleteResume(resume.value.id);
    toast.add({ severity: 'success', summary: 'Удалено', detail: 'Резюме удалено', life: 3000 });
    resume.value = null;
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Ошибка', detail: e.message, life: 3000 });
  }
}

async function onUpdated() {
  showEdit.value = false;
  await reload();
}
</script>


<template>
  <div class="my-resume-page">
    <Toast />
    <h2>Моё резюме</h2>

    <div v-if="loading" class="loading">Загрузка...</div>

    <Card class="resume-card" v-else>
      <template #title>
        {{ resume ? resume.title : 'Создание резюме' }}
      </template>

      <template #content>
        <!-- Если резюме есть — показываем детали -->
        <div v-if="resume">
          <p class="description">{{ resume.description }}</p>
          <p>Ожидаемая з/п: {{ resume.expected_salary ?? 'не указана' }}</p>
          <p>Специальность: {{ resume.specialization_name }}</p>
          <p>Уровень: {{ expLabel(resume.experience_level) }}</p>
          <p>Локация: {{ resume.location }}</p>
        </div>

        <!-- Если нет — показываем форму создания -->
        <div v-else>
          <ResumeEditForm
              :initialResume="null"
              :is-edit-mode="false"
              @submit="reload"
              @cancel="reload"
          />
        </div>
      </template>

      <template #footer>
        <div v-if="resume">
          <Button
              label="Редактировать"
              icon="pi pi-pencil"
              class="p-button-text"
              @click="showEdit = true"
          />
          <Button
              label="Удалить"
              icon="pi pi-trash"
              class="p-button-danger ml-2"
              @click="onDelete"
          />
        </div>
      </template>
    </Card>

    <!-- Диалог редактирования -->
    <Dialog v-model:visible="showEdit" header="Редактирование резюме" modal>
      <ResumeEditForm
          :initialResume="resume"
          :is-edit-mode="true"
          @submit="onUpdated"
          @cancel="showEdit = false"
      />
    </Dialog>
  </div>
</template>


<style scoped>
.my-resume-page {
  max-width: 600px;
  margin: 2rem auto;
}

.resume-card {
  background: var(--surface-card);
  padding: 1rem;
}

.loading {
  text-align: center;
  margin: 2rem 0;
}

.description {
  max-height: 150px;
  overflow: auto;
  word-wrap: break-word;
}


</style>
