package io.github.hayo02.proxyshopping.productfetch.service;

import com.fasterxml.jackson.databind.ObjectMapper;
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

        Map<String, Object> data = (Map<String, Object>) resp.get("data");

        ProductInfoDto dto = new ProductInfoDto();
        dto.setProductURL(req.getUrl());
        dto.setProductName((String) data.getOrDefault("productName", null));
        dto.setProductDescription((String) data.getOrDefault("description", null));

        // 1) priceKRW 그대로 사용
        dto.setPriceKRW(asInt(data.get("priceKRW")));

        // 2) 배송비 처리
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

        // 4) 이미지 리스트
        dto.setImageUrls(asStringList(data.get("images")));

        // 5) 품절 여부 추가 (새로 추가된 부분)
        dto.setIsSoldOut(asBoolean(data.get("isSoldOut")));

        return dto;
    }

    private Integer asInt(Object o) {
        if (o == null) return null;
        if (o instanceof Integer i) return i;
        if (o instanceof Number n) return (int) Math.round(n.doubleValue());
        if (o instanceof String s && !s.isBlank()) {
            try { return (int) Math.round(Double.parseDouble(s.trim())); } catch (Exception ignored) {}
        }
        return null;
    }

    private Boolean asBoolean(Object o) {
        if (o instanceof Boolean b) return b;
        if (o instanceof String s) {
            String t = s.trim().toLowerCase();
            if ("true".equals(t)) return true;
            if ("false".equals(t)) return false;
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private List<String> asStringList(Object o) {
        if (o instanceof List<?> list) {
            List<String> out = new ArrayList<>();
            for (Object each : list) if (each != null) out.add(String.valueOf(each));
            return out;
        }
        return null;
    }
}
