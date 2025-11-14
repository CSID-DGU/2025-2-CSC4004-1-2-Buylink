package io.github.hayo02.proxyshopping.productfetch.controller;

import io.github.hayo02.proxyshopping.common.ApiResponse; // 공통 포맷
import io.github.hayo02.proxyshopping.productfetch.dto.ProductFetchRequest;
import io.github.hayo02.proxyshopping.productfetch.dto.ProductInfoDto;
import io.github.hayo02.proxyshopping.productfetch.service.ProductFetchService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
public class ProductsController {

    private final ProductFetchService productFetchService;

    public ProductsController(ProductFetchService productFetchService) {
        this.productFetchService = productFetchService;
    }

    @PostMapping("/fetch")
    public ApiResponse<ProductInfoDto> fetch(@RequestBody @Valid ProductFetchRequest req) {
        ProductInfoDto dto = productFetchService.fetch(req);
        return ApiResponse.ok(dto);
    }
}
