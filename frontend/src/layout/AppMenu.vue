<script setup>
import { computed } from 'vue';
import { useUserStore } from '@/stores/userStore'; // Импортируем userStore
import AppMenuItem from './AppMenuItem.vue';

const userStore = useUserStore();

// Создаём реактивную модель меню
const model = computed(() => {
    // Базовые элементы меню, доступные всем
    const baseMenu = [
        {
            label: 'Home',
            items: [{ label: 'Главная', icon: 'pi pi-fw pi-home', to: '/' }],
        },
        {
            label: 'Функционал',
            items: [], // Динамически добавим элементы
        },
    ];

    // Получаем роль пользователя
    const userRole = userStore.currentUser?.role;

    // Добавляем пункты меню в зависимости от роли
    if (userRole === 'company_owner') {
      baseMenu[1].items.push(
          { label: 'Создать вакансию', icon:'pi pi-id-card', to:'/creations/vacancy' },
          { label: 'Мои вакансии',    icon:'pi pi-briefcase', to:'/vacancies/my' },
          { label: 'Отклики',          icon:'pi pi-comments',  to:'/responses' },
          { label: 'Чаты',          icon:'pi pi-comments',  to:'/chats' }
      );

    } else if (userRole === 'applicant') {
      baseMenu[1].items.push(
          { label: 'Мое резюме', icon:'pi pi-file',      to:'/resume/my' },
          { label: 'Отклики',    icon:'pi pi-comments',  to:'/responses' },
          { label: 'Чаты',          icon:'pi pi-comments',  to:'/chats' }

    );
    }

    return baseMenu;
});
</script>

<template>
    <ul class="layout-menu">
        <template v-for="(item, i) in model" :key="item">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>
    </ul>
</template>

<style lang="scss" scoped></style>
