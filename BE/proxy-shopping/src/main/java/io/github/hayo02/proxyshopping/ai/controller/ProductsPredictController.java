// ai/controller/ProductsPredictController.java
package io.github.hayo02.proxyshopping.ai.controller;

import io.github.hayo02.proxyshopping.ai.dto.*;
import io.github.hayo02.proxyshopping.ai.service.ProductAiService;
import io.github.hayo02.proxyshopping.common.ApiResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
public class ProductsPredictController {

    private final ProductAiService service;

    public ProductsPredictController(ProductAiService service) {
        this.service = service;
    }

    @PostMapping("/predict")
    public ApiResponse<AiPredictResponse> predict(@RequestBody CrawlerEnvelope body) {
        return ApiResponse.ok(service.predict(body));
    }
}
