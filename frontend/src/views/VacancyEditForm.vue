<script lang="ts" setup>
import { ref, onMounted, watch, PropType } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useVacancy, API_ADDRESS } from '@/composables/requests';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import InputNumber from 'primevue/inputnumber';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

// Определяем пропсы
const props = defineProps({
  initialVacancy: {
    type: Object as PropType<{
      id?: string;
      title: string;
      description: string;
      salary_from: number;
      salary_to?: number;
      company_id: string;
      specialization_id: string;
      experience_level: 'junior' | 'middle' | 'senior';
      location: string;
    } | null>,
    default: null,
  },
  isEditMode: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['submit', 'cancel']);

const router = useRouter();
const userStore = useUserStore();
const toast = useToast();
const { createVacancy, updateVacancy, loading } = useVacancy();

// Форма вакансии
const form = ref({
  user_id: userStore.currentUser?.id || '',
  company_id: userStore.currentUser?.companyId || '',
  title: '',
  description: '',
  salary_from: 0,
  salary_to: undefined as number | undefined,
  specialization_id: '',
  experience_level: '' as 'junior' | 'middle' | 'senior',
  location: '',
  id: '' as string | undefined,
});

// Ошибки валидации
const errors = ref({
  title: '',
  description: '',
  salary_from: '',
  specialization_id: '',
  experience_level: '',
  location: '',
});

// Специализации
const specializations = ref<Array<{ id: string; name: string }>>([]);

// Уровни опыта
const experienceLevels = [
  { label: 'Junior', value: 'junior' },
  { label: 'Middle', value: 'middle' },
  { label: 'Senior', value: 'senior' },
];

// Проверка авторизации
onMounted(() => {
  if (!userStore.currentUser || userStore.currentUser.role !== 'company_owner') {
    router.push('/auth/login');
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Только работодатели могут создавать вакансии',
      life: 3000,
    });
  }
});

