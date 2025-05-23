import { defineStore } from 'pinia';
import axios from 'axios';

export const useChatStore = defineStore('chatStore', {
    state: () => ({
        chats: [],
        currentChatId: null,
        messages: []
    }),
    actions: {
        async fetchChats() {
            try {
                const response = await axios.get('/chats');
                this.chats = response.data;
            } catch (error) {
                console.error('Ошибка загрузки чатов:', error);
            }
        },
        async createChat(applicantId, companyOwnerId, vacancyId, resumeId) {
            try {
                const payload = { applicant_id: applicantId, company_owner_id: companyOwnerId, vacancy_id: vacancyId, resume_id: resumeId };
                const response = await axios.post('/chats', payload);
                const newChat = response.data;
                // Добавляем новый чат в список (если ещё не был в this.chats)
                this.chats.push(newChat);
                // Можно сразу сделать его текущим открытым чатом:
                this.currentChatId = newChat.chat_id;
                // Очищаем сообщения или загружаем их (новый чат пока без сообщений)
                this.messages = [];
            } catch (error) {
                console.error('Ошибка создания чата:', error);
            }
        },
        selectChat(chatId) {
            this.currentChatId = chatId;
            // При выборе чата можно сразу очистить прошлые сообщения
            this.messages = [];
        },
        async fetchMessages(chatId) {
            try {
                const response = await axios.get(`/chats/${chatId}/messages`);
                this.messages = response.data;
            } catch (error) {
                console.error('Ошибка загрузки сообщений:', error);
            }
        },
        async sendMessage(chatId, text) {
            try {
                const response = await axios.post(`/chats/${chatId}/messages`, { text });
                const sentMessage = response.data;
                // Добавляем отправленное сообщение в локальный список сообщений
                this.messages.push(sentMessage);
                // Можно обновить порядок чатов или пометить чат как с новым сообщением, если нужно
            } catch (error) {
                console.error('Ошибка отправки сообщения:', error);
            }
        }
    }
});
