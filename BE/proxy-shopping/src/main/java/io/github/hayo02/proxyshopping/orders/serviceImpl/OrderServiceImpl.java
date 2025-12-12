// src/main/java/io/github/hayo02/proxyshopping/orders/serviceImpl/OrderServiceImpl.java
package io.github.hayo02.proxyshopping.orders.serviceImpl;

import io.github.hayo02.proxyshopping.cart.entity.CartEstimate;
import io.github.hayo02.proxyshopping.cart.entity.CartItem;
import io.github.hayo02.proxyshopping.cart.repository.CartEstimateRepository;
import io.github.hayo02.proxyshopping.cart.repository.CartItemRepository;
import io.github.hayo02.proxyshopping.orders.dto.OrderCreateRequest;
import io.github.hayo02.proxyshopping.orders.dto.OrderCreateResponse;
import io.github.hayo02.proxyshopping.orders.dto.OrderDetailResponse;
import io.github.hayo02.proxyshopping.orders.entity.Order;
import io.github.hayo02.proxyshopping.orders.entity.OrderItem;
import io.github.hayo02.proxyshopping.orders.entity.OrderStatus;
import io.github.hayo02.proxyshopping.orders.entity.ShippingAddress;
import io.github.hayo02.proxyshopping.orders.repository.OrderRepository;
import io.github.hayo02.proxyshopping.orders.repository.ShippingAddressRepository;
import io.github.hayo02.proxyshopping.orders.service.OrderService;
import io.github.hayo02.proxyshopping.orders.service.QuotationExcelService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@Transactional
public class OrderServiceImpl implements OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderServiceImpl.class);

    private final OrderRepository orderRepository;
    private final ShippingAddressRepository shippingAddressRepository;
    private final CartItemRepository cartItemRepository;
    private final CartEstimateRepository cartEstimateRepository;
    private final QuotationExcelService quotationExcelService;

    public OrderServiceImpl(OrderRepository orderRepository,
                            ShippingAddressRepository shippingAddressRepository,
                            CartItemRepository cartItemRepository,
                            CartEstimateRepository cartEstimateRepository,
                            QuotationExcelService quotationExcelService) {
        this.orderRepository = orderRepository;
        this.shippingAddressRepository = shippingAddressRepository;
        this.cartItemRepository = cartItemRepository;
        this.cartEstimateRepository = cartEstimateRepository;
        this.quotationExcelService = quotationExcelService;
    }

    @Override
    public OrderCreateResponse createOrder(String proxySid, OrderCreateRequest request) {
        // 1) 배송지 검증 (해당 세션의 주소인지 체크)
        ShippingAddress address = shippingAddressRepository
                .findByIdAndProxySid(request.getAddressId(), proxySid)
                .orElseThrow(() -> new IllegalArgumentException("배송지를 찾을 수 없습니다."));

        // 2) 장바구니 조회
        List<CartItem> cartItems = cartItemRepository
                .findByProxySidOrderByCreatedAtDesc(proxySid);
        if (cartItems.isEmpty()) {
            throw new IllegalStateException("장바구니가 비어 있습니다.");
        }

        // 3) 저장된 견적 조회
        CartEstimate estimate = cartEstimateRepository.findByProxySid(proxySid)
                .orElseThrow(() -> new IllegalStateException("견적 정보가 없습니다. 결제 전 견적을 먼저 확인해주세요."));

        // 4) 총 금액 (견적의 grandTotalKRW 사용)
        Long totalAmount = estimate.getGrandTotalKRW();
        if (totalAmount == null || totalAmount <= 0) {
            totalAmount = cartItems.stream()
                    .mapToLong(ci -> ci.getPriceKRW() == null ? 0L : ci.getPriceKRW())
                    .sum();
        }

        // 5) 주문번호 생성
        String orderNumber = generateOrderNumber();

        // 6) Order 엔티티 생성 (배송지 스냅샷 + 저장된 견적 필드 매핑)
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
                // ===== 저장된 견적에서 값 가져오기 (단위: g) =====
                .productTotalKRW(estimate.getProductTotalKRW())
                .serviceFeeKRW(estimate.getServiceFeeKRW())
                .volumetricWeightG(estimate.getVolumetricWeightG())
                .chargeableWeightG(estimate.getChargeableWeightG())
                .emsYen(estimate.getEmsYen())
                .internationalShippingKRW(estimate.getInternationalShippingKRW())
                .domesticShippingKRW(estimate.getDomesticShippingKRW())
                .totalShippingFeeKRW(estimate.getTotalShippingFeeKRW())
                .paymentFeeKRW(estimate.getPaymentFeeKRW())
                .extraPackagingFeeKRW(estimate.getExtraPackagingFeeKRW())
                .insuranceFeeKRW(estimate.getInsuranceFeeKRW())
                .grandTotalKRW(estimate.getGrandTotalKRW())
                // ===== 견적 필드 매핑 끝 =====
                .build();

        // 7) 장바구니 → 주문아이템 복사
        for (CartItem ci : cartItems) {
            OrderItem item = OrderItem.builder()
                    .order(order)
                    .productName(ci.getProductName())
                    .priceKrw(ci.getPriceKRW())
                    .quantity(1) // CartItem 에 quantity 없으니 기본 1
                    .imageUrl(ci.getImageUrl())
                    .build();
            order.addItem(item);
        }

        // 8) 저장
        Order saved = orderRepository.save(order);

        // 9) 장바구니 비우기
        cartItemRepository.deleteAll(cartItems);

        // 10) 견적 삭제 (주문 완료 후 불필요)
        cartEstimateRepository.delete(estimate);

        // 11) 견적서 Excel 생성
        try {
            String filePath = quotationExcelService.generateQuotation(saved);
            log.info("견적서 생성 완료 - 주문번호: {}, 파일: {}", saved.getOrderNumber(), filePath);
        } catch (IOException e) {
            log.error("견적서 생성 실패 - 주문번호: {}, 오류: {}", saved.getOrderNumber(), e.getMessage(), e);
            // 견적서 생성 실패해도 주문은 정상 처리
        }

        // 12) 응답
        return OrderCreateResponse.from(saved);
    }

    // 주문 상세 조회: 주문번호 + 이름 + 전화번호
    @Override
    @Transactional(readOnly = true)
    public OrderDetailResponse getOrderDetail(String orderId, String receiver, String phone) {
        Order order = orderRepository
                .findByOrderNumber(orderId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다."));

        // 이름 검증 (공백만 제거)
        if (receiver != null && !receiver.isBlank()) {
            String inputName = receiver.trim();
            String savedName = order.getReceiverName() == null ? "" : order.getReceiverName().trim();
            if (!savedName.equals(inputName)) {
                throw new IllegalArgumentException("주문자 이름이 일치하지 않습니다.");
            }
        }

        // 전화번호 검증 (숫자만 비교)
        if (phone != null && !phone.isBlank()) {
            String inputPhone = normalizePhone(phone);
            String savedPhone = normalizePhone(order.getPhone());
            if (!savedPhone.equals(inputPhone)) {
                throw new IllegalArgumentException("전화번호가 일치하지 않습니다.");
            }
        }

        return OrderDetailResponse.from(order);
    }

    @Override
    public String completePayment(String orderNumber) {
        // 1) 주문 조회
        Order order = orderRepository
                .findByOrderNumber(orderNumber)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다: " + orderNumber));

        // 2) 결제 완료 처리
        order.markPaid(LocalDateTime.now());
        orderRepository.save(order);

        // 3) 견적서 Excel 생성
        try {
            String filePath = quotationExcelService.generateQuotation(order);
            log.info("견적서 생성 완료: {}", filePath);
            return filePath;
        } catch (IOException e) {
            log.error("견적서 생성 실패: {}", e.getMessage(), e);
            throw new IllegalStateException("견적서 생성에 실패했습니다.", e);
        }
    }

    private String generateOrderNumber() {
        return LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")); // 14자리
    }

    private String normalizePhone(String value) {
        if (value == null) return "";
        // 숫자만 남기고 제거
        return value.replaceAll("[^0-9]", "");
    }
}
