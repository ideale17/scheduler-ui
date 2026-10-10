<script setup>
import { ref } from 'vue'

defineOptions({ name: 'RawDataXmlTreeNode' })

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  selectedPath: {
    type: String,
    default: '',
  },
  depth: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['select'])

const expanded = ref(props.depth < 2)

const selectNode = () => {
  if (props.node.xpath) {
    emit('select', props.node.xpath)
  }
}

const forwardSelection = (xpath) => {
  emit('select', xpath)
}
</script>

<template>
  <div class="font-mono text-xs leading-6">
    <div
      class="flex min-w-0 items-start gap-1 rounded px-1"
      :class="[
        node.xpath ? 'cursor-pointer hover:bg-gray-100' : '',
        selectedPath && selectedPath === node.xpath ? 'bg-blue-50' : '',
      ]"
    >
      <button
        v-if="node.children.length > 0"
        type="button"
        class="w-4 shrink-0 text-gray-500"
        :aria-label="expanded ? '접기' : '펼치기'"
        @click.stop="expanded = !expanded"
      >
        {{ expanded ? '▼' : '▶' }}
      </button>

      <span v-else class="w-4 shrink-0"></span>

      <button
        type="button"
        :disabled="!node.xpath"
        class="min-w-0 break-all text-left disabled:cursor-default"
        @click="selectNode"
      >
        <span
          :class="{
            'font-semibold text-blue-700': node.type === 'element',
            'text-purple-700': node.type === 'attribute',
            'text-gray-500': node.type === 'namespace',
            'text-green-700': node.type === 'text',
          }"
        >
          {{ node.label }}
        </span>

        <span v-if="node.type !== 'element'" class="ml-2 text-gray-700">
          {{ node.value }}
        </span>
      </button>
    </div>

    <div v-if="expanded && node.children.length > 0" class="ml-4 border-l border-gray-200 pl-3">
      <RawDataXmlTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected-path="selectedPath"
        :depth="depth + 1"
        @select="forwardSelection"
      />
    </div>
  </div>
</template>
