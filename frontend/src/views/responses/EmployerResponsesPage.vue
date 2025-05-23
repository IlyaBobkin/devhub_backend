<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useVacancy, useChat } from '@/composables/requests'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import DetailModal from './DetailModal.vue'

interface Message {
  id: string
  type: 'invitation' | 'response'
  whoName: string
  displayTitle: string
  viewType: 'resume'
  viewId: string
  message: string
  date: string
  status: 'pending' | 'accepted' | 'canceled'
  applicantId: string
  vacancyId: string
  localTimestamp: number
}

const router    = useRouter()
const store     = useUserStore()
const toast     = useToast()
const { createChat } = useChat()
const {
  getSentVacancyInvitations,
  getOwnerVacancyResponses,
  updateVacancyResponseStatus
} = useVacancy()

const loading    = ref(true)
const messages   = ref<Message[]>([])
const showDetail = ref(false)
const detailType = ref<'resume'>('resume')
const detailId   = ref('')

function formatDate(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime())
      ? iso
      : new Intl.DateTimeFormat('ru-RU', {
        day:   '2-digit',
        month: '2-digit',
        year:  'numeric',
        hour:   '2-digit',
        minute: '2-digit'
      }).format(d)
}

function viewItem(m: Message) {
  detailType.value = 'resume'
  detailId.value   = m.viewId
  showDetail.value = true
}

async function acceptResponse(m: Message) {
  try {
    await updateVacancyResponseStatus(m.vacancyId, m.id, 'accepted')
    m.status = 'accepted'
    const chat = await createChat({
      applicant_id:     m.applicantId,
      company_owner_id: store.currentUser!.id,
      vacancy_id:       m.vacancyId
    })
    router.push({ name: 'ChatWindow', params: { chatId: chat.id } })
  } catch (e: any) {
    toast.add({ severity:'error', summary:'Ошибка', detail:e.message })
  }
}

async function rejectResponse(m: Message) {
  try {
    await updateVacancyResponseStatus(m.vacancyId, m.id, 'canceled')
    m.status = 'canceled'
    toast.add({ severity:'info', summary:'Отклонено', detail:'Отклик отклонён' })
  } catch (e: any) {
    toast.add({ severity:'error', summary:'Ошибка', detail:e.message })
  }
}

onMounted(async () => {
  try {
    const [invites, responses] = await Promise.all([
      getSentVacancyInvitations(),
      getOwnerVacancyResponses()
    ])
    const now = Date.now()

    const inv = invites.map((r, i) => ({
      ...r,
      type: 'invitation' as const,
      viewType: 'resume' as const,
      whoName: r.applicant_name,
      displayTitle: r.vacancy_title,
      viewId: r.applicant_id,
      message: r.message || 'Без комментария',
      status: r.status,
      date: r.created_at,
      localTimestamp: now + i,
      applicantId: r.applicant_id,
      vacancyId: r.vacancy_id
    }))

    const res = responses.map((r, i) => ({
      ...r,
      type: 'response' as const,
      viewType: 'resume' as const,
      whoName: r.applicant_name,
      displayTitle: r.vacancy_title,
      viewId: r.applicant_id,
      message: r.message || 'Без комментария',
      status: r.status,
      date: r.created_at,
      localTimestamp: now + invites.length + i,
      applicantId: r.applicant_id,
      vacancyId: r.vacancy_id
    }))

    messages.value = [...res, ...inv].sort((a, b) => {
      const ta = new Date(a.date).getTime()
      const tb = new Date(b.date).getTime()
      if (ta !== tb) return ta - tb
      return a.localTimestamp - b.localTimestamp
    })
  } catch (e: any) {
    toast.add({ severity:'error', summary:'Ошибка', detail:e.message })
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="responses-page">
    <header class="responses-page__header">
      <h1>История откликов</h1>
    </header>

    <div v-if="loading" class="responses-page__loading">
      Загрузка…
    </div>

    <ul v-else class="responses-page__messages">
      <li
          v-for="msg in messages"
          :key="msg.id"
          :class="['message', msg.type === 'response' ? 'message--left' : 'message--right']"
      >
        <div :class="['bubble', msg.type === 'response' ? 'bubble--green' : 'bubble--gray']">
          <div class="bubble__top">
            <strong class="bubble__who">{{ msg.whoName }}</strong>
            <Button icon="pi pi-eye" class="bubble__eye" @click="viewItem(msg)" />
          </div>

          <div class="bubble__title">{{ msg.displayTitle }}</div>
          <div class="bubble__text">{{ msg.message }}</div>

          <div class="bubble__status" v-if="msg.type === 'response' && msg.status !== 'pending'">
            <span class="bubble__label">
              {{ msg.status === 'accepted' ? 'Принято' : 'Отказано' }}
            </span>
          </div>

          <div class="bubble__bottom">
            <time class="bubble__time">{{ formatDate(msg.date) }}</time>

            <template v-if="msg.type === 'response' && msg.status === 'pending'">
              <Button
                  label="Принять"
                  size="small"
                  class="bubble__btn"
                  @click="acceptResponse(msg)"
              />
              <Button
                  label="Отказать"
                  severity="danger"
                  size="small"
                  class="bubble__btn"
                  @click="rejectResponse(msg)"
              />
            </template>
          </div>
        </div>
      </li>
    </ul>

    <DetailModal v-model="showDetail" type="resume" :id="detailId" />
  </div>
</template>

<style scoped>
.responses-page {
  max-width: 1000px;
  margin: 2rem auto;
  background: #fafbfc;
  border-radius: 12px;
  overflow: hidden;
}
.responses-page__header {
  background: #fff;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}
.responses-page__header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #1f2d3d;
}
.responses-page__loading {
  padding: 2rem;
  text-align: center;
  color: #667085;
}
.responses-page__messages {
  list-style: none;
  padding: 1rem;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: calc(80vh - 70px);
  overflow-y: auto;
}
.message {
  display: flex;
}
.message--left  { justify-content: flex-start; }
.message--right { justify-content: flex-end; }

.bubble {
  max-width: 70%;
  padding: 0.75rem 1rem;
  border-radius: 16px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative;
}
.bubble--green { background: #e6f4ea; }
.bubble--gray  { background: #f5f7fa; }

.bubble__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.bubble__who {
  font-size: 0.95rem;
  color: #1f2d3d;
}
.bubble__eye .pi-eye {
  color: #4caf50 !important;
}
.bubble__title {
  font-style: italic;
  color: #475569;
}
.bubble__text {
  color: #344054;
}

.bubble__status {
  margin: 0.25rem 0;
}
.bubble__label {
  font-style: italic;
  color: #475569;
}

.bubble__bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.bubble__time {
  font-size: 0.75rem;
  color: #667085;
}
.bubble__btn {
  margin-left: 0.5rem;
}
</style>
