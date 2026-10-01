export const moveToField = (field) => {
  // 1. 이동할 필드가 없으면 종료한다.
  if (!field) {
    return
  }

  // 2. 해당 입력 필드가 화면 중앙에 보이도록 이동한다.
  field.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })

  // 3. 입력 필드에 포커스를 설정한다.
  field.focus()
}

export const setFieldError = (errors, fieldName, message, field) => {
  // 1. 해당 필드의 검증 오류 메시지를 설정한다.
  errors.value[fieldName] = message

  // 2. 오류가 발생한 입력 필드로 이동한다.
  moveToField(field)

  // 3. validateForm에서 바로 반환할 수 있도록 false를 반환한다.
  return false
}
