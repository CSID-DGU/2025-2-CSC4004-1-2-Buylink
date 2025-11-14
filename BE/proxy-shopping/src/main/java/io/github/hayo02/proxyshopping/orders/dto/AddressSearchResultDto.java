package io.github.hayo02.proxyshopping.orders.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AddressSearchResultDto {

    // 도로명 주소
    private final String roadAddress;

    // 지번 주소
    private final String jibunAddress;

    // 우편번호
    private final String zipCode;
}
