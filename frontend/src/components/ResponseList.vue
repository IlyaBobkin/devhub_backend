<!--<template>-->
<!--  <Dialog-->
<!--      :visible="visible"-->
<!--      header="Отклики"-->
<!--      modal-->
<!--      class="response-list"-->
<!--      @update:visible="onDialogUpdateVisible"-->
<!--  >-->
<!--    <Toast />-->
<!--    <div v-if="loading" class="response-list__loading">Загрузка...</div>-->
<!--    <div v-else class="response-list__content">-->
<!--      <div-->
<!--          v-for="resp in responses"-->
<!--          :key="resp.id"-->
<!--          class="response-list__item"-->
<!--      >-->
<!--        <div class="response-list__user">{{ resp.user_name }}</div>-->
<!--        <div class="response-list__message">{{ resp.message }}</div>-->
<!--        <Button-->
<!--            label="Ответить"-->
<!--            icon="pi pi-reply"-->
<!--            class="response-list__button"-->
<!--            @click="prepareReply(resp.id)"-->
<!--        />-->
<!--      </div>-->

<!--      <div v-if="showEditor" class="response-list__editor">-->
<!--        <Textarea-->
<!--            v-model="replyText"-->
<!--            rows="3"-->
<!--            class="response-list__textarea"-->
<!--        />-->
<!--        <Button-->
<!--            label="Отправить"-->
<!--            icon="pi pi-send"-->
<!--            class="response-list__send"-->
<!--            @click="sendReply"-->
<!--        />-->
<!--      </div>-->
<!--    </div>-->
<!--  </Dialog>-->
<!--</template>-->

<!--<script setup lang="ts">-->
<!--import { ref, watch } from 'vue';-->
<!--import Dialog from 'primevue/dialog';-->
<!--import Button from 'primevue/button';-->
<!--import Textarea from 'primevue/textarea';-->
<!--import Toast from 'primevue/toast';-->
<!--import { useVacancy, useResume } from '@/composables/requests';-->

<!--const props = defineProps<{-->
<!--  type: 'vacancy' | 'resume';-->
<!--  id: string;-->
<!--  visible: boolean;-->
<!--}>();-->
<!--const emit = defineEmits<{-->
<!--  (e: 'update:visible', value: boolean): void;-->
<!--}>();-->

<!--const responses = ref<any[]>([]);-->
<!--const loading = ref(false);-->
<!--const showEditor = ref(false);-->
<!--const replyText = ref('');-->

<!--const { getVacancyResponses, createVacancyResponse } = useVacancy();-->
<!--const { getResumeResponses, createResumeResponse } = useResume();-->

<!--// Слежение за открытием диалога: подгружаем отклики-->
<!--watch(-->
<!--    () => props.visible,-->
<!--    async (val) => {-->
<!--      if (!val) return;-->
<!--      loading.value = true;-->
<!--      try {-->
<!--        responses.value =-->
<!--            props.type === 'vacancy'-->
<!--                ? await getVacancyResponses(props.id)-->
<!--                : await getResumeResponses(props.id);-->
<!--      } catch (e: any) {-->
<!--        // можно вывести ошибку через Toast-->
<!--      } finally {-->
<!--        loading.value = false;-->
<!--        showEditor.value = false;-->
<!--        replyText.value = '';-->
<!--      }-->
<!--    }-->
<!--);-->

<!--function onDialogUpdateVisible(val: boolean) {-->
<!--  emit('update:visible', val);-->
<!--}-->

<!--function prepareReply(respId: string) {-->
<!--  showEditor.value = true;-->
<!--}-->

<!--async function sendReply() {-->
<!--  if (!replyText.value.trim()) return;-->
<!--  try {-->
<!--    if (props.type === 'vacancy') {-->
<!--      await createVacancyResponse(props.id, replyText.value);-->
<!--    } else {-->
<!--      await createResumeResponse(props.id, replyText.value);-->
<!--    }-->
<!--    // обновляем-->
<!--    responses.value =-->
<!--        props.type === 'vacancy'-->
<!--            ? await getVacancyResponses(props.id)-->
<!--            : await getResumeResponses(props.id);-->
<!--    showEditor.value = false;-->
<!--    replyText.value = '';-->
<!--  } catch (e) {-->
<!--    // обработка ошибки-->
<!--  }-->
<!--}-->
<!--</script>-->

<!--<style scoped>-->
<!--.response-list { width: 500px; max-width: 90vw; }-->
<!--.response-list__loading { text-align: center; padding: 1rem; }-->
<!--.response-list__item { border-bottom: 1px solid #eee; padding: .75rem 0; }-->
<!--.response-list__user { font-weight: bold; margin-bottom: .25rem; }-->
<!--.response-list__message { margin-bottom: .5rem; }-->
<!--.response-list__editor { display: flex; gap: .5rem; margin-top: 1rem; }-->
<!--.response-list__textarea { flex: 1; }-->
<!--.response-list__send { align-self: flex-end; }-->
<!--</style>-->
