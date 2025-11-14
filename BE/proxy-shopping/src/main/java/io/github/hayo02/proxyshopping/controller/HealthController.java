package io.github.hayo02.proxyshopping.controller;

import org.springframework.web.bind.annotation.*;
import io.github.hayo02.proxyshopping.common.ApiResponse;

@RestController
@RequestMapping("/api")
public class HealthController {
    @GetMapping("/ping")
    public ApiResponse<String> ping(){
        return ApiResponse.ok("pong");
    }
}