import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'applicant' | 'company_owner' | null;
    created_at: string;
    companyId?: string;
    companyName?: string;
    companyDescription?: string;
}

export const useUserStore = defineStore('user', () => {
    const currentUser = ref<User | null>(null);
    const accessToken = ref<string | null>(null);
    const refreshToken = ref<string | null>(null);

    const isAuthenticated = computed(() => !!currentUser.value && !!accessToken.value);

    function setUser(userData: User, accessTokenValue: string, refreshTokenValue: string) {
        currentUser.value = userData;
        accessToken.value = accessTokenValue;
        refreshToken.value = refreshTokenValue;
        localStorage.setItem('access_token', accessTokenValue);
        localStorage.setItem('refresh_token', refreshTokenValue);
        localStorage.setItem('currentUser', JSON.stringify(userData));
    }

    function setToken(accessTokenValue: string, refreshTokenValue: string) {
        accessToken.value = accessTokenValue;
        refreshToken.value = refreshTokenValue;
        localStorage.setItem('access_token', accessTokenValue);
        localStorage.setItem('refresh_token', refreshTokenValue);
    }

    function logout() {
        currentUser.value = null;
        accessToken.value = null;
        refreshToken.value = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }

    function loadFromStorage() {
        const user = localStorage.getItem('currentUser');
        const token = localStorage.getItem('access_token');
        const refresh = localStorage.getItem('refresh_token');
        if (user && token && refresh) {
            try {
                currentUser.value = JSON.parse(user);
                accessToken.value = token;
                refreshToken.value = refresh;
            } catch (err) {
                console.error('Failed to load from storage:', err);
                logout();
            }
        }
    }

    return {
        currentUser,
        accessToken,
        refreshToken,
        isAuthenticated,
        setUser,
        setToken,
        logout,
        loadFromStorage,
    };
});