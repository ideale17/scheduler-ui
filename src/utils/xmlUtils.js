const toXPathLiteral = (value) => {
  if (!value.includes("'")) {
    return `'${value}'`
  }

  if (!value.includes('"')) {
    return `"${value}"`
  }

  const parts = value.split("'")
  return `concat(${parts.map((part) => `'${part}'`).join(`, "'", `)})`
}

const getXPathName = (node) => {
  const localName = node.localName || node.nodeName
  const namespace = node.namespaceURI || ''

  if (!namespace) {
    return localName
  }

  return `*[local-name()=${toXPathLiteral(localName)} and namespace-uri()=${toXPathLiteral(namespace)}]`
}

const getAttributeXPathName = (attribute) => {
  if (!attribute.namespaceURI) {
    return `@${attribute.name}`
  }

  return `@*[local-name()=${toXPathLiteral(attribute.localName)} and namespace-uri()=${toXPathLiteral(attribute.namespaceURI)}]`
}

const getElementXPath = (element, parentPath) => {
  const siblings = Array.from(element.parentNode?.childNodes ?? []).filter(
    (node) =>
      node.nodeType === Node.ELEMENT_NODE &&
      node.localName === element.localName &&
      node.namespaceURI === element.namespaceURI,
  )

  const index = siblings.indexOf(element) + 1
  const suffix = siblings.length > 1 ? `[${index}]` : ''

  return `${parentPath}/${getXPathName(element)}${suffix}`
}

const convertElement = (element, parentPath = '') => {
  const xpath = getElementXPath(element, parentPath)
  const children = []

  for (const attribute of Array.from(element.attributes)) {
    // xmlns 선언은 namespace 설정 정보이며 일반 데이터 속성과 구분한다.
    const isNamespaceDeclaration = attribute.name === 'xmlns' || attribute.name.startsWith('xmlns:')

    children.push({
      id: `${xpath}/@${attribute.name}`,
      label: `@${attribute.name}`,
      value: attribute.value,
      xpath: isNamespaceDeclaration ? '' : `${xpath}/${getAttributeXPathName(attribute)}`,
      type: isNamespaceDeclaration ? 'namespace' : 'attribute',
      children: [],
    })
  }

  const textNodes = Array.from(element.childNodes).filter(
    (node) => node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE,
  )

  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      children.push(convertElement(node, xpath))
      continue
    }

    if (
      (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) &&
      node.nodeValue.trim() !== ''
    ) {
      const index = textNodes.indexOf(node) + 1
      const textXPath = `${xpath}/text()${textNodes.length > 1 ? `[${index}]` : ''}`

      children.push({
        id: textXPath,
        label: '#text',
        value: node.nodeValue.trim(),
        xpath: textXPath,
        type: 'text',
        children: [],
      })
    }
  }

  return {
    id: xpath,
    label: element.nodeName,
    value: '',
    xpath,
    type: 'element',
    children,
  }
}

export const parseXmlTree = (xmlString) => {
  if (!xmlString || !xmlString.trim()) {
    return {
      valid: false,
      error: 'XML 데이터가 비어 있습니다.',
      root: null,
    }
  }

  const document = new DOMParser().parseFromString(xmlString, 'application/xml')

  const parseError = document.getElementsByTagName('parsererror')[0]

  if (parseError || document.documentElement?.localName === 'parsererror') {
    return {
      valid: false,
      error: 'XML 형식이 올바르지 않습니다.',
      root: null,
    }
  }

  return {
    valid: true,
    error: '',
    root: convertElement(document.documentElement),
  }
}
