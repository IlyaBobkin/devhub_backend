import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/layout/AppLayout.vue';
import { useUserStore } from '@/stores/userStore';

export function createAppRouter(keycloak) {
    const router = createRouter({
        history: createWebHistory(),
        routes: [
            {
                path: '/',
                component: AppLayout,
                children: [
                    {
                        path: '/',
                        name: 'dashboard',
                        component: () => import('@/views/Dashboard.vue'),
                        meta: { requiresAuth: true }, // Требуем авторизацию для /
                    },
                    {
                        path: '/creations/vacancy',
                        name: 'VacancyForm',
                        component: () => import('@/layout/creations/VacancyForm.vue'),
                        meta: { requiresAuth: true, requiresRole: 'company_owner' },
                    },
                    {
                        path: '/vacancies/my',
                        name: 'MyVacancies',
                        component: () => import('@/views/MyVacancies.vue'),
                        meta: { requiresAuth: true, requiresRole: 'company_owner' },
                    },
                    {
                        path: '/resume/my',
                        name: 'MyResume',
                        component: () => import('@/views/MyResume.vue'),
                        meta: { requiresAuth: true, requiresRole: 'applicant' },
                    },
                    {
                        path: '/chats',
                        name: 'Chats',
                        component: () => import('@/views/ChatList.vue'),
                        meta: { requiresAuth: true }
                    },
                    {
                        path: '/chats/:chatId',
                        name: 'ChatWindow',
                        component: () => import('@/views/ChatWindow.vue'),
                        meta: { requiresAuth: true }
                    },
                    {
                        path: 'responses',
                        redirect: () => {
                            const role = useUserStore().currentUser?.role
                            return role === 'applicant'
                                ? { name: 'ApplicantResponses' }
                                : { name: 'EmployerResponses' }
                        },
                        meta: { requiresAuth: true }
                    },
                    {
                        path: 'responses/applicant',
                        name: 'ApplicantResponses',
                        component: () => import('@/views/responses/ApplicantResponsesPage.vue'),
                        meta: { requiresAuth: true, requiresRole: 'applicant' }
                    },
                    {
                        path: 'responses/employer',
                        name: 'EmployerResponses',
                        component: () => import('@/views/responses/EmployerResponsesPage.vue'),
                        meta: { requiresAuth: true, requiresRole: 'company_owner' }
                    },
                ],
            },
            {
                path: '/auth/register',
                name: 'register',
                component: () => import('@/views/auth/Register.vue'),
                meta: { requiresAuth: false },
            },
            {
                path: '/auth/login',
                name: 'login',
                component: () => import('@/views/auth/Login.vue'),
                meta: { requiresAuth: false },
            },
            {
                path: '/:pathMatch(.*)*',
                redirect: '/auth/login',
            },
        ],
    });

    router.beforeEach((to, from, next) => {
        console.log(`Navigating to: ${to.path}, authenticated: ${useUserStore().isAuthenticated}`);
        const userStore = useUserStore();

        if (to.meta.requiresAuth && !userStore.isAuthenticated) {
            console.log('Requires auth, redirecting to /auth/login');
            next('/auth/login');
        } else if (to.meta.requiresRole && userStore.currentUser?.role !== to.meta.requiresRole) {
            console.log('Invalid role, redirecting to /');
            next('/');
        } else {
            next();
        }
    });

    return router;
}