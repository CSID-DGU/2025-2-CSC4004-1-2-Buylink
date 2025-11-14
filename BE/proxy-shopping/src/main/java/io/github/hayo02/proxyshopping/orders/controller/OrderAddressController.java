package io.github.hayo02.proxyshopping.orders.controller;

import io.github.hayo02.proxyshopping.common.ApiResponse;
import io.github.hayo02.proxyshopping.orders.dto.ShippingAddressRequest;
import io.github.hayo02.proxyshopping.orders.dto.ShippingAddressResponse;
import io.github.hayo02.proxyshopping.orders.service.ShippingAddressService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class OrderAddressController {

    private final ShippingAddressService shippingAddressService;

    public OrderAddressController(ShippingAddressService shippingAddressService) {
        this.shippingAddressService = shippingAddressService;
    }

    @PostMapping("/address")
    public ApiResponse<ShippingAddressResponse> registerAddress(
            @RequestHeader(value = "PROXY_SID", required = false) String proxySidHeader,
            @CookieValue(value = "proxy_sid", required = false) String proxySidCookie,
            @Valid @RequestBody ShippingAddressRequest request
    ) {
        String proxySid = proxySidHeader != null && !proxySidHeader.isBlank()
                ? proxySidHeader
                : proxySidCookie;

        if (proxySid == null || proxySid.isBlank()) {
            // 전역 예외 핸들러에서 BadRequest로 처리하도록 던져도 됨
            throw new IllegalArgumentException("proxy_sid 가 필요합니다.");
        }

        ShippingAddressResponse response = shippingAddressService.register(proxySid, request);
        return ApiResponse.ok(response);
    }
}
