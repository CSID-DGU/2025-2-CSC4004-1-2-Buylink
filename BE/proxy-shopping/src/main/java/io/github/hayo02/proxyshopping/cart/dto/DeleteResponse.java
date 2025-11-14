// src/main/java/io/github/hayo02/proxyshopping/cart/dto/DeleteResponse.java
package io.github.hayo02.proxyshopping.cart.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeleteResponse {
    private String message;         // "삭제 완료"
    private List<Long> deletedIds;  // 실제 삭제된 id 목록
    private int deletedCount;       // 삭제 개수
}
