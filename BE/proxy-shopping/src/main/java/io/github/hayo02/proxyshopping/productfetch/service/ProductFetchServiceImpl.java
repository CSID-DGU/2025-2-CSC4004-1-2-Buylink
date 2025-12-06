// src/main/java/io/github/hayo02/proxyshopping/productfetch/service/ProductFetchServiceImpl.java
package io.github.hayo02.proxyshopping.productfetch.service;

import io.github.hayo02.proxyshopping.productfetch.dto.ProductFetchRequest;
import io.github.hayo02.proxyshopping.productfetch.dto.ProductInfoDto;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class ProductFetchServiceImpl implements ProductFetchService {

    private final WebClient crawlerWebClient;

    public ProductFetchServiceImpl(WebClient crawlerWebClient) {
        this.crawlerWebClient = crawlerWebClient;
    }

    @Override
    public ProductInfoDto fetch(ProductFetchRequest req) {
        if (req == null || req.getUrl() == null || req.getUrl().isBlank()) {
            throw new IllegalArgumentException("url is required");
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> resp = crawlerWebClient.post()
                .uri("/crawl")
                .bodyValue(Map.of("url", req.getUrl()))
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (resp == null || !Boolean.TRUE.equals(resp.get("success"))) {
            String err = resp != null ? String.valueOf(resp.get("error")) : "crawler null response";
            throw new IllegalStateException("크롤링 실패: " + err);
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) resp.get("data");

        ProductInfoDto dto = new ProductInfoDto();
        dto.setProductURL(req.getUrl());
        dto.setProductName((String) data.getOrDefault("productName", null));
        dto.setProductDescription((String) data.getOrDefault("description", null));

        // 1) 가격 (필수값 - null이면 에러)
        Integer priceKRW = asInt(data.get("priceKRW"));
        if (priceKRW == null) {
            throw new IllegalStateException("상품 정보를 찾을 수 없습니다. 상품 상세 페이지 URL을 입력해주세요.");
        }
        dto.setPriceKRW(priceKRW);

        // 2) 배송비 여부
        Boolean hasShippingFee = asBoolean(data.get("hasShippingFee"));
        if (hasShippingFee != null) {
            dto.setHasShippingFee(hasShippingFee);
        } else {
            Boolean shippingIncluded = asBoolean(data.get("shippingIncluded"));
            dto.setHasShippingFee(shippingIncluded == null ? null : !shippingIncluded);
        }

        // 3) 카테고리 조인
        List<String> cats = asStringList(data.get("categories"));
        dto.setCategory(cats != null && !cats.isEmpty() ? String.join(" > ", cats) : null);

        // 4) 이미지 리스트 - 크롤러 순서 그대로 전달
        List<String> images = asStringList(data.get("images"));
        dto.setImageUrls(images);

        // 5) 품절 여부
        dto.setIsSoldOut(asBoolean(data.get("isSoldOut")));

        return dto;
    }

    private Integer asInt(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) {
            return n.intValue();
        }
        try {
            String s = String.valueOf(value).trim();
            if (s.isEmpty()) return null;
            return Integer.parseInt(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Boolean asBoolean(Object value) {
        if (value == null) return null;
        if (value instanceof Boolean b) {
            return b;
        }
        String s = String.valueOf(value).trim().toLowerCase();
        if (s.isEmpty()) return null;

        if ("true".equals(s) || "y".equals(s) || "yes".equals(s) || "1".equals(s)) {
            return true;
        }
        if ("false".equals(s) || "n".equals(s) || "no".equals(s) || "0".equals(s)) {
            return false;
        }
        return null;
    }

    private List<String> asStringList(Object value) {
        if (value == null) return null;

        List<String> result = new ArrayList<>();

        if (value instanceof List<?> list) {
            for (Object o : list) {
                if (o != null) result.add(String.valueOf(o));
            }
            return result;
        }

        if (value.getClass().isArray()) {
            Object[] arr = (Object[]) value;
            for (Object o : arr) {
                if (o != null) result.add(String.valueOf(o));
            }
            return result;
        }

        // 단일 값인 경우
        result.add(String.valueOf(value));
        return result;
    }
}
