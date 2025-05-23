<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useToast } from 'primevue/usetoast';
import Textarea from 'primevue/textarea';
import Button   from 'primevue/button';
import { useMessages } from '@/composables/requests';

const route         = useRoute();
const chatId        = route.params.chatId as string;
const { loadMessages, sendMessage, loading } = useMessages();

const messages      = ref<{ id: string; senderId: string; text: string; createdAt: string }[]>([]);
const draft         = ref('');
const toast         = useToast();
const userStore     = useUserStore();
const currentUserId = computed(() => userStore.currentUser?.id);

const scrollRef = ref<HTMLElement | null>(null);

async function fetchAll() {
  try {
    const data = await loadMessages(chatId);
    messages.value = data.map((m: any) => ({
      id:        m.id,
      senderId:  m.sender_id,
      text:      m.text,
      createdAt: m.created_at,
    }));
    await nextTick();
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight;
    }
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Ошибка', detail: e.message });
  }
}

async function onSend() {
  if (!draft.value.trim()) return;
  try {
    await sendMessage(chatId, draft.value.trim());
    draft.value = '';
    await fetchAll();
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Ошибка', detail: e.message });
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    onSend();
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

onMounted(() => {
  document.body.style.overflow = 'hidden';
  fetchAll();
});

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>

<template>
  <div class="chat-window">
    <div class="chat-window__body" ref="scrollRef">
      <div v-if="loading" class="chat-window__loading">
        <i class="pi pi-spin pi-spinner"></i> Загрузка…
      </div>
      <ul v-else class="chat-window__messages">
        <li
            v-for="msg in messages"
            :key="msg.id"
            class="chat-window__message"
            :class="msg.senderId === currentUserId
            ? 'chat-window__message--out'
            : 'chat-window__message--in'"
        >
          <div
              class="bubble"
              :class="msg.senderId === currentUserId
              ? 'bubble--out'
              : 'bubble--in'"
          >
            <p class="bubble__text">{{ msg.text }}</p>
            <time class="bubble__time">{{ formatDate(msg.createdAt) }}</time>
          </div>
        </li>
      </ul>
    </div>

    <div class="chat-window__composer">
      <Textarea
          v-model="draft"
          rows="2"
          placeholder="Введите сообщение…"
          class="composer__input"
          @keydown="onKeydown"
      />
      <Button
          icon="pi pi-send"
          class="composer__btn"
          :loading="loading"
          @click="onSend"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-window {
  position: fixed;
  top: 85px;
  left: 360px;
  right: 50px;
  bottom: 60px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f5f7fa;
  z-index: 100;
}

.chat-window__body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  min-height: 0;
}

.chat-window__loading {
  text-align: center;
  color: #666;
  margin-top: 2rem;
}

.chat-window__messages {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.chat-window__message {
  display: flex;
  width: 100%;
}

.chat-window__message--in  { justify-content: flex-start; }
.chat-window__message--out { justify-content: flex-end; }

.bubble {
  max-width: 70%;
  padding: 0.75rem 1rem;
  word-break: break-word;
  border-radius: 16px;
}

.bubble--in {
  background: #e0e0e0;
  color: #000;
}

.bubble--out {
  background: #3260a8;
  color: #fff;
}

.bubble__time {
  display: block;
  font-size: 0.75rem;
  margin-top: 0.5rem;
  text-align: right;
  color: rgba(0,0,0,0.45);
}

.chat-window__composer {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-top: 1px solid #ececec;
  background: #fff;
  flex-shrink: 0;
}

.composer__input {
  flex: 1;
  min-height: 3.5rem;
  max-height: 8rem;
  overflow-y: auto;
  resize: none;
}

.composer__btn {
  margin-left: 0.5rem;
  align-self: stretch;
  width: 3.5rem;
}
</style>
