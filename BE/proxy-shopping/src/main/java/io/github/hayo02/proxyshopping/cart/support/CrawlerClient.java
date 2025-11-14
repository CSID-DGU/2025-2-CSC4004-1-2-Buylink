// src/main/java/io/github/hayo02/proxyshopping/cart/support/CrawlerClient.java
// 잘못만듦.. 사용 안함.
package io.github.hayo02.proxyshopping.cart.support;

import io.github.hayo02.proxyshopping.cart.dto.CrawledProduct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Component
public class CrawlerClient {

    private final RestTemplate rt = new RestTemplate();
    private final String crawlEndpoint;

    public CrawlerClient(@Value("${crawler.base-url:http://127.0.0.1:5001}") String baseUrl) {
        this.crawlEndpoint = baseUrl + "/crawl";
    }

    @SuppressWarnings("unchecked")
    public CrawledProduct fetch(String url) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, String> body = Map.of("url", url);
        HttpEntity<Map<String, String>> req = new HttpEntity<>(body, headers);

        ResponseEntity<Map> resp = rt.postForEntity(crawlEndpoint, req, Map.class);
        Map<?,?> root = resp.getBody();
        if (root == null || !Boolean.TRUE.equals(root.get("success"))) {
            throw new RuntimeException("상품 정보를 추출할 수 없습니다. " + String.valueOf(root != null ? root.get("error") : ""));
        }
        Map<String, Object> data = (Map<String, Object>) root.get("data");
        if (data == null) throw new RuntimeException("크롤러 결과가 비어 있음");

        CrawledProduct p = new CrawledProduct();
        p.setProductName((String) data.getOrDefault("productName", null));
        Object priceKRW = data.get("priceKRW");
        if (priceKRW instanceof Number n) p.setPriceKRW(n.intValue());

        // 대표 이미지
        String imageUrl = firstNonBlank(
                (String) data.get("imageUrl"),
                (String) data.get("imageURL"),
                (String) data.get("image")
        );
        if (isBlank(imageUrl)) imageUrl = pickFirstImage(data.get("images"));
        if (isBlank(imageUrl)) imageUrl = pickFirstImage(data.get("imageUrls"));
        if (isBlank(imageUrl)) imageUrl = pickFirstImage(data.get("photos"));
        p.setImageUrl(imageUrl);

        // 보조 필드
        p.setDescription((String) data.getOrDefault("description", null));
        if (data.get("hasShippingFee") instanceof Boolean b) p.setHasShippingFee(b);
        p.setCategory((String) data.getOrDefault("category", null));

        // 전체 이미지 리스트
        List<String> imgs = toStringList(data.get("images"));
        if (imgs == null || imgs.isEmpty()) imgs = toStringList(data.get("imageUrls"));
        p.setImageUrls(imgs);

        return p;
    }

    private static boolean isBlank(String s){ return s==null || s.isBlank(); }
    private static String firstNonBlank(String... xs){ for(String x: xs){ if(!isBlank(x)) return x; } return null; }

    private static String pickFirstImage(Object v) {
        if (v instanceof String s) return s;
        if (v instanceof List<?> list && !list.isEmpty()) {
            Object f = list.get(0);
            if (f instanceof String s) return s;
            if (f instanceof Map<?,?> m) {
                Object u = m.get("url"); if (u != null) return u.toString();
                Object s2 = m.get("src"); if (s2 != null) return s2.toString();
            }
        }
        if (v instanceof Map<?,?> m) {
            Object u = m.get("url"); if (u != null) return u.toString();
            Object s2 = m.get("src"); if (s2 != null) return s2.toString();
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private static List<String> toStringList(Object v) {
        if (v instanceof List<?> list) {
            List<String> out = new ArrayList<>();
            for (Object o : list) out.add(String.valueOf(o));
            return out;
        }
        return null;
    }
}
