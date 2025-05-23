<script setup lang="ts">
import { ref, onMounted, watch, PropType } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useResume, API_ADDRESS } from '@/composables/requests';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import InputNumber from 'primevue/inputnumber';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
  initialResume: {
    type: Object as PropType<any>,
    default: null,
  },
  isEditMode: { type: Boolean, default: false },
});

const emit = defineEmits(['submit', 'cancel']);
const router = useRouter();
const userStore = useUserStore();
const toast = useToast();
const { createResume, getMyResume, updateResume, loading } = useResume();

const form = ref({
  id: '' as string,
  user_id: userStore.currentUser?.id || '',
  title: '',
  description: '',
  expected_salary: undefined as number|undefined,
  specialization_id: '',
  experience_level: '' as 'junior'|'middle'|'senior',
  location: '',
});

const errors = ref({
  title: '',
  description: '',
  specialization_id: '',
  experience_level: '',
  location: '',
});

const specializations = ref<{id:string;name:string}[]>([]);
const experienceLevels = [
  { label: 'Junior', value: 'junior' },
  { label: 'Middle', value: 'middle' },
  { label: 'Senior', value: 'senior' },
];

// Защита и загрузка справочников
onMounted(async () => {
  if (!userStore.currentUser || userStore.currentUser.role !== 'applicant') {
    toast.add({ severity:'error', summary:'Ошибка', detail:'Только соискатели могут работать с резюме' });
    router.push('/auth/login');
    return;
  }
  // загрузить специализации
  try {
    const res = await fetch(`${API_ADDRESS}/specializations`);
    specializations.value = await res.json();
  } catch {
    toast.add({ severity:'error', summary:'Ошибка', detail:'Не загрузить специализации' });
  }
});

// Если редактирование — подгрузим данные
watch(() => props.initialResume, (v) => {
  if (v) {
    form.value = { ...v, expected_salary: v.expected_salary };
  }
}, { immediate: true });

function validate() {
  let ok = true;
  errors.value = { title:'', description:'', specialization_id:'', experience_level:'', location:'' };

  if (!form.value.title)       { errors.value.title = 'Обязательное поле'; ok = false; }
  if (!form.value.description) { errors.value.description = 'Обязательное поле'; ok = false; }
  if (!form.value.specialization_id) { errors.value.specialization_id = 'Выберите'; ok = false; }
  if (!form.value.experience_level)  { errors.value.experience_level = 'Выберите'; ok = false; }
  if (!form.value.location)    { errors.value.location = 'Обязательное поле'; ok = false; }

  return ok;
}

async function onSubmit() {
  if (!validate()) return;
  try {
    if (props.isEditMode && form.value.id) {
      await updateResume(form.value.id, form.value);
      toast.add({ severity:'success', summary:'Успех', detail:'Резюме обновлено' });
    } else {
      await createResume(form.value);
      toast.add({ severity:'success', summary:'Успех', detail:'Резюме создано' });
    }
    emit('submit');
  } catch (e) {
    toast.add({ severity:'error', summary:'Ошибка', detail:(e as Error).message });
  }
}

function onCancel() {
  emit('cancel');
}
</script>


<template>
  <div class="resume-form-container">
    <Toast />
    <form @submit.prevent="onSubmit" class="resume-form">
      <div class="field">
        <label>Заголовок*</label>
        <InputText v-model="form.title" maxlength="255" class="w-full" :class="{ 'p-invalid': errors.title }" />
        <small v-if="errors.title" class="p-error">{{ errors.title }}</small>
      </div>

      <div class="field">
        <label>Описание*</label>
        <Textarea v-model="form.description" maxlength="2000" rows="5" class="w-full textarea-limited resize-none" />
        <small v-if="errors.description" class="p-error">{{ errors.description }}</small>
      </div>

      <div class="field">
        <label>Ожидаемая зарплата</label>
        <InputNumber v-model="form.expected_salary" class="w-full" :min="0" />
      </div>

      <div class="field">
        <label>Специализация*</label>
        <Dropdown v-model="form.specialization_id" :options="specializations"
                  optionLabel="name" optionValue="id" placeholder="Выберите"
                  :class="{ 'p-invalid': errors.specialization_id }" />
        <small v-if="errors.specialization_id" class="p-error">{{ errors.specialization_id }}</small>
      </div>

      <div class="field">
        <label>Уровень опыта*</label>
        <Dropdown v-model="form.experience_level" :options="experienceLevels"
                  optionLabel="label" optionValue="value" placeholder="Выберите"
                  :class="{ 'p-invalid': errors.experience_level }" />
        <small v-if="errors.experience_level" class="p-error">{{ errors.experience_level }}</small>
      </div>

      <div class="field">
        <label>Локация*</label>
        <InputText v-model="form.location" class="w-full"
                   :class="{ 'p-invalid': errors.location }" />
        <small v-if="errors.location" class="p-error">{{ errors.location }}</small>
      </div>

      <div class="flex justify-content-end mt-4">
        <Button label="Отменить" class="p-button-text mr-2" @click="onCancel" />
        <Button :label="isEditMode ? 'Сохранить' : 'Создать'"
                :loading="loading" type="submit" />
      </div>
    </form>
  </div>
</template>


<style scoped>
.resume-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.textarea-limited textarea {
  max-height: 150px;
  overflow: auto;
}

.resume-form-container {
  max-width: 600px;
  margin: auto;
}

.field {
  margin-bottom: 1rem;
}
</style>
