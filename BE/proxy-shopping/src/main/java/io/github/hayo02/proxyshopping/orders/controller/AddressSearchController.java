package io.github.hayo02.proxyshopping.orders.controller;

import io.github.hayo02.proxyshopping.common.ApiResponse;
import io.github.hayo02.proxyshopping.orders.dto.AddressSearchResponse;
import io.github.hayo02.proxyshopping.orders.service.AddressSearchService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/address")
public class AddressSearchController {

    private final AddressSearchService addressSearchService;

    public AddressSearchController(AddressSearchService addressSearchService) {
        this.addressSearchService = addressSearchService;
    }

    @GetMapping("/search")
    public ApiResponse<AddressSearchResponse> search(
            @RequestParam("keyword") String keyword,
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "size", defaultValue = "10") int size
    ) {
        AddressSearchResponse response = addressSearchService.search(keyword, page, size);
        return ApiResponse.ok(response);
    }
}
