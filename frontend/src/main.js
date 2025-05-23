import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { createAppRouter } from './router';
import Aura from '@primeuix/themes/aura';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import Keycloak from 'keycloak-js';
import '@/assets/styles.scss';
import { useUserStore } from './stores/userStore';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

const keycloak = new Keycloak({
    url: 'http://31.207.77.35:8086',
    realm: 'hh_realm',
    clientId: 'frontend',
});

async function initializeApp() {
    console.log('Initializing app...');
    try {
        const userStore = useUserStore();
        userStore.loadFromStorage();
        console.log('Loaded from storage, authenticated:', userStore.isAuthenticated);

        // Инициализируем Keycloak с токенами из хранилища
        await keycloak.init({
            onLoad: 'check-sso',
            token: userStore.accessToken,
            refreshToken: userStore.refreshToken,
            checkLoginIframe: false,
        });

        if (userStore.accessToken) {
            try {
                // Проверяем и обновляем токен, если он скоро истечёт
                await keycloak.updateToken(30);
                userStore.setToken(keycloak.token, keycloak.refreshToken);
                keycloak.authenticated = true;

                // Загружаем информацию о пользователе
                const userInfoResponse = await fetch('http://31.207.77.35:8086/realms/hh_realm/protocol/openid-connect/userinfo', {
                    headers: {
                        Authorization: `Bearer ${keycloak.token}`,
                    },
                });

                if (!userInfoResponse.ok) {
                    throw new Error(`Failed to fetch userinfo: ${userInfoResponse.statusText}`);
                }

                const userInfo = await userInfoResponse.json();
                console.log('User info loaded:', userInfo);

                // Запрашиваем профиль
                const profileResponse = await fetch('http://31.207.77.35:8080/user/profile', {
                    headers: {
                        Authorization: `Bearer ${keycloak.token}`,
                    },
                });

                if (!profileResponse.ok) {
                    throw new Error(`Failed to fetch profile: ${profileResponse.statusText}`);
                }

                const profileData = await profileResponse.json();
                console.log('Profile data:', profileData);

                // Сохраняем данные пользователя
                userStore.setUser(
                    {
                        id: userInfo.sub,
                        name: userInfo.name || profileData.name,
                        email: userInfo.email,
                        role: keycloak.realmAccess?.roles.includes('company_owner')
                            ? 'company_owner'
                            : keycloak.realmAccess?.roles.includes('applicant')
                                ? 'applicant'
                                : null,
                        created_at: profileData.created_at || new Date().toISOString(),
                        companyId: profileData.companyId,
                        companyName: profileData.companyName,
                        companyDescription: profileData.companyDescription,
                    },
                    keycloak.token,
                    keycloak.refreshToken
                );

                // Периодически обновляем токен
                setInterval(() => {
                    keycloak
                        .updateToken(30)
                        .then(refreshed => {
                            if (refreshed) {
                                console.log('Token refreshed');
                                userStore.setToken(keycloak.token, keycloak.refreshToken);
                            }
                        })
                        .catch(err => {
                            console.error('Failed to refresh token:', err);
                            userStore.logout();
                            window.location.href = '/auth/login';
                        });
                }, 10000);
            } catch (err) {
                console.error('Failed to load user info or profile:', err);
                userStore.logout();
            }
        } else {
            console.log('No tokens found, clearing storage');
            userStore.logout();
        }

        // Инициализируем роутер и подключаем зависимости
        const router = createAppRouter(keycloak);
        app.use(router);
        app.use(PrimeVue, {
            theme: {
                preset: Aura,
                options: {
                    darkModeSelector: '.app-dark',
                },
            },
        });
        app.use(ToastService);
        app.use(ConfirmationService);
        app.provide('keycloak', keycloak);
        console.log('Keycloak provided to app');
        app.mount('#app');
        console.log('App mounted');
    } catch (err) {
        console.error('Initialization failed:', err);
        const router = createAppRouter(keycloak);
        app.use(router);
        app.use(PrimeVue, {
            theme: {
                preset: Aura,
                options: {
                    darkModeSelector: '.app-dark',
                },
            },
        });
        app.use(ToastService);
        app.use(ConfirmationService);
        app.provide('keycloak', keycloak);
        console.log('Keycloak provided to app (error case)');
        app.mount('#app');
    }
}

initializeApp();
