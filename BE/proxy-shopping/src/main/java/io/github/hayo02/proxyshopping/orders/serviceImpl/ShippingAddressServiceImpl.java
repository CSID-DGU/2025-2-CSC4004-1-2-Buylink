package io.github.hayo02.proxyshopping.orders.serviceImpl;

import io.github.hayo02.proxyshopping.orders.dto.ShippingAddressRequest;
import io.github.hayo02.proxyshopping.orders.dto.ShippingAddressResponse;
import io.github.hayo02.proxyshopping.orders.entity.ShippingAddress;
import io.github.hayo02.proxyshopping.orders.repository.ShippingAddressRepository;
import io.github.hayo02.proxyshopping.orders.service.ShippingAddressService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ShippingAddressServiceImpl implements ShippingAddressService {

    private final ShippingAddressRepository repository;

    public ShippingAddressServiceImpl(ShippingAddressRepository repository) {
        this.repository = repository;
    }

    @Override
    public ShippingAddressResponse register(String proxySid, ShippingAddressRequest request) {

        // 1) 이 proxySid에 대한 최신 배송지 한 개 찾기
        ShippingAddress address = repository
                .findTopByProxySidOrderByCreatedAtDesc(proxySid)
                .orElseGet(() ->
                        ShippingAddress.builder()
                                .proxySid(proxySid)
                                .build()
                );

        // 2) 필드 덮어쓰기 (새로 만들었든, 기존이든 동일하게 업데이트)
        address = copyFromRequest(address, request);

        // 3) 저장 (새 엔티티면 INSERT, 기존이면 UPDATE)
        ShippingAddress saved = repository.save(address);

        return ShippingAddressResponse.from(saved);
    }

    private ShippingAddress copyFromRequest(ShippingAddress address, ShippingAddressRequest request) {
        // 빌더가 아니라 엔티티 세터를 쓰고 싶지 않아서,
        // 새 인스턴스를 만들어서 id/createdAt은 유지하고 나머지 필드만 교체하는 방식

        return ShippingAddress.builder()
                .id(address.getId())                    // 기존 id 유지 (null이면 새 insert)
                .proxySid(address.getProxySid())        // proxySid 유지
                .receiverName(request.getReceiverName())
                .phone(request.getPhone())
                .postalCode(request.getPostalCode())
                .roadAddress(request.getRoadAddress())
                .detailAddress(request.getDetailAddress())
                .deliveryRequest(request.getDeliveryRequest())
                .createdAt(address.getCreatedAt())      // 기존 createdAt 유지 (null이면 @PrePersist에서 세팅)
                .build();
    }
}
