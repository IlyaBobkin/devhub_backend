<script lang="ts" setup>
import { ref, inject } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Select from 'primevue/select';
import Button from 'primevue/button';
import { jwtDecode } from 'jwt-decode';
import { KeycloakToken } from '@/types/keycloak';

const router = useRouter();
const userStore = useUserStore();
const keycloak = inject('keycloak');
const loading = ref(false);

const form = ref({
  role: '',
  email: '',
  password: '',
});

const errors = ref({
  role: '',
  email: '',
  password: '',
});

const roles = [
  { label: 'Соискатель', value: 'applicant' },
  { label: 'Работодатель', value: 'company_owner' },
];

const validateForm = () => {
  let isValid = true;
  errors.value = { role: '', email: '', password: '' };

  if (!form.value.role) {
    errors.value.role = 'Выберите роль';
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
  }

  return isValid;
};

const handleLogin = async () => {
  if (!validateForm()) return;

  loading.value = true;
  try {
    const response = await fetch('http://localhost:8086/realms/hh_realm/protocol/openid-connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: 'frontend',
        username: form.value.email,
        password: form.value.password,
        scope: 'openid profile email',
      }).toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Keycloak token error:', errorData);
      throw new Error(errorData.error_description || 'Неверный email или пароль');
    }

    const data = await response.json();

    keycloak.token = data.access_token;
    keycloak.refreshToken = data.refresh_token;
    keycloak.authenticated = true;

    const userInfoResponse = await fetch('http://localhost:8086/realms/hh_realm/protocol/openid-connect/userinfo', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error('Userinfo error:', userInfoResponse.status, errorText);
      throw new Error(`Не удалось загрузить информацию о пользователе: ${errorText || userInfoResponse.statusText}`);
    }

    const userInfo = await userInfoResponse.json();
    const decodedToken: KeycloakToken = jwtDecode(data.access_token);

    const userRole = decodedToken.realm_access?.roles.includes('company_owner')
        ? 'company_owner'
        : decodedToken.realm_access?.roles.includes('applicant')
            ? 'applicant'
            : null;

    if (userRole !== form.value.role) {
      throw new Error('Выбранная роль не соответствует роли пользователя');
    }

    const profileResponse = await fetch('http://localhost:8080/user/profile', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });

    if (!profileResponse.ok) {
      const profileError = await profileResponse.json();
      throw new Error(`Не удалось загрузить профиль: ${profileError.error || profileResponse.statusText}`);
    }

    const profileData = await profileResponse.json();

    userStore.setUser(
        {
          id: userInfo.sub,
          name: userInfo.name || profileData.name,
          email: userInfo.email,
          role: userRole,
          created_at: profileData.created_at || new Date().toISOString(),
          companyId: profileData.companyId,
          companyName: profileData.companyName,
          companyDescription: profileData.companyDescription,
        },
        data.access_token,
        data.refresh_token
    );

    router.push('/');
  } catch (error: any) {
    console.error('Login error:', error);
    errors.value.email = error.message || 'Ошибка входа';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-container">
    <div class="surface-card">
      <div class="text-center mb-5">
        <h2 class="text-900 font-bold text-3xl">Вход</h2>
        <p class="text-600">Войдите в свой аккаунт</p>
      </div>

      <form @submit.prevent="handleLogin" autocomplete="on">
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
          <label for="email" class="block text-900 font-medium mb-2">Email</label>
          <InputText
              id="email"
              v-model="form.email"
              type="email"
              class="w-full"
              :class="{ 'p-invalid': errors.email }"
              :inputProps="{ autocomplete: 'username', name: 'email' }"
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
              :inputProps="{ autocomplete: 'current-password', name: 'password' }"
          />
          <small v-if="errors.password" class="p-error">{{ errors.password }}</small>
        </div>

        <Button
            label="Войти"
            type="submit"
            class="w-full mb-3"
            :loading="loading"
        />

        <div class="text-center">
          <span class="text-600">Нет аккаунта?</span>
          <router-link to="/auth/register" class="font-medium text-primary no-underline ml-1">
            Зарегистрируйтесь
          </router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
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
.field .p-dropdown {
  border-radius: 6px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field .p-inputtext:focus,
.field .p-password:focus,
.field .p-dropdown.p-focus {
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
