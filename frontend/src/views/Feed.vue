<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { useVacancy } from '@/composables/requests'
import { useResume } from '@/composables/requests'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import Card from 'primevue/card'
import Button from 'primevue/button'

const store     = useUserStore()
const toast     = useToast()
const isApplicant = computed(() => store.currentUser?.role === 'applicant')

const {
  getAllVacancies,
  createVacancyResponse,
  getMyVacancies,
  createVacancyInvitation,
  getMyVacancyResponses,
  getSentVacancyInvitations,
  updateVacancyResponseStatus,
  updateVacancyInvitationStatus
} = useVacancy()

const { getAllResumes } = useResume()

const items     = ref<any[]>([])
const vacancies = ref<any[]>([])
const loading   = ref(false)

const responded = ref<Record<string, { id: string; status: string }>>({})
const invited   = ref<Record<string, { id: string; status: string }>>({})

onMounted(async () => {
  loading.value = true
  try {
    if (isApplicant.value) {
      items.value = await getAllVacancies()
      const respList = await getMyVacancyResponses()
      respList.forEach(r => {
        responded.value[r.item_id] = { id: r.id, status: r.status }
      })
    } else {
      items.value     = await getAllResumes()
      vacancies.value = await getMyVacancies()
      const invList = await getSentVacancyInvitations()
      invList.forEach(i => {
        invited.value[i.applicant_id] = { id: i.id, status: i.status }
      })
    }
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Ошибка', detail: e.message, life: 3000 })
  } finally {
    loading.value = false
  }
})

async function respondVacancy(vacancyId: string) {
  const r = await createVacancyResponse(vacancyId, '')
  responded.value[vacancyId] = { id: r.id, status: 'pending' }
  toast.add({ severity: 'success', summary: 'Успех', detail: 'Отклик отправлен', life: 3000 })
}

async function cancelResponse(vacancyId: string) {
  const rec = responded.value[vacancyId]
  await updateVacancyResponseStatus(vacancyId, rec.id, 'canceled')
  responded.value[vacancyId].status = 'canceled'
  toast.add({ severity: 'info', summary: 'Готово', detail: 'Отклик отменён', life: 3000 })
}

async function inviteApplicant(applicantId: string) {
  if (!vacancies.value.length) {
    toast.add({ severity: 'warn', summary: 'Внимание', detail: 'У вас нет активных вакансий', life: 3000 })
    return
  }
  const vacancyId = vacancies.value[0].id
  const inv = await createVacancyInvitation(vacancyId, applicantId, '')
  invited.value[applicantId] = { id: inv.id, status: 'pending' }
  toast.add({ severity: 'success', summary: 'Успех', detail: 'Приглашение отправлено', life: 3000 })
}

async function cancelInvitation(applicantId: string) {
  const rec = invited.value[applicantId]
  await updateVacancyInvitationStatus(rec.vacancyId, rec.id, 'canceled')
  delete invited.value[applicantId]
  toast.add({ severity: 'info', summary: 'Готово', detail: 'Приглашение отменено', life: 3000 })
}

function showResponses(type: 'vacancy'|'resume', id: string) {
  // открываем модалку
}

function formatExp(level: string) {
  return ({ junior: 'Junior', middle: 'Middle', senior: 'Senior' } as any)[level] || level
}
function formatCurrency(val: number|string) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', minimumFractionDigits: 0
  }).format(Number(val))
}
</script>

<template>
  <div class="feed">
    <Toast />
    <h2 class="feed__title">
      {{ isApplicant ? 'Список вакансий' : 'Список резюме' }}
    </h2>

    <div v-if="loading" class="feed__loading">Загрузка...</div>
    <div v-else class="feed__list">
      <Card v-if="isApplicant" v-for="job in items" :key="job.id" class="feed__card">
        <template #title>
          <div class="feed__header">
            <h3>{{ job.title }}</h3>
            <span>{{ job.company_name }}</span>
          </div>
        </template>
        <template #content>
          <p>{{ job.description }}</p>
          <p>{{ formatCurrency(job.salary_from) }}
            <span v-if="job.salary_to">— до {{ formatCurrency(job.salary_to) }}</span>
          </p>
          <p>{{ formatExp(job.experience_level) }}</p>
        </template>
        <template #footer>
          <div class="feed__footer">
            <Button
                v-if="!responded[job.id] || responded[job.id].status === 'canceled'"
                label="Откликнуться"
                icon="pi pi-check"
                @click="respondVacancy(job.id)"
            />
            <Button
                v-else-if="responded[job.id].status==='pending'"
                label="Отменить"
                severity="danger"
                @click="cancelResponse(job.id)"
            />
            <span v-else class="feed__label">
              {{ responded[job.id].status==='accepted' ? 'Принято' : 'Отменено' }}
            </span>
            <Button
                label="Отклики"
                icon="pi pi-comments"
                class="ml-2"
                @click="showResponses('vacancy', job.id)"
            />
          </div>
        </template>
      </Card>

      <Card v-else v-for="res in items" :key="res.id" class="feed__card">
        <template #title>
          <div class="feed__header">
            <h3>{{ res.title }}</h3>
            <span>{{ res.applicant_name }}</span>
          </div>
        </template>
        <template #content>
          <p>{{ res.description }}</p>
          <p>{{ res.expected_salary!=null ? formatCurrency(res.expected_salary) : '–' }}</p>
        </template>
        <template #footer>
          <div class="feed__footer">
            <Button
                v-if="!invited[res.applicant_id]"
                label="Пригласить"
                icon="pi pi-envelope"
                @click="inviteApplicant(res.applicant_id)"
            />
            <Button
                v-else-if="invited[res.applicant_id].status==='pending'"
                label="Отменить"
                severity="danger"
                @click="cancelInvitation(res.applicant_id)"
            />
            <span v-else class="feed__label">
              Принято
           </span>
            <Button
                label="Отклики"
                icon="pi pi-comments"
                class="ml-2"
                @click="showResponses('resume', res.id)"
            />
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.feed {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
}
.feed__title {
  margin-bottom: 1rem;
  font-size: 1.5rem;
  text-align: center;
}
.feed__loading {
  text-align: center;
  margin: 2rem 0;
}
.feed__list {
  display: grid;
  gap: 1.5rem;
}
.feed__card {
  padding: 1rem;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.05);
}
.feed__header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.feed__job-title {
  font-size: 1.2rem;
  margin: 0;
}
.feed__company {
  color: #666;
}
.feed__content {
  margin-bottom: 0.5rem;
}
.feed__description {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.feed__meta {
  font-size: 0.9rem;
  color: #444;
  margin: 0.2rem 0;
}
.feed__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  align-items: center;
}
.feed__label {
  font-style: italic;
  color: #666;
  margin: 0 0.5rem;
}
.ml-2 {
  margin-left: 0.5rem;
}
</style>
