/**
 * 같은 productURL 끼리는 "앞의 1개만 품절 아님, 나머지는 품절" 규칙을 적용한다.
 * T는 최소한 productURL, isSoldOut 필드를 가진 객체면 된다.
 */
export const normalizeSoldOutFlags = <
  T extends { productURL: string; isSoldOut?: boolean }
>(
  list: T[]
): T[] => {
  const byUrl = new Map<string, number[]>();

  list.forEach((p, idx) => {
    const key = p.productURL;
    if (!byUrl.has(key)) byUrl.set(key, []);
    byUrl.get(key)!.push(idx);
  });

  const next = [...list];

  for (const [, indices] of byUrl) {
    indices.sort((a, b) => a - b); // 카드 순서 기준

    indices.forEach((idx, i) => {
      const base = next[idx];
      next[idx] = {
        ...base,
        // 원래 품절이었던 건 유지 + 같은 URL에서 두 번째 이후(i>0)는 무조건 품절
        isSoldOut: (base.isSoldOut ?? false) || i > 0,
      };
    });
  }

  return next;
};