package io.github.hayo02.proxyshopping.orders.dto;

public class TossPayConfirmResponse {

    private String paymentKey;
    private String orderId;
    private String status;
    private Long totalAmount;
    private String approvedAt;

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
