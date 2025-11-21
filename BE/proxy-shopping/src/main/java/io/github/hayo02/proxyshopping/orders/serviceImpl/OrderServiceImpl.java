// src/main/java/io/github/hayo02/proxyshopping/orders/serviceImpl/OrderServiceImpl.java
package io.github.hayo02.proxyshopping.orders.serviceImpl;

import io.github.hayo02.proxyshopping.cart.entity.CartItem;
import io.github.hayo02.proxyshopping.cart.repository.CartItemRepository;
import io.github.hayo02.proxyshopping.orders.dto.OrderCreateRequest;
import io.github.hayo02.proxyshopping.orders.dto.OrderCreateResponse;
import io.github.hayo02.proxyshopping.orders.entity.Order;
import io.github.hayo02.proxyshopping.orders.entity.OrderItem;
import io.github.hayo02.proxyshopping.orders.entity.OrderStatus;
import io.github.hayo02.proxyshopping.orders.entity.ShippingAddress;
import io.github.hayo02.proxyshopping.orders.repository.OrderRepository;
import io.github.hayo02.proxyshopping.orders.repository.ShippingAddressRepository;
import io.github.hayo02.proxyshopping.orders.service.OrderService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;  // ← 이거 추가

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Random;

@Service
@Transactional
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final ShippingAddressRepository shippingAddressRepository;
    private final CartItemRepository cartItemRepository;

    public OrderServiceImpl(OrderRepository orderRepository,
                            ShippingAddressRepository shippingAddressRepository,
                            CartItemRepository cartItemRepository) {
        this.orderRepository = orderRepository;
        this.shippingAddressRepository = shippingAddressRepository;
        this.cartItemRepository = cartItemRepository;
    }

    @Override
    public OrderCreateResponse createOrder(String proxySid, OrderCreateRequest request) {

        // 1) 배송지 검증 (addressId + proxySid)
        ShippingAddress address = shippingAddressRepository
                .findByIdAndProxySid(request.getAddressId(), proxySid)
                .orElseThrow(() -> new IllegalArgumentException("배송지를 찾을 수 없습니다."));

        // 2) 장바구니 조회
        //    정렬이 필요하면 findByProxySidOrderByCreatedAtDesc 사용,
        //    단순히 다 가져오면 findByProxySid 사용
        List<CartItem> cartItems = cartItemRepository.findByProxySidOrderByCreatedAtDesc(proxySid);
        if (cartItems.isEmpty()) {
            throw new IllegalStateException("장바구니가 비어 있습니다.");
        }

        // 3) 총 금액 결정 (요청값 우선, 없으면 장바구니 합계)
        Long totalAmount = request.getTotalAmount();
        if (totalAmount == null || totalAmount <= 0) {
            totalAmount = cartItems.stream()
                    .mapToLong(ci -> ci.getPriceKRW() == null ? 0L : ci.getPriceKRW())
                    .sum();
        }

        // 4) 주문번호 생성
        String orderNumber = generateOrderNumber();

        // 5) Order 엔티티 생성
        Order order = Order.builder()
                .orderNumber(orderNumber)
                .proxySid(proxySid)
                .totalAmount(totalAmount)
                .status(OrderStatus.PENDING)
                .customsCode(request.getCustomsCode())
                .receiverName(address.getReceiverName())
                .phone(address.getPhone())
                .postalCode(address.getPostalCode())
                .roadAddress(address.getRoadAddress())
                .detailAddress(address.getDetailAddress())
                .deliveryRequest(address.getDeliveryRequest())
                .build();

        // 6) 장바구니 → 주문아이템 복사
        for (CartItem ci : cartItems) {
            OrderItem item = OrderItem.builder()
                    .order(order)
                    .productName(ci.getProductName())
                    .priceKrw(ci.getPriceKRW())
                    .quantity(1)  // CartItem에 quantity 없으니 1로 고정
                    .imageUrl(ci.getImageUrl())
                    .build();
            order.addItem(item);
        }

        // 7) 주문 저장
        Order saved = orderRepository.save(order);

        // 8) 장바구니 비우기
        //    이미 조회해온 리스트가 있으니까 deleteAll 사용하면 됨
        cartItemRepository.deleteAll(cartItems);

        // 9) 응답 DTO
        return OrderCreateResponse.from(saved);
    }

    private String generateOrderNumber() {
        String ts = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        int rand = new Random().nextInt(10_000);
        return ts + String.format("%04d", rand);
    }
}
