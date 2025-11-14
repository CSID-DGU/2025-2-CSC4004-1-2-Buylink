// src/main/java/io/github/hayo02/proxyshopping/orders/dto/TossPayConfirmResponse.java
package io.github.hayo02.proxyshopping.orders.dto;

public class TossPayConfirmResponse {

    private String paymentKey;
    private String orderId;
    private String status;      // 예: "DONE"
    private Long totalAmount;   // 최종 결제 금액
    private String approvedAt;  // ISO-8601 문자열

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

    public String getStatus() {
        return status;
    }
    public void setStatus(String status) {
        this.status = status;
    }

    public Long getTotalAmount() {
        return totalAmount;
    }
    public void setTotalAmount(Long totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getApprovedAt() {
        return approvedAt;
    }
    public void setApprovedAt(String approvedAt) {
        this.approvedAt = approvedAt;
    }
}
