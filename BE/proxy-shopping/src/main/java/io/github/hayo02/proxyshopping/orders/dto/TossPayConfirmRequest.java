// src/main/java/io/github/hayo02/proxyshopping/orders/dto/TossPayConfirmRequest.java
package io.github.hayo02.proxyshopping.orders.dto;

public class TossPayConfirmRequest {

    private String paymentKey;
    private String orderId;
    private Long amount;

    public String getPaymentKey() {
        return paymentKey;
    }
    public void setPaymentKey(String paymentKey) {
        this.paymentKey = paymentKey;
    }

    public String getOrderId() {
        return orderId;
    }
    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public Long getAmount() {
        return amount;
    }
    public void setAmount(Long amount) {
        this.amount = amount;
    }
}
