// cart/serviceImpl/CartQueryServiceImpl.java
package io.github.hayo02.proxyshopping.cart.serviceImpl;

import io.github.hayo02.proxyshopping.cart.dto.CartItemDto;
import io.github.hayo02.proxyshopping.cart.dto.CartResponse;
import io.github.hayo02.proxyshopping.cart.entity.CartItem;
import io.github.hayo02.proxyshopping.cart.repository.CartItemRepository;
import io.github.hayo02.proxyshopping.cart.service.CartQueryService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CartQueryServiceImpl implements CartQueryService {

    private final CartItemRepository repo;

    public CartQueryServiceImpl(CartItemRepository repo) {
        this.repo = repo;
    }

    @Override
    public CartResponse getCart(String proxySid) {
        List<CartItem> items = repo.findByProxySidOrderByCreatedAtDesc(proxySid);

        // DTO에 AI 필드까지 포함해서 매핑
        List<CartItemDto> dtoList = items.stream()
                .map(e -> new CartItemDto(
                        e.getId(),
                        e.getProductName(),
                        e.getPriceKRW(),
                        e.getImageUrl(),
                        e.getAiWeightKg(),   // ← 추가
                        e.getAiVolumeM3()    // ← 추가
                ))
                .toList();

        int total = dtoList.stream()
                .mapToInt(i -> i.getPriceKRW() == null ? 0 : i.getPriceKRW())
                .sum();

        return new CartResponse(dtoList, total);
    }

}