// Загрузка специализаций
onMounted(async () => {
  try {
    const response = await fetch(`${API_ADDRESS}/specializations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) {
      specializations.value = await response.json();
    } else {
      toast.add({
        severity: 'error',
        summary: 'Ошибка',
        detail: 'Не удалось загрузить специализации',
        life: 3000,
      });
    }
  } catch (error) {
    console.error('Ошибка загрузки специализаций:', error);
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Ошибка сервера при загрузке специализаций',
      life: 3000,
    });
  }
});

// Заполнение формы при редактировании
watch(
    () => props.initialVacancy,
    (newVacancy) => {
      if (newVacancy) {
        form.value = {
          user_id: userStore.currentUser?.id || '',
          company_id: userStore.currentUser?.companyId || '',
          id: newVacancy.id,
          title: newVacancy.title,
          description: newVacancy.description,
          salary_from: newVacancy.salary_from,
          salary_to: newVacancy.salary_to,
          specialization_id: newVacancy.specialization_id,
          experience_level: newVacancy.experience_level,
          location: newVacancy.location,
        };
      }
    },
    { immediate: true }
);

// Валидация формы
const validateForm = () => {
  let isValid = true;
  errors.value = {
    title: '',
    description: '',
    salary_from: '',
    specialization_id: '',
    experience_level: '',
    location: '',
  };

  if (!form.value.title.trim()) {
    errors.value.title = 'Введите название вакансии';
    isValid = false;
  }

  if (!form.value.description.trim()) {
    errors.value.description = 'Введите описание вакансии';
    isValid = false;
  }

  if (!form.value.salary_from || form.value.salary_from <= 0) {
    errors.value.salary_from = 'Укажите корректную зарплату';
    isValid = false;
  } else if (form.value.salary_from > 999999.99) {
    errors.value.salary_from = 'Зарплата не должна превышать 999999.99';
    isValid = false;
  }

  if (form.value.salary_to && form.value.salary_to <= 0) {
    errors.value.salary_from = 'Зарплата до должна быть больше 0';
    isValid = false;
  } else if (form.value.salary_to && form.value.salary_to > 999999.99) {
    errors.value.salary_from = 'Зарплата до не должна превышать 999999.99';
    isValid = false;
  }

  if (form.value.salary_to && form.value.salary_to < form.value.salary_from) {
    errors.value.salary_from = 'Зарплата до не может быть меньше зарплаты от';
    isValid = false;
  }

  if (!form.value.specialization_id) {
    errors.value.specialization_id = 'Выберите специализацию';
    isValid = false;
  }

  if (!form.value.experience_level) {
    errors.value.experience_level = 'Выберите уровень опыта';
    isValid = false;
  }

  if (!form.value.location.trim()) {
    errors.value.location = 'Укажите местоположение';
    isValid = false;
  }

  return isValid;
};

// Отправка формы
const handleSubmit = async () => {
  if (!validateForm()) return;

  if (userStore.currentUser?.role === 'company_owner' && !userStore.currentUser.companyId) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Компания не найдена',
      life: 3000,
    });
    return;
  }

  try {
    const { id, ...formData } = form.value; // Исключаем id из formData

    if (props.isEditMode && id) {
      await updateVacancy(id, formData);
      toast.add({
        severity: 'success',
        summary: 'Успех',
        detail: 'Вакансия успешно обновлена',
        life: 3000,
      });
    } else {
      await createVacancy(formData);
      toast.add({
        severity: 'success',
        summary: 'Успех',
        detail: 'Вакансия успешно создана',
        life: 3000,
      });
    }

    emit('submit');
  } catch (error) {
    console.error('Ошибка:', props.isEditMode ? 'обновления' : 'создания', 'вакансии:', error);
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: `Не удалось ${props.isEditMode ? 'обновить' : 'создать'} вакансию`,
      life: 3000,
    });
  }
};

// Отмена
const handleCancel = () => {
  emit('cancel');
};
</script>


<template>
  <div class="vacancy-form-container">
    <Toast />
    <form @submit.prevent="handleSubmit" class="vacancy-form">
      <!-- Название вакансии -->
      <div class="field">
        <label for="title" class="block">Название вакансии*</label>
        <InputText
            id="title"
            v-model="form.title"
            maxlength="255"
            class="w-full"
            :class="{ 'p-invalid': errors.title }"
        />
        <small v-if="errors.title" class="p-error">{{ errors.title }}</small>
      </div>

      <!-- Описание -->
      <div class="field">
        <label for="description" class="block">Описание*</label>
        <Textarea
            id="description"
            v-model="form.description"
            maxlength="2000"
            rows="5"
            class="w-full textarea-limited resize-none"
        />
        <small v-if="errors.description" class="p-error">{{ errors.description }}</small>
      </div>

      <!-- Зарплата -->
      <div class="grid">
        <div class="col-6">
          <label for="salary_from" class="block">Зарплата от*</label>
          <InputNumber
              id="salary_from"
              v-model="form.salary_from"
              class="w-full"
              :class="{ 'p-invalid': errors.salary_from }"
              :max="999999.99"
              :min="0"
          />
          <small v-if="errors.salary_from" class="p-error">{{ errors.salary_from }}</small>
        </div>
        <div class="col-6">
          <label for="salary_to" class="block">Зарплата до</label>
          <InputNumber
              id="salary_to"
              v-model="form.salary_to"
              class="w-full"
              :max="999999.99"
              :min="0"
              :allowEmpty="true"
          />
        </div>
      </div>

      <!-- Специализация -->
      <div class="field">
        <label for="specialization" class="block">Специализация*</label>
        <Dropdown
            id="specialization"
            v-model="form.specialization_id"
            :options="specializations"
            optionLabel="name"
            optionValue="id"
            placeholder="Выберите специализацию"
            class="w-full"
            :class="{ 'p-invalid': errors.specialization_id }"
        />
        <small v-if="errors.specialization_id" class="p-error">{{ errors.specialization_id }}</small>
      </div>

      <!-- Уровень опыта -->
      <div class="field">
        <label for="experience" class="block">Уровень опыта*</label>
        <Dropdown
            id="experience"
            v-model="form.experience_level"
            :options="experienceLevels"
            optionLabel="label"
            optionValue="value"
            placeholder="Выберите уровень"
            class="w-full"
            :class="{ 'p-invalid': errors.experience_level }"
        />
        <small v-if="errors.experience_level" class="p-error">{{ errors.experience_level }}</small>
      </div>

      <!-- Локация -->
      <div class="field">
        <label for="location" class="block">Местоположение*</label>
        <InputText
            id="location"
            v-model="form.location"
            class="w-full"
            :class="{ 'p-invalid': errors.location }"
        />
        <small v-if="errors.location" class="p-error">{{ errors.location }}</small>
      </div>

      <!-- Кнопки -->
      <div class="flex justify-content-end mt-4">
        <Button
            label="Отменить"
            type="button"
            class="p-button-outlined p-button-secondary mr-2"
            @click="handleCancel"
        />
        <Button
            :label="props.isEditMode ? 'Сохранить изменения' : 'Создать вакансию'"
            type="submit"
            :loading="loading"
        />
      </div>
    </form>
  </div>
</template>


<style scoped>
.textarea-limited textarea {
  max-height: 150px;
}

.vacancy-form-container {
  padding: 1rem;
}

.vacancy-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  margin-bottom: 1rem;
}

.grid {
  display: flex;
  gap: 1rem;
}

.col-6 {
  flex: 1;
}

label {
  font-weight: 500;
  margin-bottom: 0.5rem;
  display: block;
}

.p-error {
  color: #dc3545;
}
</style>
