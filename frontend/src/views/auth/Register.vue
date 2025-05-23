<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useRegister } from '@/composables/requests';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';

const router = useRouter();
const { register: registerRequest, loading } = useRegister();

const form = ref({
  role: '' as 'applicant' | 'company_owner' | '',
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  companyName: '',
  companyDescription: '',
});

const errors = ref({
  role: '',
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  companyName: '',
  companyDescription: '',
});

const roles = [
  { label: 'Соискатель', value: 'applicant' },
  { label: 'Работодатель', value: 'company_owner' },
];

const validateForm = () => {
  let isValid = true;
  errors.value = {
    role: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    companyDescription: '',
  };

  if (!form.value.role) {
    errors.value.role = 'Выберите роль';
    isValid = false;
  }

  if (!form.value.name.trim()) {
    errors.value.name = 'Введите имя';
    isValid = false;
  }

  if (!form.value.email.trim()) {
    errors.value.email = 'Введите email';
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'Неверный формат email';
    isValid = false;
  }

  if (!form.value.password) {
    errors.value.password = 'Введите пароль';
    isValid = false;
  } else if (form.value.password.length < 6) {
    errors.value.password = 'Пароль должен быть не менее 6 символов';
    isValid = false;
  }

  if (!form.value.confirmPassword) {
    errors.value.confirmPassword = 'Подтвердите пароль';
    isValid = false;
  } else if (form.value.password !== form.value.confirmPassword) {
    errors.value.confirmPassword = 'Пароли не совпадают';
    isValid = false;
  }

  if (form.value.role === 'company_owner') {
    if (!form.value.companyName.trim()) {
      errors.value.companyName = 'Введите название компании';
      isValid = false;
    }
    if (!form.value.companyDescription.trim()) {
      errors.value.companyDescription = 'Введите описание компании';
      isValid = false;
    }
  }

  return isValid;
};

const handleRegister = async () => {
  if (!validateForm()) return;

  try {
    await registerRequest({
      name: form.value.name,
      email: form.value.email,
      password: form.value.password,
      role: form.value.role,
      ...(form.value.role === 'company_owner' && {
        companyName: form.value.companyName,
        companyDescription: form.value.companyDescription,
      }),
    });
    router.push('/auth/login');
  } catch (error: any) {
    console.error('Registration error:', error);
    errors.value.email = error.message || 'Ошибка регистрации';
  }
};
</script>

<template>
  <div class="register-container">
    <div class="surface-card">
      <div class="text-center mb-5">
        <h2 class="text-900 font-bold text-3xl">Регистрация</h2>
        <p class="text-600">Создайте аккаунт для поиска работы или сотрудников</p>
      </div>

      <form @submit.prevent="handleRegister">
        <div class="field mb-4">
          <label for="role" class="block text-900 font-medium mb-2">Роль</label>
          <Select
              id="role"
              v-model="form.role"
              :options="roles"
              optionLabel="label"
              optionValue="value"
              placeholder="Выберите роль"
              class="w-full"
              :class="{ 'p-invalid': errors.role }"
          />
          <small v-if="errors.role" class="p-error">{{ errors.role }}</small>
        </div>

        <div class="field mb-4">
          <label for="name" class="block text-900 font-medium mb-2">Имя</label>
          <InputText
              id="name"
              v-model="form.name"
              class="w-full"
              :class="{ 'p-invalid': errors.name }"
          />
          <small v-if="errors.name" class="p-error">{{ errors.name }}</small>
        </div>

        <div class="field mb-4">
          <label for="email" class="block text-900 font-medium mb-2">Email</label>
          <InputText
              id="email"
              v-model="form.email"
              type="email"
              class="w-full"
              :class="{ 'p-invalid': errors.email }"
          />
          <small v-if="errors.email" class="p-error">{{ errors.email }}</small>
        </div>

        <div class="field mb-4">
          <label for="password" class="block text-900 font-medium mb-2">Пароль</label>
          <Password
              id="password"
              v-model="form.password"
              toggleMask
              :feedback="false"
              class="w-full"
              :class="{ 'p-invalid': errors.password }"
              :inputProps="{ autocomplete: 'new-password', name: 'password' }"
          />
          <small v-if="errors.password" class="p-error">{{ errors.password }}</small>
        </div>

        <div class="field mb-4">
          <label for="confirmPassword" class="block text-900 font-medium mb-2">Подтвердите пароль</label>
          <Password
              id="confirmPassword"
              v-model="form.confirmPassword"
              toggleMask
              :feedback="false"
              class="w-full"
              :class="{ 'p-invalid': errors.confirmPassword }"
              :inputProps="{ autocomplete: 'new-password', name: 'confirmPassword' }"
          />
          <small v-if="errors.confirmPassword" class="p-error">{{ errors.confirmPassword }}</small>
        </div>

        <div v-if="form.role === 'company_owner'">
          <div class="field mb-4">
            <label for="companyName" class="block text-900 font-medium mb-2">Название компании</label>
            <InputText
                id="companyName"
                v-model="form.companyName"
                class="w-full"
                :class="{ 'p-invalid': errors.companyName }"
            />
            <small v-if="errors.companyName" class="p-error">{{ errors.companyName }}</small>
          </div>

          <div class="field mb-4">
            <label for="companyDescription" class="block text-900 font-medium mb-2">Описание компании</label>
            <Textarea
                id="companyDescription"
                v-model="form.companyDescription"
                rows="4"
                class="w-full"
                :class="{ 'p-invalid': errors.companyDescription }"
                style="resize: none; overflow-y: auto;"
            />
            <small v-if="errors.companyDescription" class="p-error">{{ errors.companyDescription }}</small>
          </div>
        </div>

        <Button
            label="Зарегистрироваться"
            type="submit"
            class="w-full mb-3"
            :loading="loading"
        />

        <div class="text-center">
          <span class="text-600">Уже есть аккаунт?</span>
          <router-link to="/auth/login" class="font-medium text-primary no-underline ml-1">
            Войдите
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  width: 100vw;
  background-color: #f8fafc;
  padding: 1rem;
  overflow: hidden;
}

.surface-card {
  max-width: 400px;
  width: 100%;
  padding: 2rem;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.text-center h2 {
  margin-bottom: 0.5rem;
  color: #1a202c;
}

.text-center p {
  color: #718096;
}

.field label {
  font-size: 0.9rem;
  color: #2d3748;
  margin-bottom: 0.5rem;
}

.field .p-inputtext,
.field .p-password,
.field .p-dropdown,
.field .p-textarea {
  border-radius: 6px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field .p-inputtext:focus,
.field .p-password:focus,
.field .p-dropdown.p-focus,
.field .p-textarea:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.p-error {
  font-size: 0.8rem;
  color: #e53e3e;
  margin-top: 0.25rem;
  display: block;
}

.p-button {
  border-radius: 6px;
  background: #6366f1;
  border: none;
  font-weight: 500;
  padding: 0.75rem;
  transition: background 0.2s;
}

.p-button:hover {
  background: #4f46e5;
}

.text-center a {
  color: #6366f1;
  transition: color 0.2s;
}

.text-center a:hover {
  color: #4f46e5;
  text-decoration: underline;
}

.p-button:loading {
  opacity: 0.8;
}
</style>