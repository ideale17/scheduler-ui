<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import { getRawDataDetail } from '@/api/rawDataApi'
import RawDataXmlTreeNode from '@/components/RawDataXmlTreeNode.vue'
import { parseXmlTree } from '@/utils/xmlUtils'

// 화면 상태
const route = useRoute()
const router = useRouter()

const rawData = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')

const activeTab = ref('tree')
const selectedJsonPath = ref('')
const selectedXmlPath = ref('')

// JSON 파싱
const parsedJson = computed(() => {
  const responseBody = rawData.value?.responseBody

  if (responseBody == null || responseBody === '') {
    return { valid: false, value: null }
  }

  try {
    return {
      valid: true,
      value: JSON.parse(responseBody),
    }
  } catch {
    return { valid: false, value: null }
  }
})

// XML 파싱
const parsedXml = computed(() => {
  const responseBody = rawData.value?.responseBody

  if (!responseBody || parsedJson.value.valid) {
    return { valid: false, root: null, error: '' }
  }

  return parseXmlTree(responseBody)
})

// 트리로 표시할 데이터 형식
const treeType = computed(() => {
  if (parsedJson.value.valid) {
    return 'json'
  }

  if (parsedXml.value.valid) {
    return 'xml'
  }

  return null
})

// JSON은 들여쓰기하여 표시하고 XML은 원본을 유지한다.
const formattedResponse = computed(() => {
  const responseBody = rawData.value?.responseBody ?? ''

  if (!parsedJson.value.valid) {
    return responseBody
  }

  return JSON.stringify(parsedJson.value.value, null, 2)
})

// Raw Data 상세 조회
const fetchRawDataDetail = async () => {
  const rawDataId = Number(route.params.rawDataId)

  if (!Number.isSafeInteger(rawDataId) || rawDataId < 1) {
    rawData.value = null
    errorMessage.value = 'Raw Data 식별자가 올바르지 않습니다.'
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await getRawDataDetail(rawDataId)

    rawData.value = response.data
    selectedJsonPath.value = ''
    selectedXmlPath.value = ''
    activeTab.value = treeType.value ? 'tree' : 'raw'
  } catch (error) {
    console.error('Raw Data 상세 조회 실패:', error)
    rawData.value = null
    errorMessage.value = 'Raw Data 상세 정보를 불러오지 못했습니다.'
  } finally {
    isLoading.value = false
  }
}

// XML 노드 선택
const selectXmlPath = (xpath) => {
  selectedXmlPath.value = xpath
}

// 원본 응답 데이터 복사
const copyResponse = async () => {
  if (rawData.value?.responseBody == null) {
    return
  }

  try {
    await navigator.clipboard.writeText(rawData.value.responseBody)
    alert('원본 데이터를 복사했습니다.')
  } catch (error) {
    console.error('Raw Data 복사 실패:', error)
    alert('원본 데이터를 복사하지 못했습니다.')
  }
}

// 목록 이동
const goBack = () => {
  router.push({
    path: '/raw-data',
    query: route.query,
  })
}

// 날짜 표시
const formatDateTime = (dateTime) => {
  if (!dateTime) {
    return '-'
  }

  return String(dateTime).replace('T', ' ').substring(0, 19)
}

