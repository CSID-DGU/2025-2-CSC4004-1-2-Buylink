// src/main/java/io/github/hayo02/proxyshopping/orders/controller/CustomsCodeController.java
package io.github.hayo02.proxyshopping.orders.controller;

import io.github.hayo02.proxyshopping.orders.dto.CustomsCodeVerifyRequest;
import io.github.hayo02.proxyshopping.orders.dto.CustomsCodeVerifyResponse;
import io.github.hayo02.proxyshopping.orders.service.CustomsCodeService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class CustomsCodeController {

    private final CustomsCodeService customsCodeService;

    public CustomsCodeController(CustomsCodeService customsCodeService) {
        this.customsCodeService = customsCodeService;
    }

    // 개인통관고유부호 검증 API (POST /api/orders/customs-code/verify)
    @PostMapping("/customs-code/verify")
    public CustomsCodeVerifyResponse verify(
            @RequestBody @Valid CustomsCodeVerifyRequest request
    ) {
        // 지금 구현: 어떤 code가 들어와도 항상 isValid=true, name="홍길동"
        return customsCodeService.verify(request.getCode());
    }
}
