// 1. 배송지(주소) 유효성 검사

export type AddressFormValues = {
  receiverName: string;
  phone: string;
  roadAddress: string;
  postalCode: string;
  detailAddress: string;
  deliveryRequest: string;
};

export type AddressFormErrors = {
  receiverName?: string;
  phone?: string;
  roadAddress?: string;
  postalCode?: string;
  detailAddress?: string;
  deliveryRequest?: string;
};

  // 전화번호에서 숫자만 남기기 (검증용)
export const normalizePhoneNumber = (value: string) =>
  value.replace(/[^0-9]/g, "");

  // 국내 기준: 숫자 10~11자리면 유효
export const isValidPhoneNumber = (phone: string) => {
  const digits = normalizePhoneNumber(phone);
  return digits.length >= 10 && digits.length <= 11;
};

export function validateAddress(values: AddressFormValues): AddressFormErrors {
  const errors: AddressFormErrors = {};

  // 1) 이름
  if (!values.receiverName.trim()) {
    errors.receiverName = "이름을 입력해 주세요.";
  }

  // 2) 전화번호 (입력은 010-1234-5678 같이 해도 되고, 검증은 숫자 기준)
  if (!values.phone.trim()) {
    errors.phone = "전화번호를 입력해 주세요.";
  } else if (!isValidPhoneNumber(values.phone)) {
    errors.phone = "전화번호 형식을 다시 확인해 주세요.";
  }

  // 3) 도로명 주소
  if (!values.roadAddress.trim()) {
    errors.roadAddress =
      "도로명 주소를 입력하거나 검색 결과에서 선택해 주세요.";
  }

  // 4) 우편번호
  if (!values.postalCode.trim()) {
    errors.postalCode = "주소 검색 후 우편번호를 선택해 주세요.";
  }

  // 5) 상세 주소
  if (!values.detailAddress.trim()) {
    errors.detailAddress = "상세 주소를 입력해 주세요.";
  }

  return errors;
}

// 2. 공통: 에러 존재 여부 체크
export const hasAnyError = (errors: Record<string, string | undefined>) =>
  Object.values(errors).some((msg) => !!msg);

// 3. 개인통관고유번호 유효성 검사 (P + 12자리 숫자)

  // 형식만 true/false로 보고 싶을 때 사용
export const isValidCustomsCode = (rawCode: string): boolean => {
  const code = rawCode.trim();
  // P 또는 p로 시작 + 숫자 12자리 = 총 13자리
  return /^P[0-9]{12}$/i.test(code);
};

  // 폼에서 에러 메시지가 필요할 때 사용
export const validateCustomsCode = (rawCode: string): string | null => {
  const code = rawCode.trim();

  if (!code) {
    return "개인통관고유번호를 입력해 주세요.";
  }

  if (!/^P[0-9]{12}$/i.test(code)) {
    return "P로 시작하는 13자리 개인통관고유번호를 입력해 주세요.";
  }

  return null;
};

// 4. 주문내역 조회 폼 유효성 검사
export type OrderHistoryFormValues = {
  receiverName: string;
  phone: string;
  orderId: string;
};

export type OrderHistoryFormErrors = {
  receiverName?: string;
  phone?: string;
  orderId?: string;
};

  // 주문번호에서 숫자만 남기기
export const normalizeOrderId = (value: string) =>
  value.replace(/[^0-9]/g, "");

  // 숫자 14자리면 유효
export const isValidOrderId = (orderId: string) => {
  const digits = normalizeOrderId(orderId);
  return digits.length === 14;
};

  // 이름 + 전화번호 + 주문번호 한 번에 검증
export function validateOrderHistory(
  values: OrderHistoryFormValues
): OrderHistoryFormErrors {
  const errors: OrderHistoryFormErrors = {};

  const name = values.receiverName.trim();
  const phone = values.phone.trim();
  const orderId = values.orderId.trim();

  // 1) 이름
  if (!name) {
    errors.receiverName = "이름을 입력해 주세요.";
  }

  // 2) 전화번호 (주소 폼과 동일 기준 사용)
  if (!phone) {
    errors.phone = "전화번호를 입력해 주세요.";
  } else if (!isValidPhoneNumber(phone)) {
    errors.phone = "전화번호 형식을 다시 확인해 주세요.";
  }

  // 3) 주문번호 (숫자 14자리)
  if (!orderId) {
    errors.orderId = "주문번호를 입력해 주세요.";
  } else if (!isValidOrderId(orderId)) {
    errors.orderId = "주문번호 14자리 숫자를 입력해 주세요.";
  }

  return errors;
}