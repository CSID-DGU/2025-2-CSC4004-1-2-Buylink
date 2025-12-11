package io.github.hayo02.proxyshopping.orders.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AddressSearchResponse {

    private final int currentPage;
    private final int countPerPage;
    private final int totalCount;
    private final List<AddressSearchResultDto> addresses;
}
