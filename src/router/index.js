import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import JobList from '@/pages/JobList.vue'
import AddJobForm from '@/pages/AddJobForm.vue'
import EditJob from '@/pages/EditJob.vue'
import JobHistory from '@/pages/JobHistory.vue'
import LoginView from '@/pages/LoginView.vue'
import { getCurrentUser } from '@/api/authApi'

const SettingsView = () => import('@/pages/SettingsView.vue')

const routes = [
  { path: '/login', component: LoginView, meta: { requiresAuth: false, public: true } },
  {
    path: '/',
    component: AppLayout,
    children: [
      { path: '', component: JobList, meta: { title: '등록된 Job 목록', requiresAuth: true } },
      { path: 'add', component: AddJobForm, meta: { title: 'Job 등록', requiresAuth: true } },
      {
        path: 'edit/:jobName/:jobGroup',
        component: EditJob,
        meta: { title: 'Job 수정', requiresAuth: true },
      },
      {
        path: 'JobHistory',
        component: JobHistory,
        meta: { title: 'Job 이력 목록', requiresAuth: true },
      },
      {
        path: 'settings',
        component: SettingsView,
        meta: { title: 'Settings', requiresAuth: true },
      },
    ],
  },
  // 없는 경로는 로그인으로
  { path: '/:pathMatch(.*)*', redirect: '/login' },
]

const router = createRouter({
  history: createWebHistory(),
  routes: routes,
})

// 중첩 라우트 대응 가드
router.beforeEach(async (to, from, next) => {
  const needsAuth = to.matched.some((r) => r.meta?.requiresAuth)

  if (!needsAuth) {
    // 로그인 페이지에 이미 로그인 상태로 들어오면 홈으로
    if (to.path === '/login') {
      try {
        const { data } = await getCurrentUser()

        if (data?.username) {
          return next('/')
        }
      } catch {
        /* unauthenticated or /auth/me failed: fall through */
      }
    }
    return next()
  }

  try {
    const { data } = await getCurrentUser()
    if (data?.username) {
      return next()
    }
  } catch {
    /* unauthenticated or /auth/me failed: fall through */
  }

  return next({ path: '/login', query: { redirect: to.fullPath } })
})

export default router
