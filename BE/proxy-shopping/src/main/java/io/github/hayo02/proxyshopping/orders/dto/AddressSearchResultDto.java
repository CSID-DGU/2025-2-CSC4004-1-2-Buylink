package io.github.hayo02.proxyshopping.orders.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class AddressSearchResultDto {

    private final String roadAddress;

    private final String jibunAddress;

    private final String zipCode;
}
