// src/main/java/io/github/hayo02/proxyshopping/orders/dto/CustomsCodeVerifyResponse.java
package io.github.hayo02.proxyshopping.orders.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CustomsCodeVerifyResponse {

    // JSON key를 isValid로 강제
    @JsonProperty("isValid")
    private boolean valid;

    private String name;

    public CustomsCodeVerifyResponse() {
    }

    public CustomsCodeVerifyResponse(boolean valid) {
        this.valid = valid;
    }

    public CustomsCodeVerifyResponse(boolean valid, String name) {
        this.valid = valid;
        this.name = name;
    }

    public static CustomsCodeVerifyResponse of(boolean valid) {
        return new CustomsCodeVerifyResponse(valid);
    }

    public static CustomsCodeVerifyResponse of(boolean valid, String name) {
        return new CustomsCodeVerifyResponse(valid, name);
    }

    public boolean isValid() {
        return valid;
    }

    public void setValid(boolean valid) {
        this.valid = valid;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
