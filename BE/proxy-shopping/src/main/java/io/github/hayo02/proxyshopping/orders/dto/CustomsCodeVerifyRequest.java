package io.github.hayo02.proxyshopping.orders.dto;

import jakarta.validation.constraints.NotBlank;

public class CustomsCodeVerifyRequest {

    // 개인통관고유부호 (예: P123412341234)
    @NotBlank(message = "개인통관고유부호는 필수입니다.")
    private String code;

    public CustomsCodeVerifyRequest() {
    }

    public CustomsCodeVerifyRequest(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }
}
