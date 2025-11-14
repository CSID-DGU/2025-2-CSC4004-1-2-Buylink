// src/main/java/io/github/hayo02/proxyshopping/cart/serviceImpl/CartCommandServiceImpl.java
package io.github.hayo02.proxyshopping.cart.serviceImpl;

import io.github.hayo02.proxyshopping.ai.dto.AiPredictRequest;
import io.github.hayo02.proxyshopping.ai.dto.AiPredictResponse;
import io.github.hayo02.proxyshopping.ai.dto.CrawlerEnvelope;
import io.github.hayo02.proxyshopping.ai.service.ProductAiService;
import io.github.hayo02.proxyshopping.cart.dto.CartAddRequest;
import io.github.hayo02.proxyshopping.cart.dto.CartItemDto;
import io.github.hayo02.proxyshopping.cart.dto.CartResponse;
import io.github.hayo02.proxyshopping.cart.dto.DeleteResponse;
import io.github.hayo02.proxyshopping.cart.entity.CartItem;
import io.github.hayo02.proxyshopping.cart.repository.CartItemRepository;
import io.github.hayo02.proxyshopping.cart.service.CartCommandService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CartCommandServiceImpl implements CartCommandService {

    private final CartItemRepository repo;
    private final ProductAiService aiService;

    public CartCommandServiceImpl(CartItemRepository repo,
                                  ProductAiService aiService) {
        this.repo = repo;
        this.aiService = aiService;
    }

    // 1) 장바구니 담기
    @Override
    @Transactional
    public CartResponse add(String proxySid, CartAddRequest request) {
        String url = request.getUrl();
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("url is required");
        }

        // 품절 방어
        if (Boolean.TRUE.equals(request.getIsSoldOut())) {
            throw new IllegalArgumentException("품절 상품은 장바구니에 담을 수 없습니다.");
        }

        // 동일 URL 중복 방지
        if (repo.existsByProxySidAndUrl(proxySid, url)) {
            return buildResponse(proxySid);
        }

        // AI 요청 준비
        AiPredictRequest aiReq = new AiPredictRequest();
        aiReq.setProductURL(request.getUrl());
        aiReq.setProductName(request.getProductName());
        aiReq.setProductDescription(request.getDescription());
        aiReq.setPriceKRW(request.getPriceKRW());
        aiReq.setHasShippingFee(request.getHasShippingFee());
        aiReq.setCategory(request.getCategory());
        aiReq.setImageUrls(request.getImageUrls());

        CrawlerEnvelope env = new CrawlerEnvelope();
        env.setSuccess(true);
        env.setData(aiReq);
        env.setError(null);

        AiPredictResponse ai = aiService.predict(env);

        // 엔티티 저장
        CartItem e = new CartItem();
        e.setProxySid(proxySid);
        e.setProductName(request.getProductName());
        e.setPriceKRW(request.getPriceKRW());

        String imageUrl = request.getImageUrl();
        if ((imageUrl == null || imageUrl.isBlank())
                && request.getImageUrls() != null
                && !request.getImageUrls().isEmpty()) {
            imageUrl = request.getImageUrls().get(0);
        }

        e.setImageUrl(imageUrl);
        e.setUrl(url);

        if (ai != null) {
            e.setAiWeightKg(ai.getWeight());
            e.setAiVolumeM3(ai.getVolume());
        }

        repo.save(e);
        return buildResponse(proxySid);
    }

    // 2) 선택 삭제 (ids=1,3 또는 ids=4 처럼 단·복수 공용)
    @Override
    @Transactional
    public DeleteResponse deleteMany(String proxySid, List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return DeleteResponse.builder()
                    .message("ids가 비어 있습니다")
                    .deletedIds(List.of())
                    .deletedCount(0)
                    .build();
        }

        List<CartItem> targets = repo.findByProxySidAndIdIn(proxySid, ids);
        if (targets.isEmpty()) {
            return DeleteResponse.builder()
                    .message("삭제 대상이 없습니다")
                    .deletedIds(List.of())
                    .deletedCount(0)
                    .build();
        }

        List<Long> deleted = targets.stream()
                .map(CartItem::getId)
                .toList();

        repo.deleteAllInBatch(targets);

        return DeleteResponse.builder()
                .message("삭제 완료")
                .deletedIds(deleted)
                .deletedCount(deleted.size())
                .build();
    }

    // 3) 전체 삭제 (all=true)
    @Override
    @Transactional
    public DeleteResponse clear(String proxySid) {
        // 1) 해당 SID 장바구니 전부 조회
        List<CartItem> items = repo.findByProxySid(proxySid);

        if (items.isEmpty()) {
            return DeleteResponse.builder()
                    .message("삭제 대상이 없습니다")
                    .deletedIds(List.of())
                    .deletedCount(0)
                    .build();
        }

        // 2) 삭제될 id 목록 추출
        List<Long> deletedIds = items.stream()
                .map(CartItem::getId)
                .toList();

        // 3) 한 번에 삭제
        repo.deleteAllInBatch(items);

        return DeleteResponse.builder()
                .message("전체 삭제 완료")
                .deletedIds(deletedIds)
                .deletedCount(deletedIds.size())
                .build();
    }

    // 공통 응답 빌더
    private CartResponse buildResponse(String proxySid) {
        List<CartItem> items = repo.findByProxySidOrderByCreatedAtDesc(proxySid);
        List<CartItemDto> dtoList = items.stream()
                .map(i -> new CartItemDto(
                        i.getId(),
                        i.getProductName(),
                        i.getPriceKRW(),
                        i.getImageUrl()
                ))
                .toList();

        int total = dtoList.stream()
                .mapToInt(d -> d.getPriceKRW() == null ? 0 : d.getPriceKRW())
                .sum();

        return new CartResponse(dtoList, total);
    }
}
