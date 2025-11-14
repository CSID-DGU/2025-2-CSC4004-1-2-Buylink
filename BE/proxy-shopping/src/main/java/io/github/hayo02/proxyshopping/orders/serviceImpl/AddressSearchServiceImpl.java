// src/main/java/io/github/hayo02/proxyshopping/orders/serviceImpl/AddressSearchServiceImpl.java
package io.github.hayo02.proxyshopping.orders.serviceImpl;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.github.hayo02.proxyshopping.orders.dto.AddressSearchResponse;
import io.github.hayo02.proxyshopping.orders.dto.AddressSearchResultDto;
import io.github.hayo02.proxyshopping.orders.service.AddressSearchService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Collections;
import java.util.List;

@Service
public class AddressSearchServiceImpl implements AddressSearchService {

    private final String jusoApiKey;
    private final WebClient webClient;

    public AddressSearchServiceImpl(
            @Value("${juso.api-key}") String jusoApiKey
    ) {
        this.jusoApiKey = jusoApiKey;
        this.webClient = WebClient.create("https://business.juso.go.kr");
    }

    @Override
    public AddressSearchResponse search(String keyword, int page, int size) {
        if (!StringUtils.hasText(keyword)) {
            throw new IllegalArgumentException("keyword 는 필수입니다.");
        }

        // lambda 안에서 쓸 final 변수로 복사
        final int pageParam = (page < 1) ? 1 : page;
        final int sizeParam = (size < 1) ? 10 : size;
        final String keywordParam = keyword.trim();

        JusoApiResponse apiResponse = webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/addrlink/addrLinkApi.do")
                        .queryParam("confmKey", jusoApiKey)
                        .queryParam("currentPage", pageParam)
                        .queryParam("countPerPage", sizeParam)
                        .queryParam("keyword", keywordParam)
                        .queryParam("resultType", "json")
                        .build())
                .retrieve()
                .bodyToMono(JusoApiResponse.class)
                .block();

        if (apiResponse == null || apiResponse.results == null) {
            throw new IllegalStateException("도로명주소 API 응답이 없습니다.");
        }

        JusoResults results = apiResponse.results;

        // 에러 코드 체크 (정상: "0")
        if (results.common != null && !"0".equals(results.common.errorCode)) {
            String msg = (results.common.errorMessage != null && !results.common.errorMessage.isBlank())
                    ? results.common.errorMessage
                    : "도로명주소 API 오류";
            throw new IllegalStateException(msg);
        }

        List<JusoItem> jusoList = (results.juso != null) ? results.juso : Collections.emptyList();

        List<AddressSearchResultDto> mapped = jusoList.stream()
                .map(j -> new AddressSearchResultDto(
                        j.roadAddr,
                        j.jibunAddr,
                        j.zipNo
                ))
                .toList();

        int currentPage = parseIntSafe(results.common != null ? results.common.currentPage : null, pageParam);
        int countPerPage = parseIntSafe(results.common != null ? results.common.countPerPage : null, sizeParam);
        int totalCount = parseIntSafe(results.common != null ? results.common.totalCount : null, mapped.size());

        return AddressSearchResponse.builder()
                .currentPage(currentPage)
                .countPerPage(countPerPage)
                .totalCount(totalCount)
                .addresses(mapped)
                .build();
    }

    private int parseIntSafe(String value, int defaultValue) {
        if (!StringUtils.hasText(value)) return defaultValue;
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    // ====== Juso API 응답 매핑용 내부 클래스들 ======

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class JusoApiResponse {
        public JusoResults results;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class JusoResults {
        public JusoCommon common;
        public List<JusoItem> juso;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class JusoCommon {
        public String errorCode;
        public String errorMessage;
        public String totalCount;
        public String currentPage;
        public String countPerPage;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class JusoItem {
        public String roadAddr;
        public String jibunAddr;
        public String zipNo;
    }
}
