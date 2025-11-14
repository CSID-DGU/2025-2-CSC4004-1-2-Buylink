package io.github.hayo02.proxyshopping.orders.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AddressSearchResponse {

    private final int currentPage;    // 현재 페이지
    private final int countPerPage;   // 페이지당 건수
    private final int totalCount;     // 전체 검색 결과 수
    private final List<AddressSearchResultDto> addresses;
}
