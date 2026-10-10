<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  deleteExternalApi,
  executeExternalApi,
  getExternalApi,
  getExternalApiPaging,
  getExternalApiParams,
} from '@/api/externalApi'

const route = useRoute()
const router = useRouter()

const externalApi = ref(null)
const paging = ref(null)
const params = ref([])
const loading = ref(true)
const isExecuting = ref(false)

const fetchExternalApiDetail = async () => {
  try {
    // 1. URL에서 External API 식별자를 조회한다.
    const externalApiId = route.params.externalApiId

    // 2. External API 기본정보와 파라미터를 조회한다.
    const [externalApiResponse, pagingResponse, paramsResponse] = await Promise.all([
      getExternalApi(externalApiId),
      getExternalApiPaging(externalApiId),
      getExternalApiParams(externalApiId),
    ])

    // 3. 조회 결과를 화면 상태에 저장한다.
    externalApi.value = externalApiResponse.data
    paging.value = pagingResponse.data || null
    params.value = Array.isArray(paramsResponse.data) ? paramsResponse.data : []
  } catch (error) {
    console.error('External API 상세 조회 실패:', error)
    alert('External API 상세 조회에 실패했습니다.')
    router.push('/externalApi')
  } finally {
    loading.value = false
  }
}

const executeApi = async () => {
  if (!externalApi.value || isExecuting.value) {
    return
  }

  if (!confirm(`${externalApi.value.apiName} API를 즉시 실행하시겠습니까?`)) {
    return
  }

  isExecuting.value = true

  try {
    await executeExternalApi(externalApi.value.externalApiId)

    alert('External API 호출 성공')
  } catch (error) {
    console.error('External API 호출 실패:', error)
    alert('External API 호출 실패')
  } finally {
    isExecuting.value = false
  }
}

const getEnabledLabel = (enabled) => {
  return enabled === 'Y' ? '사용' : '미사용'
}

const getEnabledClass = (enabled) => {
  return enabled === 'Y' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
}

const getMethodClass = (httpMethod) => {
  const methodClasses = {
    GET: 'bg-blue-100 text-blue-700',
    POST: 'bg-green-100 text-green-700',
    PUT: 'bg-yellow-100 text-yellow-700',
    PATCH: 'bg-orange-100 text-orange-700',
    DELETE: 'bg-red-100 text-red-700',
  }

  return methodClasses[httpMethod] || 'bg-gray-100 text-gray-700'
}

const deleteApi = async () => {
  if (!externalApi.value) {
    return
  }

  if (!confirm(`${externalApi.value.apiName} API를 삭제하시겠습니까?`)) {
    return
  }

  try {
    await deleteExternalApi(externalApi.value.externalApiId)

    alert('External API 삭제 성공')
    router.push('/externalApi')
  } catch (error) {
    console.error('External API 삭제 실패:', error)

    const message = error.response?.data || 'External API 삭제에 실패했습니다.'
    alert(message)
  }
}

