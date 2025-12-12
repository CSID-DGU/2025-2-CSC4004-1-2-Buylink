// src/main/java/io/github/hayo02/proxyshopping/orders/service/QuotationExcelService.java
package io.github.hayo02.proxyshopping.orders.service;

import io.github.hayo02.proxyshopping.orders.entity.Order;

import java.io.IOException;

public interface QuotationExcelService {
    /**
     * 주문 정보를 기반으로 견적서 Excel 파일을 생성합니다.
     * @param order 주문 정보
     * @return 생성된 파일 경로
     * @throws IOException 파일 생성 실패 시
     */
    String generateQuotation(Order order) throws IOException;
}
