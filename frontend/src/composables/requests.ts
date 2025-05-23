import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/userStore';

export const API_ADDRESS = 'http://31.207.77.35:8080';
export const KEYCLOAK_ADDRESS = 'http://31.207.77.35:8086';

interface RequestOptions extends RequestInit {
    requiresAuth?: boolean;
}

// Универсальная обёртка для fetch с поддержкой токенов и автoобновлением
export async function apiFetch(path: string, init: RequestOptions = {}) {
    const store = useUserStore();
    const headers = new Headers(init.headers || {});

    // JSON по умолчанию
    headers.set('Content-Type', 'application/json');

    // При необходимости прикрепляем access token
    if (init.requiresAuth) {
        if (!store.accessToken) throw new Error('Требуется авторизация');
        headers.set('Authorization', `Bearer ${store.accessToken}`);
    }

    // Выполняем запрос
    let response = await fetch(`${API_ADDRESS}${path}`, {
        ...init,
        headers,
    });

    // Если 401 — пробуем обновить токен
    if (response.status === 401 && store.refreshToken) {
        const refreshRes = await fetch(
            `${KEYCLOAK_ADDRESS}/realms/hh_realm/protocol/openid-connect/token`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    client_id: 'frontend',
                    refresh_token: store.refreshToken,
                }),
            }
        );
        if (refreshRes.ok) {
            const tokenData = await refreshRes.json();
            store.setToken(tokenData.access_token, tokenData.refresh_token);
            headers.set('Authorization', `Bearer ${tokenData.access_token}`);
            response = await fetch(`${API_ADDRESS}${path}`, {
                ...init,
                headers,
            });
        } else {
            store.logout();
            throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
        }
    }

    return response;
}