onMounted(() => {
  fetchExternalApiDetail()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 조회 중 -->
    <div
      v-if="loading"
      class="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500"
    >
      External API 정보를 불러오는 중입니다.
    </div>

    <template v-else-if="externalApi">
      <!-- 기본 정보 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-gray-900">기본 정보</h3>
            <p class="mt-1 text-sm text-gray-500">External API의 기본 호출 설정을 확인합니다.</p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              :disabled="isExecuting"
              class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              @click="executeApi"
            >
              {{ isExecuting ? '실행 중...' : '즉시 실행' }}
            </button>

            <button
              type="button"
              class="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
              @click="router.push(`/externalApi/${externalApi.externalApiId}/edit`)"
            >
              수정
            </button>

            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
              @click="deleteApi"
            >
              삭제
            </button>

            <button
              type="button"
              class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              @click="router.push('/externalApi')"
            >
              목록
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
          <div>
            <div class="text-xs font-medium text-gray-500">API 이름</div>
            <div class="mt-1 text-sm font-medium text-gray-900">
              {{ externalApi.apiName }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">HTTP Method</div>

            <span
              class="mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
              :class="getMethodClass(externalApi.httpMethod)"
            >
              {{ externalApi.httpMethod }}
            </span>
          </div>

          <div class="md:col-span-2">
            <div class="text-xs font-medium text-gray-500">API URL</div>
            <div class="mt-1 break-all text-sm text-gray-700">
              {{ externalApi.apiUrl }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">사용 여부</div>

            <span
              class="mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
              :class="getEnabledClass(externalApi.enabled)"
            >
              {{ getEnabledLabel(externalApi.enabled) }}
            </span>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">재시도 사용 여부</div>

            <span
              class="mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
              :class="getEnabledClass(externalApi.retryEnabled)"
            >
              {{ getEnabledLabel(externalApi.retryEnabled) }}
            </span>
          </div>

          <div v-if="externalApi.retryEnabled === 'Y'">
            <div class="text-xs font-medium text-gray-500">최대 재시도 횟수</div>
            <div class="mt-1 text-sm text-gray-700">{{ externalApi.maxRetryCount }}회</div>
          </div>

          <div v-if="externalApi.retryEnabled === 'Y'">
            <div class="text-xs font-medium text-gray-500">재시도 간격</div>
            <div class="mt-1 text-sm text-gray-700">{{ externalApi.retryIntervalSec }}초</div>
          </div>

          <div class="md:col-span-2">
            <div class="text-xs font-medium text-gray-500">설명</div>
            <div class="mt-1 text-sm text-gray-700">
              {{ externalApi.description || '-' }}
            </div>
          </div>
        </div>
      </section>

      <!-- 인증 정보 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-5">
          <h3 class="text-base font-semibold text-gray-900">인증 정보</h3>
          <p class="mt-1 text-sm text-gray-500">API 호출에 사용되는 인증 방식을 확인합니다.</p>
        </div>

        <div class="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
          <div>
            <div class="text-xs font-medium text-gray-500">인증 방식</div>
            <div class="mt-1 text-sm font-medium text-gray-900">
              {{ externalApi.authType || 'NONE' }}
            </div>
          </div>

          <template v-if="externalApi.authType === 'API_KEY'">
            <div>
              <div class="text-xs font-medium text-gray-500">전달 위치</div>
              <div class="mt-1 text-sm text-gray-700">
                {{ externalApi.authLocation || '-' }}
              </div>
            </div>

            <div>
              <div class="text-xs font-medium text-gray-500">Key 이름</div>
              <div class="mt-1 text-sm text-gray-700">
                {{ externalApi.authKey || '-' }}
              </div>
            </div>

            <div>
              <div class="text-xs font-medium text-gray-500">API Key</div>
              <div class="mt-1 text-sm text-gray-700">********</div>
            </div>
          </template>

          <template v-if="externalApi.authType === 'BEARER'">
            <div>
              <div class="text-xs font-medium text-gray-500">Bearer Token</div>
              <div class="mt-1 text-sm text-gray-700">********</div>
            </div>
          </template>

          <template v-if="externalApi.authType === 'BASIC'">
            <div>
              <div class="text-xs font-medium text-gray-500">Username</div>
              <div class="mt-1 text-sm text-gray-700">
                {{ externalApi.authUsername || '-' }}
              </div>
            </div>

            <div>
              <div class="text-xs font-medium text-gray-500">Password</div>
              <div class="mt-1 text-sm text-gray-700">********</div>
            </div>
          </template>

          <div v-if="!externalApi.authType || externalApi.authType === 'NONE'">
            <div class="text-xs font-medium text-gray-500">인증 정보</div>
            <div class="mt-1 text-sm text-gray-700">사용하지 않음</div>
          </div>
        </div>
      </section>

      <!-- 페이징 설정 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-5 flex items-center justify-between gap-4">
          <div>
            <h3 class="text-base font-semibold text-gray-900">페이징 설정</h3>
            <p class="mt-1 text-sm text-gray-500">
              여러 페이지로 제공되는 API의 반복 호출 설정입니다.
            </p>
          </div>

          <span
            class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
            :class="paging ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
          >
            {{ paging ? '설정됨' : '미설정' }}
          </span>
        </div>

        <div v-if="paging" class="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
          <div>
            <div class="text-xs font-medium text-gray-500">페이징 방식</div>
            <div class="mt-1 text-sm text-gray-700">
              {{ paging.paginationType }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">종료 조건</div>
            <div class="mt-1 text-sm text-gray-700">
              {{ paging.terminationType }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">페이지 번호 전달 위치</div>
            <div class="mt-1 text-sm text-gray-700">
              {{ paging.pageParamLocation }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">페이지 번호 파라미터명</div>
            <div class="mt-1 text-sm text-gray-700">
              {{ paging.pageParamName }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">시작 페이지</div>
            <div class="mt-1 text-sm text-gray-700">
              {{ paging.pageStart }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">페이지 크기 전달 위치</div>
            <div class="mt-1 text-sm text-gray-700">
              {{ paging.sizeParamLocation }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">페이지 크기 파라미터명</div>
            <div class="mt-1 text-sm text-gray-700">
              {{ paging.sizeParamName }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">페이지당 조회 건수</div>
            <div class="mt-1 text-sm text-gray-700">
              {{ paging.pageSize }}
            </div>
          </div>

          <div class="md:col-span-2">
            <div class="text-xs font-medium text-gray-500">전체 건수 경로</div>
            <div class="mt-1 break-all text-sm text-gray-700">
              {{ paging.totalCountPath }}
            </div>
          </div>

          <div>
            <div class="text-xs font-medium text-gray-500">최대 요청 횟수</div>
            <div class="mt-1 text-sm text-gray-700">{{ paging.maxRequestCount }}회</div>
          </div>
        </div>

        <div
          v-else
          class="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500"
        >
          등록된 페이징 설정이 없습니다.
        </div>
      </section>

      <!-- 파라미터 -->
      <section class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="mb-4">
          <h3 class="text-base font-semibold text-gray-900">파라미터</h3>
          <p class="mt-1 text-sm text-gray-500">
            API 호출 시 전달되는 Header, Query, Body 파라미터입니다.
          </p>
        </div>

        <div v-if="params.length > 0" class="overflow-x-auto rounded-lg border border-gray-200">
          <table class="w-full text-sm">
            <thead class="border-b border-gray-200 bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
                  위치
                </th>
                <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
                  이름
                </th>
                <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
                  값 유형
                </th>
                <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
                  값
                </th>
                <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
                  포맷
                </th>
                <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
                  필수
                </th>
                <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
                  순서
                </th>
                <th class="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">
                  설명
                </th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="param in params"
                :key="param.paramId"
                class="transition-colors hover:bg-gray-50"
              >
                <td class="px-4 py-3 text-center text-gray-600">
                  {{ param.paramLocation }}
                </td>

                <td class="px-4 py-3 text-center font-medium text-gray-900">
                  {{ param.paramName }}
                </td>

                <td class="px-4 py-3 text-center text-gray-600">
                  {{ param.valueType }}
                </td>

                <td class="max-w-xs px-4 py-3 text-gray-600">
                  <div class="truncate" :title="param.paramValue || ''">
                    {{ param.paramValue || '-' }}
                  </div>
                </td>

                <td class="px-4 py-3 text-center text-gray-600">
                  {{ param.valueFormat || '-' }}
                </td>

                <td class="px-4 py-3 text-center">
                  <span
                    class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                    :class="
                      param.requiredYn === 'Y'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    "
                  >
                    {{ param.requiredYn === 'Y' ? '필수' : '선택' }}
                  </span>
                </td>

                <td class="px-4 py-3 text-center text-gray-600">
                  {{ param.sortOrder }}
                </td>

                <td class="max-w-xs px-4 py-3 text-gray-600">
                  <div class="truncate" :title="param.description || ''">
                    {{ param.description || '-' }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-else
          class="rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500"
        >
          등록된 파라미터가 없습니다.
        </div>
      </section>
    </template>
  </div>
</template>
