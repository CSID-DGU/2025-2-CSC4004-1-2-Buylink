package io.github.hayo02.proxyshopping.cart.controller;

import io.github.hayo02.proxyshopping.cart.dto.CartAddRequest;
import io.github.hayo02.proxyshopping.cart.dto.CartEstimateRequest;
import io.github.hayo02.proxyshopping.cart.dto.CartEstimateResponse;
import io.github.hayo02.proxyshopping.cart.dto.CartResponse;
import io.github.hayo02.proxyshopping.cart.dto.DeleteResponse;
import io.github.hayo02.proxyshopping.cart.service.CartCommandService;
import io.github.hayo02.proxyshopping.cart.service.CartEstimateService;
import io.github.hayo02.proxyshopping.cart.service.CartQueryService;
import io.github.hayo02.proxyshopping.cart.support.SidResolver;
import io.github.hayo02.proxyshopping.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cart")
public class CartController {

    private final CartQueryService queryService;
    private final CartCommandService commandService;
    private final CartEstimateService estimateService;
    private final SidResolver sidResolver;

    public CartController(CartQueryService queryService,
                          CartCommandService commandService,
                          CartEstimateService estimateService,
                          SidResolver sidResolver) {
        this.queryService = queryService;
        this.commandService = commandService;
        this.estimateService = estimateService;
        this.sidResolver = sidResolver;
    }

    // 장바구니 조회
    @GetMapping
    public ApiResponse<CartResponse> getCart(HttpServletRequest req,
                                             HttpServletResponse res) {
        String sid = sidResolver.resolve(req, res);
        return ApiResponse.ok(queryService.getCart(sid));
    }

    // 장바구니 담기
    @PostMapping
    public ApiResponse<CartResponse> addToCart(@RequestBody CartAddRequest request,
                                               HttpServletRequest req,
                                               HttpServletResponse res) {
        String sid = sidResolver.resolve(req, res);
        CartResponse data = commandService.add(sid, request);
        return ApiResponse.ok(data);
    }

    // 단건 삭제 (DELETE /api/cart/{id})
    @DeleteMapping("/{id}")
    public ApiResponse<DeleteResponse> deleteOne(@PathVariable Long id,
                                                 HttpServletRequest req,
                                                 HttpServletResponse res) {
        String sid = sidResolver.resolve(req, res);
        return ApiResponse.ok(commandService.deleteMany(sid, List.of(id)));
    }

    // 선택 삭제 또는 전체 삭제 (DELETE /api/cart?ids=1,3&all=false / ?all=true)
    @DeleteMapping
    public ApiResponse<DeleteResponse> deleteManyOrAll(
            @RequestParam(required = false) List<Long> ids,
            @RequestParam(required = false, defaultValue = "false") boolean all,
            HttpServletRequest req,
            HttpServletResponse res
    ) {
        String sid = sidResolver.resolve(req, res);
        if (all) {
            return ApiResponse.ok(commandService.clear(sid));
        }
        return ApiResponse.ok(commandService.deleteMany(sid, ids));
    }

    // 장바구니 견적 계산 (POST /api/cart/estimate)
    @PostMapping("/estimate")
    public ApiResponse<CartEstimateResponse> estimate(
            @RequestBody CartEstimateRequest request,
            HttpServletRequest req,
            HttpServletResponse res
    ) {
        String sid = sidResolver.resolve(req, res);
        CartEstimateResponse estimate = estimateService.estimate(sid, request);
        return ApiResponse.ok(estimate);
    }
}