// Регистрация
export function useRegister() {
    const loading = ref(false);
    const error = ref<string | null>(null);

    async function register(data: {
        name: string;
        email: string;
        password: string;
        role: 'applicant' | 'company_owner';
        companyName?: string;
        companyDescription?: string;
    }) {
        loading.value = true;
        error.value = null;
        try {
            const res = await apiFetch('/user/register', {
                method: 'POST',
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Ошибка регистрации');
            return result;
        } catch (e) {
            error.value = (e as Error).message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    return { register, loading, error };
}


// Логин
export function useLogin() {
    const loading = ref(false);
    const error = ref<string | null>(null);

    async function login(data: {
        email: string;
        password: string;
        role: 'applicant' | 'company_owner';
    }) {
        loading.value = true;
        error.value = null;
        try {
            const res = await apiFetch('/user/login', {
                method: 'POST',
                body: JSON.stringify(data),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Ошибка входа');
            return result;
        } catch (e) {
            error.value = (e as Error).message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    return { login, loading, error };
}


// Работа с вакансиями
export function useVacancy() {
    const loading = ref(false);
    const error = ref<string | null>(null);

    async function createVacancy(payload: {
        user_id: string;
        company_id: string;
        title: string;
        description: string;
        salary_from: number;
        salary_to?: number;
        specialization_id: string;
        experience_level: 'junior' | 'middle' | 'senior';
        location: string;
    }) {
        loading.value = true;
        error.value = null;
        try {
            const res = await apiFetch('/vacancies', {
                method: 'POST',
                requiresAuth: true,
                body: JSON.stringify(payload),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Ошибка при создании вакансии');
            return result;
        } catch (e) {
            error.value = (e as Error).message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function getMyVacancies() {
        loading.value = true;
        error.value = null;
        try {
            const res = await apiFetch('/vacancies/my', {
                method: 'GET',
                requiresAuth: true,
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Ошибка при получении вакансий');
            return result;
        } catch (e) {
            error.value = (e as Error).message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function updateVacancy(
        vacancyId: string,
        payload: {
            user_id: string;
            company_id: string;
            title: string;
            description: string;
            salary_from: number;
            salary_to?: number;
            specialization_id: string;
            experience_level: 'junior' | 'middle' | 'senior';
            location: string;
        }
    ) {
        loading.value = true;
        error.value = null;
        try {
            const res = await apiFetch(`/vacancies/${vacancyId}`, {
                method: 'PATCH',
                requiresAuth: true,
                body: JSON.stringify(payload),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Ошибка при обновлении вакансии');
            return result;
        } catch (e) {
            error.value = (e as Error).message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function deleteVacancy(vacancyId: string) {
        loading.value = true; error.value = null;
        try {
            const res = await apiFetch(`/vacancies/${vacancyId}`, {
                method: 'DELETE',
                requiresAuth: true,
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Ошибка удаления вакансии');
            }
            return;
        } catch (e) {
            error.value = (e as Error).message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function getAllVacancies() {
        loading.value = true; error.value = null;
        try {
            const res = await apiFetch('/vacancies/all', { method: 'GET', requiresAuth: true });
            const data = await res.json();
            console.log("getAllVacancies data:", data);
            if (!res.ok) throw new Error(data.error || 'Ошибка загрузки вакансий');
            return data;
        } catch (e) {
            error.value = (e as Error).message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function getVacancyResponses(vacancyId: string) {
        loading.value = true; error.value = null;
        try {
            const res = await apiFetch(`/vacancies/${vacancyId}/responses`, { method: 'GET', requiresAuth: true });
            const data = await res.json();
            console.log("getVacancyResponses - data: ", data);
            if (!res.ok) throw new Error(data.error || 'Ошибка загрузки откликов');
            return data;
        } catch (e) {
            error.value = (e as Error).message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function createVacancyResponse(vacancyId: string, message: string) {
        loading.value = true; error.value = null;
        try {
            const res = await apiFetch(
                `/vacancies/${vacancyId}/responses`,
                {
                    method: 'POST',
                    requiresAuth: true,
                    body: JSON.stringify({ message }),
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Ошибка отправки отклика');
            return data;
        } catch (e) {
            error.value = (e as Error).message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function getMyVacancyResponses() {
        const res = await apiFetch('/responses/vacancies', { method: 'GET', requiresAuth: true });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    }

    async function getOwnerVacancyResponses() {
        const res = await apiFetch('/responses/vacancies-owner', { method: 'GET', requiresAuth: true });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    }

    async function getVacancyById(vacancyId: string) {
        loading.value = true; error.value = null;
        try {
            const res  = await apiFetch(`/vacancy/${vacancyId}`, { method: 'GET', requiresAuth: true });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Ошибка загрузки вакансии');
            return data;
        } catch (e: any) {
            error.value = e.message; throw e;
        } finally {
            loading.value = false;
        }
    }

    async function getMyVacancyInvitations() {
        const res  = await apiFetch('/responses/vacancies-invited', {
            method: 'GET', requiresAuth: true
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка загрузки приглашений');
        return data;
    }

    async function getSentVacancyInvitations() {
        const res  = await apiFetch('/responses/vacancies-owner-invited', {
            method: 'GET', requiresAuth: true
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка загрузки приглашений');
        return data;
    }

    async function createVacancyInvitation(
        vacancyId: string,
        applicantId: string,
        message: string
    ) {
        loading.value = true
        error.value   = null
        try {
            const res = await apiFetch(
                `/vacancies/${vacancyId}/invitations`,
                {
                    method: 'POST',
                    requiresAuth: true,
                    body: JSON.stringify({ applicantId, message }),
                }
            )
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Ошибка создания приглашения')
            return data
        } catch (e: any) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    async function updateVacancyResponseStatus(
        vacancyId: string,
        responseId: string,
        status: 'pending' | 'accepted' | 'canceled'
    ) {
        const res = await apiFetch(
            `/vacancies/${vacancyId}/responses/${responseId}`,
            {
                method: 'PATCH',
                requiresAuth: true,
                body: JSON.stringify({ status }),
            }
        );
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Не удалось обновить отклик');
        }
        return res.json();
    }

    async function updateVacancyInvitationStatus(
        vacancyId: string,
        invitationId: string,
        status: 'pending' | 'accepted' | 'canceled'
    ) {
        const res = await apiFetch(
            `/vacancies/${vacancyId}/invitations/${invitationId}`,
            {
                method: 'PATCH',
                requiresAuth: true,
                body: JSON.stringify({ status }),
            }
        );
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Не удалось обновить приглашение');
        }
        return res.json();
    }

    return {
        updateVacancyResponseStatus,
        updateVacancyInvitationStatus,
        createVacancyInvitation,
        getMyVacancyInvitations,
        getSentVacancyInvitations,
        createVacancy,
        getVacancyById,
        getMyVacancyResponses,
        getOwnerVacancyResponses,
        getMyVacancies,
        updateVacancy,
        deleteVacancy,
        getAllVacancies,
        getVacancyResponses,
        createVacancyResponse,
        loading,
        error
    };
}


// Работа с резюме
export function useResume() {
    const loading = ref(false);
    const error = ref<string | null>(null);
    const store = useUserStore();

    // Создать резюме
    async function createResume(payload: {
        id: string;
        user_id: string;
        title: string;
        description: string;
        expected_salary?: number;
        specialization_id: string;
        experience_level: 'junior'|'middle'|'senior';
        location: string;
    }) {
        loading.value = true; error.value = null;
        try {
            const res = await apiFetch('/resumes', {
                method: 'POST',
                requiresAuth: true,
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Ошибка создания резюме');
            return data;
        } catch (e) {
            error.value = (e as Error).message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    // Получить своё резюме
    async function getMyResume() {
        loading.value = true; error.value = null;
        try {
            const res = await apiFetch('/resumes/my', {
                method: 'GET',
                requiresAuth: true,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Ошибка загрузки резюме');
            return data;
        } catch (e) {
            error.value = (e as Error).message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    // Обновить резюме
    async function updateResume(
        resumeId: string,
        payload: {
            user_id: string;
            title: string;
            description: string;
            expected_salary?: number;
            specialization_id: string;
            experience_level: 'junior'|'middle'|'senior';
            location: string;
        }
    ) {
        loading.value = true; error.value = null;
        try {
            const res = await apiFetch(`/resumes/${resumeId}`, {
                method: 'PATCH',
                requiresAuth: true,
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Ошибка обновления резюме');
            return data;
        } catch (e) {
            error.value = (e as Error).message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function deleteResume(resumeId: string) {
        loading.value = true; error.value = null;
        try {
            const res = await apiFetch(`/resumes/${resumeId}`, {
                method: 'DELETE',
                requiresAuth: true,
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Ошибка удаления резюме');
            }
            return;
        } catch (e) {
            error.value = (e as Error).message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function getAllResumes() {
        loading.value = true; error.value = null;
        try {
            const res = await apiFetch('/resumes/all', { method: 'GET', requiresAuth: true });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Ошибка загрузки резюме');
            return data;
        } catch (e) {
            error.value = (e as Error).message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    // async function getResumeResponses(resumeId: string) {
    //     loading.value = true; error.value = null;
    //     try {
    //         const res = await apiFetch(`/resumes/${resumeId}/responses`, { method: 'GET', requiresAuth: true });
    //         const data = await res.json();
    //         console.log("getResumeResponses - data: ", data);
    //         if (!res.ok) throw new Error(data.error || 'Ошибка загрузки откликов');
    //         return data;
    //     } catch (e) {
    //         error.value = (e as Error).message;
    //         throw e;
    //     } finally {
    //         loading.value = false;
    //     }
    // }

    // async function createResumeResponse(resumeId: string, message: string) {
    //     loading.value = true; error.value = null;
    //     try {
    //         const res = await apiFetch(
    //             `/resumes/${resumeId}/responses`,
    //             {
    //                 method: 'POST',
    //                 requiresAuth: true,
    //                 body: JSON.stringify({ message }),
    //             }
    //         );
    //         const data = await res.json();
    //         if (!res.ok) throw new Error(data.error || 'Ошибка отправки отклика');
    //         return data;
    //     } catch (e) {
    //         error.value = (e as Error).message;
    //         throw e;
    //     } finally {
    //         loading.value = false;
    //     }
    // }

    async function getResumeById(resumeId: string) {
        loading.value = true;
        error.value   = null;
        try {
            const res = await apiFetch(`/resume/${resumeId}`,
                { method: 'GET', requiresAuth: true }
            );

            console.log("requests.ts getResumeById res:", res)

            if (!res.ok) {
                let msg = `Ошибка загрузки резюме (${res.status})`;
                try {
                    const err = await res.json();
                    msg = err.error || msg;
                } catch {}
                throw new Error(msg);
            }

            return await res.json();
        } catch (e: any) {
            error.value = e.message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function getResumeByUserId(userId: string) {
        loading.value = true;
        error.value   = null;
        try {
            const res = await apiFetch(
                `/resume/user/${userId}`,
                { method: 'GET', requiresAuth: true }
            );
            console.log("requests.ts getResumeByUserId res:", res)

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Ошибка загрузки резюме (${res.status})`);
            }
            return (await res.json()) as any;
        } catch (e: any) {
            error.value = e.message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    return {
        createResume,
        getResumeByUserId,
        getResumeById,
        getMyResume,
        updateResume,
        deleteResume,
        getAllResumes,
        // getResumeResponses,
        // createResumeResponse,
        loading,
        error
    };
}


export function useChat() {
    const loading = ref(false);
    const error   = ref<string|null>(null);

    const chats = ref<Array<{
        id: string;
        opponentName: string;
        contextTitle: string;
        createdAt: string;
    }>>([]);

    const userStore      = useUserStore();
    const currentUserId  = computed(() => userStore.currentUser?.id);
    const { getById: fetchUser } = useUserProfile();

    async function getChatsList() {
        loading.value = true;
        error.value   = null;
        try {
            const res  = await apiFetch('/chats', { method: 'GET', requiresAuth: true });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Ошибка загрузки чатов');

            chats.value = await Promise.all(
                data.map(async (c: any) => {
                    const opponentId =
                        c.applicant_id === currentUserId.value
                            ? c.company_owner_id
                            : c.applicant_id;

                    const profile = await fetchUser(opponentId);

                    return {
                        id:           c.id,
                        opponentName: profile.name,
                        contextTitle: c.context_title,
                        createdAt:    c.created_at,
                    };
                })
            );
        } catch (e: any) {
            error.value = e.message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    async function createChat(payload: {
        applicant_id: string;
        company_owner_id: string;
        vacancy_id: string;
    }) {
        loading.value = true;
        error.value   = null;
        try {
            const res = await apiFetch('/chats', {
                method: 'POST',
                requiresAuth: true,
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Не удалось создать чат');
            return data;
        } catch (e) {
            error.value = (e as Error).message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    return {
        getChatsList,
        chats,
        createChat,
        loading,
        error
    };
}


export function useMessages() {
    const loading = ref(false);
    const error   = ref<string | null>(null);

    // Загрузка всех сообщений чата
    async function loadMessages(chatId: string) {
        loading.value = true;
        error.value   = null;
        try {
            const res  = await apiFetch(
                `/chats/${chatId}/messages`,
                { method: 'GET', requiresAuth: true }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Ошибка загрузки сообщений');
            return data as Array<{
                id: string;
                senderId: string;
                text: string;
                createdAt: string;
            }>;
        } catch (e: any) {
            error.value = e.message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    // Отправка нового сообщения
    async function sendMessage(chatId: string, text: string) {
        loading.value = true;
        error.value   = null;
        try {
            const res  = await apiFetch(
                `/chats/${chatId}/messages`,
                {
                    method: 'POST',
                    requiresAuth: true,
                    body: JSON.stringify({ text }),
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Ошибка отправки сообщения');
            return data;
        } catch (e: any) {
            error.value = e.message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    return {
        loadMessages,
        sendMessage,
        loading,
        error
    };
}


// Работа с пользователями
export function useUserProfile() {
    const loading = ref(false);
    const error   = ref<string | null>(null);

    async function getById(userId: string) {
        loading.value = true;
        error.value   = null;
        try {
            const res = await apiFetch(
                `/user/profile/${userId}`,
                { method: 'GET', requiresAuth: true }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Ошибка загрузки профиля пользователя');
            return data as {
                id: string;
                name: string;
                email: string;
                role: string;
                created_at: string;
                companyId?: string;
                companyName?: string;
                companyDescription?: string;
            };
        } catch (e: any) {
            error.value = e.message;
            throw e;
        } finally {
            loading.value = false;
        }
    }

    return {
        getById,
        loading,
        error
    };
}
