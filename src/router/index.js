import { createRouter, createWebHistory } from 'vue-router'
import { getSignupEnabled } from '@/api/authApi'
import { useAuthStore } from '@/stores/authStore'
import AppLayout from '@/layouts/AppLayout.vue'
import LoginView from '@/pages/LoginView.vue'
import SignupView from '@/pages/SignupView.vue'
import DashboardView from '@/pages/DashboardView.vue'
import JobList from '@/pages/JobList.vue'
import AddJobForm from '@/pages/AddJobForm.vue'
import EditJob from '@/pages/EditJob.vue'
import JobHistory from '@/pages/JobHistory.vue'
import SchedulerInfoView from '@/pages/SchedulerInfoView.vue'
import ExternalApiList from '@/pages/ExternalApiList.vue'
import ExternalApiAdd from '@/pages/ExternalApiAdd.vue'
import ExternalApiDetail from '@/pages/ExternalApiDetail.vue'
import ExternalApiEdit from '@/pages/ExternalApiEdit.vue'
import ExternalApiCallHistory from '@/pages/ExternalApiCallHistory.vue'
import RawDataList from '@/pages/RawDataList.vue'
import RawDataDetail from '@/pages/RawDataDetail.vue'
import TransformRuleList from '@/pages/TransformRuleList.vue'
import TransformRuleDetail from '@/pages/TransformRuleDetail.vue'
import TransformRuleAdd from '@/pages/TransformRuleAdd.vue'
import TransformTaskList from '@/pages/TransformTaskList.vue'
import TransformResultList from '@/pages/TransformResultList.vue'
import TransformResultDetail from '@/pages/TransformResultDetail.vue'
import AiAnalysis from '@/pages/AiAnalysis.vue'

const routes = [
  { path: '/login', component: LoginView, meta: { requiresAuth: false, public: true } },
  { path: '/signup', component: SignupView, meta: { requiresAuth: false, public: true } },
  {
    path: '/',
    component: AppLayout,
    children: [
      {
        path: '',
        component: DashboardView,
        meta: { title: '대시보드', requiresAuth: true },
      },
      { path: 'jobList', component: JobList, meta: { title: 'Job 관리', requiresAuth: true } },
      { path: 'add', component: AddJobForm, meta: { title: 'Job 등록', requiresAuth: true } },
      {
        path: 'edit/:jobName/:jobGroup',
        component: EditJob,
        meta: { title: 'Job 수정', requiresAuth: true },
      },
      {
        path: 'JobHistory',
        component: JobHistory,
        meta: { title: 'Job 실행 이력', requiresAuth: true },
      },
      {
        path: 'externalApi',
        component: ExternalApiList,
        meta: {
          title: 'API 관리',
          requiresAuth: true,
        },
      },
      {
        path: 'externalApi/:externalApiId',
        component: ExternalApiDetail,
        meta: {
          title: 'API 상세',
          requiresAuth: true,
        },
      },
      {
        path: 'externalApi/history',
        component: ExternalApiCallHistory,
        meta: {
          title: 'API 실행 이력',
          requiresAuth: true,
        },
      },
      {
        path: 'externalApi/add',
        component: ExternalApiAdd,
        meta: {
          title: 'API 등록',
          requiresAuth: true,
        },
      },
      {
        path: 'externalApi/:externalApiId/edit',
        component: ExternalApiEdit,
        meta: {
          title: 'API 수정',
          requiresAuth: true,
        },
      },
      {
        path: 'raw-data',
        component: RawDataList,
        meta: {
          title: 'Raw Data 관리',
          requiresAuth: true,
        },
      },
      {
        path: 'raw-data/:rawDataId',
        component: RawDataDetail,
        meta: {
          title: 'Raw Data 상세',
          requiresAuth: true,
        },
      },
      {
        path: 'transform-rule',
        component: TransformRuleList,
        meta: {
          title: '가공 규칙 관리',
          requiresAuth: true,
        },
      },
      {
        path: 'transform-rule/:transformRuleId',
        component: TransformRuleDetail,
        meta: {
          title: '가공 규칙 상세',
          requiresAuth: true,
        },
      },
      {
        path: 'transform-rule/add',
        component: TransformRuleAdd,
        meta: {
          title: '가공 규칙 등록',
          requiresAuth: true,
        },
      },
      {
        path: 'transform-task',
        component: TransformTaskList,
        meta: {
          title: '가공 대상 관리',
          requiresAuth: true,
        },
      },
      {
        path: 'transform-result',
        component: TransformResultList,
        meta: {
          title: '가공 결과',
          requiresAuth: true,
        },
      },
      {
        path: 'transform-result/:transformResultId',
        component: TransformResultDetail,
        meta: {
          title: '가공 결과 상세',
          requiresAuth: true,
        },
      },
      {
        path: 'ai-analysis',
        component: AiAnalysis,
        meta: {
          title: 'AI 데이터 분석',
          requiresAuth: true,
        },
      },
      {
        path: 'schedulerInfo',
        component: SchedulerInfoView,
        meta: { title: 'Scheduler 정보', requiresAuth: true },
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

// 중첩 라우트를 포함해 페이지 접근 전에 인증 상태를 확인한다.
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  const needsAuth = to.matched.some((r) => r.meta?.requiresAuth)

  // 1. 회원가입 화면 접근 가능 여부를 확인한다.
  if (to.path === '/signup') {
    try {
      const { data } = await getSignupEnabled()

      if (!data?.signupEnabled) {
        return next('/login')
      }
    } catch {
      return next('/login')
    }
  }

  // 2. 인증이 필요 없는 화면의 접근을 처리한다.
  if (!needsAuth) {
    // 로그인,회원가입 화면에 접근할 때 로그인 상태를 확인한다.
    if (to.path === '/login' || to.path === '/signup') {
      try {
        // 서버 인증 확인을 아직 수행하지 않은 경우에만 조회한다.
        if (!authStore.isInitialized) {
          await authStore.loadCurrentUser()
        }

        // 이미 인증된 사용자는 홈으로 이동한다.
        if (authStore.isAuthenticated) {
          return next('/')
        }
      } catch {
        // 인증 확인이 실패한 경우 기존 공개 화면 접근을 유지한다.
      }
    }
    return next()
  }

  // 3. 인증이 필요한 화면에 접근하기 전에 서버 세션을 확인한다.
  try {
    await authStore.loadCurrentUser()

    if (authStore.isAuthenticated) {
      return next()
    }
  } catch {
    // 인증 확인 실패 시 로그인 화면으로 이동한다.
  }

  // 4. 인증되지 않은 사용자는 로그인 후 원래 화면으로 복귀하도록 한다.
  return next({
    path: '/login',
    query: { redirect: to.fullPath },
  })
})

export default router
