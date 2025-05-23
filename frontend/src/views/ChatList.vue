<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';
import { useChat } from '@/composables/requests';

// Берём список чатов и состояние из composable
const { chats, getChatsList, loading, error } = useChat();
const toast  = useToast();
const router = useRouter();

async function init() {
  try {
    await getChatsList();
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Ошибка', detail: e.message });
  }
}

function openChat(chatId: string) {
  router.push({ name: 'ChatWindow', params: { chatId } });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day:    '2-digit', month: '2-digit', year: 'numeric',
    hour:   '2-digit', minute: '2-digit'
  });
}

onMounted(init);
</script>

<template>
  <div class="chat-list">
    <Toast />
    <h2 class="chat-list__title">Ваши чаты</h2>
    <ul class="chat-list__items">
      <li
          v-for="chat in chats"
          :key="chat.id"
          class="chat-list__item"
          @click="openChat(chat.id)"
      >
        <div class="chat-list__info">
          <span class="chat-list__opponent">{{ chat.opponentName }}</span>
          <span class="chat-list__context">{{ chat.contextTitle }}</span>
        </div>
        <time class="chat-list__date">{{ formatDate(chat.createdAt) }}</time>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.chat-list {
  max-width: 600px;
  margin: 2rem auto;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  padding: 1.5rem;
}

.chat-list__title {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #3260a8;
  text-align: center;
}

.chat-list__items {
  list-style: none;
  margin: 0;
  padding: 0;
}

.chat-list__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}
.chat-list__item:last-child {
  margin-bottom: 0;
}
.chat-list__item:hover {
  background-color: #f0f4f8;
  box-shadow: inset 4px 0 0 #3260a8;
}

.chat-list__info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.chat-list__opponent {
  font-size: 1.1rem;
  font-weight: 500;
  color: #3260a8;
}

.chat-list__context {
  font-size: 0.9rem;
  color: #666;
  font-style: italic;
}

.chat-list__date {
  font-size: 0.8rem;
  color: #999;
  white-space: nowrap;
}
</style>
