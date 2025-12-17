package io.github.hayo02.proxyshopping.orders.serviceImpl;

import io.github.hayo02.proxyshopping.orders.entity.Order;
import io.github.hayo02.proxyshopping.orders.entity.OrderItem;
import io.github.hayo02.proxyshopping.orders.service.SlackNotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class SlackNotificationServiceImpl implements SlackNotificationService {

    private static final Logger log = LoggerFactory.getLogger(SlackNotificationServiceImpl.class);
    private static final NumberFormat CURRENCY_FORMAT = NumberFormat.getNumberInstance(Locale.KOREA);
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final WebClient webClient;

    @Value("${slack.webhook-url:}")
    private String webhookUrl;

    @Value("${slack.bot-token:}")
    private String botToken;

    @Value("${slack.channel:}")
    private String channel;

    @Value("${slack.enabled:true}")
    private boolean enabled;

    public SlackNotificationServiceImpl(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    @Override
    public void sendPaymentCompleteNotification(Order order, String quotationFilePath) {
        if (!enabled) {
            log.info("Slack 알림이 비활성화되어 있습니다.");
            return;
        }

        boolean hasWebhook = webhookUrl != null && !webhookUrl.isBlank() && !webhookUrl.contains("YOUR/WEBHOOK/URL");
        boolean hasBotToken = botToken != null && !botToken.isBlank() && channel != null && !channel.isBlank();

        if (!hasWebhook && !hasBotToken) {
            log.warn("Slack 설정이 없습니다. webhook-url 또는 bot-token + channel을 설정해주세요.");
            return;
        }

        try {
            if (hasBotToken) {
                // Bot Token이 있으면 chat.postMessage API로 메시지 전송 + 파일 업로드
                sendMessageWithBotToken(order, quotationFilePath);
                uploadFileToSlack(quotationFilePath, order.getOrderNumber());
            } else if (hasWebhook) {
                // Webhook만 있으면 메시지만 전송
                sendWebhookMessage(order, quotationFilePath);
            }

            log.info("Slack 알림 전송 완료 - 주문번호: {}", order.getOrderNumber());
        } catch (Exception e) {
            log.error("Slack 알림 전송 실패 - 주문번호: {}, 오류: {}", order.getOrderNumber(), e.getMessage(), e);
        }
    }

    private void sendWebhookMessage(Order order, String quotationFilePath) {
        String message = buildPaymentCompleteMessage(order, quotationFilePath);

        Map<String, Object> payload = new HashMap<>();
        payload.put("text", message);
        payload.put("mrkdwn", true);

        webClient.post()
                .uri(webhookUrl)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(String.class)
                .doOnSuccess(response -> log.debug("Slack Webhook 응답: {}", response))
                .doOnError(error -> log.error("Slack Webhook 전송 실패: {}", error.getMessage()))
                .subscribe();
    }

    private void sendMessageWithBotToken(Order order, String quotationFilePath) {
        String message = buildPaymentCompleteMessage(order, quotationFilePath);

        Map<String, Object> payload = new HashMap<>();
        payload.put("channel", channel);
        payload.put("text", message);
        payload.put("mrkdwn", true);

        webClient.post()
                .uri("https://slack.com/api/chat.postMessage")
                .header("Authorization", "Bearer " + botToken)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(String.class)
                .doOnSuccess(response -> log.debug("Slack API 응답: {}", response))
                .doOnError(error -> log.error("Slack 메시지 전송 실패: {}", error.getMessage()))
                .subscribe();
    }

    private String buildPaymentCompleteMessage(Order order, String quotationFilePath) {
        StringBuilder sb = new StringBuilder();

        sb.append(":tada: *결제 완료 알림*\n\n");

        sb.append("*주문 정보*\n");
        sb.append("```\n");
        sb.append(String.format("주문번호: %s\n", order.getOrderNumber()));
        sb.append(String.format("주문자: %s\n", order.getReceiverName()));
        sb.append(String.format("연락처: %s\n", maskPhone(order.getPhone())));
        sb.append(String.format("결제금액: %s원\n", CURRENCY_FORMAT.format(order.getGrandTotalKRW())));
        if (order.getPaidAt() != null) {
            sb.append(String.format("결제일시: %s\n", order.getPaidAt().format(DATE_FORMAT)));
        }
        sb.append("```\n\n");

        sb.append("*배송지*\n");
        sb.append("```\n");
        sb.append(String.format("%s %s\n", order.getRoadAddress(), order.getDetailAddress()));
        sb.append(String.format("우편번호: %s\n", order.getPostalCode()));
        if (order.getDeliveryRequest() != null && !order.getDeliveryRequest().isBlank()) {
            sb.append(String.format("배송요청: %s\n", order.getDeliveryRequest()));
        }
        sb.append("```\n\n");

        sb.append("*주문 상품*\n");
        List<OrderItem> items = order.getItems();
        if (items != null && !items.isEmpty()) {
            for (int i = 0; i < items.size(); i++) {
                OrderItem item = items.get(i);
                sb.append(String.format("%d. %s - %s원\n",
                        i + 1,
                        item.getProductName(),
                        CURRENCY_FORMAT.format(item.getPriceKrw() != null ? item.getPriceKrw() : 0)));
            }
        }
        sb.append("\n");

        sb.append("*비용 내역*\n");
        sb.append("```\n");
        sb.append(String.format("상품금액: %s원\n", formatCurrency(order.getProductTotalKRW())));
        sb.append(String.format("배송비(해외+국내): %s원\n", formatCurrency(order.getTotalShippingFeeKRW())));
        sb.append(String.format("대행수수료: %s원\n", formatCurrency(order.getServiceFeeKRW())));
        sb.append(String.format("결제수수료: %s원\n", formatCurrency(order.getPaymentFeeKRW())));
        if (order.getExtraPackagingFeeKRW() != null && order.getExtraPackagingFeeKRW() > 0) {
            sb.append(String.format("추가포장비: %s원\n", formatCurrency(order.getExtraPackagingFeeKRW())));
        }
        if (order.getInsuranceFeeKRW() != null && order.getInsuranceFeeKRW() > 0) {
            sb.append(String.format("보험료: %s원\n", formatCurrency(order.getInsuranceFeeKRW())));
        }
        sb.append(String.format("총 결제금액: %s원\n", formatCurrency(order.getGrandTotalKRW())));
        sb.append("```\n\n");

        sb.append(String.format(":page_facing_up: 견적서: `%s`\n", quotationFilePath));

        return sb.toString();
    }

    private void uploadFileToSlack(String filePath, String orderNumber) {
        try {
            Path path = Paths.get(filePath);
            File file = path.toFile();
            String fileName = "견적서_" + orderNumber + ".xlsx";
            long fileSize = file.length();

            // 1단계: 업로드 URL 획득
            String uploadUrlResponse = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https")
                            .host("slack.com")
                            .path("/api/files.getUploadURLExternal")
                            .queryParam("filename", fileName)
                            .queryParam("length", fileSize)
                            .build())
                    .header("Authorization", "Bearer " + botToken)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            log.debug("Slack 업로드 URL 응답: {}", uploadUrlResponse);

            if (uploadUrlResponse == null || !uploadUrlResponse.contains("\"ok\":true")) {
                log.error("Slack 업로드 URL 획득 실패: {}", uploadUrlResponse);
                return;
            }

            // upload_url과 file_id 추출
            String uploadUrl = extractJsonValue(uploadUrlResponse, "upload_url");
            String fileId = extractJsonValue(uploadUrlResponse, "file_id");

            if (uploadUrl == null || fileId == null) {
                log.error("업로드 URL 또는 파일 ID를 추출할 수 없습니다.");
                return;
            }

            // 2단계: 파일 업로드
            byte[] fileBytes = Files.readAllBytes(path);
            String uploadResult = webClient.post()
                    .uri(uploadUrl)
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .bodyValue(fileBytes)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            log.debug("Slack 파일 업로드 결과: {}", uploadResult);

            // 3단계: 파일 공유 완료
            Map<String, Object> completePayload = new HashMap<>();
            completePayload.put("files", List.of(Map.of("id", fileId, "title", fileName)));
            completePayload.put("channel_id", channel.replace("#", ""));
            completePayload.put("initial_comment", "주문번호 " + orderNumber + " 견적서입니다.");

            // channel_id가 채널 이름이면 채널 ID로 변환 필요 - 일단 채널 이름으로 시도
            String completeResponse = webClient.post()
                    .uri("https://slack.com/api/files.completeUploadExternal")
                    .header("Authorization", "Bearer " + botToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(completePayload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            log.info("Slack 파일 공유 완료: {}", completeResponse);

        } catch (Exception e) {
            log.error("Slack 파일 업로드 중 오류: {}", e.getMessage(), e);
        }
    }

    private String extractJsonValue(String json, String key) {
        try {
            String searchKey = "\"" + key + "\":\"";
            int startIndex = json.indexOf(searchKey);
            if (startIndex == -1) return null;
            startIndex += searchKey.length();

            // 이스케이프된 따옴표를 고려하여 끝 위치 찾기
            int endIndex = startIndex;
            while (endIndex < json.length()) {
                char c = json.charAt(endIndex);
                if (c == '"' && (endIndex == 0 || json.charAt(endIndex - 1) != '\\')) {
                    break;
                }
                endIndex++;
            }
            if (endIndex >= json.length()) return null;

            // 이스케이프된 슬래시 처리 (\/ -> /)
            String value = json.substring(startIndex, endIndex);
            return value.replace("\\/", "/");
        } catch (Exception e) {
            return null;
        }
    }

    private String formatCurrency(Long value) {
        return CURRENCY_FORMAT.format(value != null ? value : 0);
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 4) {
            return phone;
        }
        // 마지막 4자리만 보여주고 나머지는 마스킹
        return phone.substring(0, phone.length() - 4).replaceAll(".", "*") + phone.substring(phone.length() - 4);
    }

    @Override
    public void sendErrorNotification(String errorMessage, String stackTrace, String requestUri) {
        if (!enabled) {
            log.info("Slack 알림이 비활성화되어 있습니다.");
            return;
        }

        boolean hasBotToken = botToken != null && !botToken.isBlank() && channel != null && !channel.isBlank();

        if (!hasBotToken) {
            log.warn("Slack Bot Token 설정이 없어 에러 알림을 보낼 수 없습니다.");
            return;
        }

        try {
            String message = buildErrorMessage(errorMessage, stackTrace, requestUri);

            Map<String, Object> payload = new HashMap<>();
            payload.put("channel", channel);
            payload.put("text", message);
            payload.put("mrkdwn", true);

            webClient.post()
                    .uri("https://slack.com/api/chat.postMessage")
                    .header("Authorization", "Bearer " + botToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .doOnSuccess(response -> log.debug("Slack 에러 알림 응답: {}", response))
                    .doOnError(error -> log.error("Slack 에러 알림 전송 실패: {}", error.getMessage()))
                    .subscribe();

            log.info("Slack 에러 알림 전송 완료 - URI: {}", requestUri);
        } catch (Exception e) {
            log.error("Slack 에러 알림 전송 중 오류: {}", e.getMessage(), e);
        }
    }

    private String buildErrorMessage(String errorMessage, String stackTrace, String requestUri) {
        StringBuilder sb = new StringBuilder();

        sb.append(":rotating_light: *서버 에러 발생*\n\n");

        sb.append("*요청 정보*\n");
        sb.append("```\n");
        sb.append(String.format("URI: %s\n", requestUri != null ? requestUri : "N/A"));
        sb.append(String.format("시간: %s\n", java.time.LocalDateTime.now().format(DATE_FORMAT)));
        sb.append("```\n\n");

        sb.append("*에러 메시지*\n");
        sb.append("```\n");
        sb.append(errorMessage != null ? errorMessage : "Unknown error");
        sb.append("\n```\n\n");

        if (stackTrace != null && !stackTrace.isBlank()) {
            // 스택트레이스는 너무 길 수 있으므로 첫 500자만
            String truncatedStack = stackTrace.length() > 500
                    ? stackTrace.substring(0, 500) + "..."
                    : stackTrace;
            sb.append("*스택 트레이스*\n");
            sb.append("```\n");
            sb.append(truncatedStack);
            sb.append("\n```\n");
        }

        return sb.toString();
    }
}