onMounted(() => {
  fetchRawDataDetail()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-end">
      <button
        type="button"
        class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        @click="goBack"
      >
        목록
      </button>
    </div>

    <div
      v-if="isLoading"
      class="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500"
    >
      Raw Data 상세 정보를 불러오는 중입니다.
    </div>

    <div
      v-else-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      {{ errorMessage }}
    </div>

    <template v-else-if="rawData">
      <!-- 기본 정보 -->
      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <h3 class="mb-4 text-sm font-semibold text-gray-900">기본 정보</h3>

        <dl class="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div>
            <dt class="text-gray-500">Raw Data ID</dt>
            <dd class="mt-1 font-medium text-gray-900">
              {{ rawData.rawDataId }}
            </dd>
          </div>

          <div>
            <dt class="text-gray-500">API명</dt>
            <dd class="mt-1 font-medium text-gray-900">
              {{ rawData.apiName || `API #${rawData.externalApiId}` }}
            </dd>
          </div>

          <div>
            <dt class="text-gray-500">요청 순번</dt>
            <dd class="mt-1 text-gray-700">
              {{ rawData.requestSequence ?? '-' }}
            </dd>
          </div>

          <div>
            <dt class="text-gray-500">Content-Type</dt>
            <dd class="mt-1 break-all text-gray-700">
              {{ rawData.contentType || '-' }}
            </dd>
          </div>

          <div>
            <dt class="text-gray-500">수집 일시</dt>
            <dd class="mt-1 text-gray-700">
              {{ formatDateTime(rawData.collectedAt) }}
            </dd>
          </div>

          <div class="min-w-0">
            <dt class="text-gray-500">Execution ID</dt>
            <dd class="mt-1 break-all font-mono text-xs text-gray-700">
              {{ rawData.executionId || '-' }}
            </dd>
          </div>
        </dl>
      </div>

      <!-- 응답 데이터 -->
      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-gray-900">원본 응답 데이터</h3>

          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              :disabled="!treeType"
              class="rounded-md border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              :class="
                activeTab === 'tree'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              "
              @click="activeTab = 'tree'"
            >
              트리 보기
            </button>

            <button
              type="button"
              class="rounded-md border px-3 py-1.5 text-sm"
              :class="
                activeTab === 'raw'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              "
              @click="activeTab = 'raw'"
            >
              원본 보기
            </button>

            <button
              type="button"
              :disabled="rawData.responseBody == null"
              class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              @click="copyResponse"
            >
              복사
            </button>
          </div>
        </div>

        <!-- JSON 트리 -->
        <div v-if="activeTab === 'tree' && treeType === 'json'" class="space-y-3">
          <div class="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
            <div class="mb-1 text-xs font-medium text-gray-500">선택한 JSON 경로</div>

            <div class="break-all font-mono text-sm text-gray-800">
              {{ selectedJsonPath || 'JSON 노드를 선택해 주세요.' }}
            </div>
          </div>

          <div class="max-h-[650px] overflow-auto rounded-md border border-gray-200 bg-white p-4">
            <VueJsonPretty
              v-model:selected-value="selectedJsonPath"
              :data="parsedJson.value"
              :deep="2"
              :show-length="true"
              :show-icon="true"
              selectable-type="single"
              :select-on-click-node="true"
              :editable="false"
            />
          </div>
        </div>

        <!-- XML 트리 -->
        <div v-else-if="activeTab === 'tree' && treeType === 'xml'" class="space-y-3">
          <div class="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
            <div class="mb-1 text-xs font-medium text-gray-500">선택한 XPath</div>

            <div class="break-all font-mono text-sm text-gray-800">
              {{ selectedXmlPath || 'XML 노드를 선택해 주세요.' }}
            </div>
          </div>

          <div class="max-h-[650px] overflow-auto rounded-md border border-gray-200 bg-white p-4">
            <RawDataXmlTreeNode
              :node="parsedXml.root"
              :selected-path="selectedXmlPath"
              @select="selectXmlPath"
            />
          </div>
        </div>

        <!-- 원본 보기 -->
        <pre
          v-else-if="activeTab === 'raw'"
          class="max-h-[650px] overflow-auto rounded-md border border-gray-200 bg-gray-50 p-4 font-mono text-xs leading-5 text-gray-800"
        ><code>{{ formattedResponse }}</code></pre>

        <!-- 파싱 불가능한 데이터 -->
        <div v-else class="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
          JSON 또는 XML 형식으로 파싱할 수 없는 데이터입니다. 원본 보기에서 확인해 주세요.
        </div>
      </div>
    </template>
  </div>
</template>
