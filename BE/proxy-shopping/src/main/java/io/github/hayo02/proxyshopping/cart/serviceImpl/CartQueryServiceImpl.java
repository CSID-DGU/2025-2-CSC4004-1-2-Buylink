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

        // DTO에 quantity 없음: (id, productName, priceKRW, imageUrl)
        List<CartItemDto> dtoList = items.stream()
                .map(e -> new CartItemDto(
                        e.getId(),
                        e.getProductName(),
                        e.getPriceKRW(),
                        e.getImageUrl()
                ))
                .toList();

        // 합계 = 단가 합 (수량은 항상 1)
        int total = dtoList.stream()
                .mapToInt(i -> i.getPriceKRW() == null ? 0 : i.getPriceKRW())
                .sum();

        return new CartResponse(dtoList, total);
    }
}
