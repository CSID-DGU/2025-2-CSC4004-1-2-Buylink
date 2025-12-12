package io.github.hayo02.proxyshopping.orders.service;

import io.github.hayo02.proxyshopping.orders.dto.OrderCreateRequest;
import io.github.hayo02.proxyshopping.orders.dto.OrderCreateResponse;
import io.github.hayo02.proxyshopping.orders.dto.OrderDetailResponse;

public interface OrderService {

    OrderCreateResponse createOrder(String proxySid, OrderCreateRequest request);

    // 주문번호 + 이름 + 전화번호로 주문 상세 조회
    OrderDetailResponse getOrderDetail(String orderId, String receiver, String phone);

    /**
     * 결제 완료 처리 및 견적서 생성
     * @param orderNumber 주문번호
     * @return 생성된 견적서 파일 경로
     */
    String completePayment(String orderNumber);
}
