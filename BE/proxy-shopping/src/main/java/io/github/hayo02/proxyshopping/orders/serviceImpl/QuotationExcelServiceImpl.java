// src/main/java/io/github/hayo02/proxyshopping/orders/serviceImpl/QuotationExcelServiceImpl.java
package io.github.hayo02.proxyshopping.orders.serviceImpl;

import io.github.hayo02.proxyshopping.orders.entity.Order;
import io.github.hayo02.proxyshopping.orders.entity.OrderItem;
import io.github.hayo02.proxyshopping.orders.service.QuotationExcelService;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

@Service
public class QuotationExcelServiceImpl implements QuotationExcelService {

    @Value("${quotation.output-dir:/new_data/bm/buylink/BE/견적서}")
    private String outputDir;

    private static final NumberFormat NUMBER_FORMAT = NumberFormat.getNumberInstance(Locale.KOREA);

    @Override
    public String generateQuotation(Order order) throws IOException {
        // 출력 디렉토리 생성
        Path outputPath = Paths.get(outputDir);
        if (!Files.exists(outputPath)) {
            Files.createDirectories(outputPath);
        }

        String fileName = order.getOrderNumber() + ".xlsx";
        String filePath = outputPath.resolve(fileName).toString();

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("견적서");

            // 열 너비 설정
            sheet.setColumnWidth(0, 3000);   // No
            sheet.setColumnWidth(1, 12000);  // 상품
            sheet.setColumnWidth(2, 5000);   // 상품 가격
            sheet.setColumnWidth(3, 2500);   // 개수
            sheet.setColumnWidth(4, 6000);   // 해외+국내 배송비
            sheet.setColumnWidth(5, 5000);   // 대행 수수료
            sheet.setColumnWidth(6, 5000);   // 결제 수수료
            sheet.setColumnWidth(7, 5000);   // 추가 포장 비용
            sheet.setColumnWidth(8, 6000);   // 해외 배송 보상 보험료
            sheet.setColumnWidth(9, 5000);   // 총 결제 금액
            sheet.setColumnWidth(10, 4000);  // 비고

            // 스타일 생성
            CellStyle titleStyle = createTitleStyle(workbook);
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dataStyle = createDataStyle(workbook);
            CellStyle currencyStyle = createCurrencyStyle(workbook);
            CellStyle totalStyle = createTotalStyle(workbook);
            CellStyle noticeHeaderStyle = createNoticeHeaderStyle(workbook);
            CellStyle noticeStyle = createNoticeStyle(workbook);

            int rowNum = 0;

            // 제목
            Row titleRow = sheet.createRow(rowNum++);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("Buylink 구매&배송대행 견적서");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 10));

            // 빈 행
            rowNum++;

            // 헤더 행
            Row headerRow = sheet.createRow(rowNum++);
            String[] headers = {"No", "상품", "상품 가격(원)", "개수", "해외+국내 배송비",
                               "대행 수수료(5%)", "결제 수수료(3.4%)", "추가 포장 비용",
                               "해외 배송 보상 보험료", "총 결제 금액", "비고"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // 상품 데이터 행
            List<OrderItem> items = order.getItems();
            long grandTotal = 0;

            for (int i = 0; i < items.size(); i++) {
                OrderItem item = items.get(i);
                Row dataRow = sheet.createRow(rowNum++);

                // 각 상품에 대해 비용 계산 (여러 상품인 경우 균등 분배 또는 첫 상품에 전체 비용 할당)
                boolean isFirstItem = (i == 0);
                long productPrice = item.getPriceKrw() != null ? item.getPriceKrw().longValue() : 0L;
                int quantity = item.getQuantity() != null ? item.getQuantity() : 1;

                // 첫 번째 상품에만 배송비/수수료 표시 (또는 전체 주문에 대해 한번만)
                long shippingFee = isFirstItem ? safeGetLong(order.getTotalShippingFeeKRW()) : 0L;
                long serviceFee = isFirstItem ? safeGetLong(order.getServiceFeeKRW()) : 0L;
                long paymentFee = isFirstItem ? safeGetLong(order.getPaymentFeeKRW()) : 0L;
                long packagingFee = isFirstItem ? safeGetLong(order.getExtraPackagingFeeKRW()) : 0L;
                long insuranceFee = isFirstItem ? safeGetLong(order.getInsuranceFeeKRW()) : 0L;

                long itemTotal = (productPrice * quantity) + shippingFee + serviceFee + paymentFee + packagingFee + insuranceFee;
                grandTotal += itemTotal;

                // No (주문번호)
                Cell noCell = dataRow.createCell(0);
                noCell.setCellValue(i == 0 ? order.getOrderNumber() : String.valueOf(i + 1));
                noCell.setCellStyle(dataStyle);

                // 상품명
                Cell productCell = dataRow.createCell(1);
                productCell.setCellValue(item.getProductName());
                productCell.setCellStyle(dataStyle);

                // 상품 가격
                Cell priceCell = dataRow.createCell(2);
                priceCell.setCellValue(productPrice);
                priceCell.setCellStyle(currencyStyle);

                // 개수
                Cell qtyCell = dataRow.createCell(3);
                qtyCell.setCellValue(quantity);
                qtyCell.setCellStyle(dataStyle);

                // 해외+국내 배송비
                Cell shippingCell = dataRow.createCell(4);
                shippingCell.setCellValue(shippingFee);
                shippingCell.setCellStyle(currencyStyle);

                // 대행 수수료
                Cell serviceFeeCell = dataRow.createCell(5);
                serviceFeeCell.setCellValue(serviceFee);
                serviceFeeCell.setCellStyle(currencyStyle);

                // 결제 수수료
                Cell paymentFeeCell = dataRow.createCell(6);
                paymentFeeCell.setCellValue(paymentFee);
                paymentFeeCell.setCellStyle(currencyStyle);

                // 추가 포장 비용
                Cell packagingCell = dataRow.createCell(7);
                packagingCell.setCellValue(packagingFee);
                packagingCell.setCellStyle(currencyStyle);

                // 해외 배송 보상 보험료
                Cell insuranceCell = dataRow.createCell(8);
                insuranceCell.setCellValue(insuranceFee);
                insuranceCell.setCellStyle(currencyStyle);

                // 총 결제 금액
                Cell totalCell = dataRow.createCell(9);
                totalCell.setCellValue(itemTotal);
                totalCell.setCellStyle(currencyStyle);

                // 비고
                Cell noteCell = dataRow.createCell(10);
                noteCell.setCellValue("-");
                noteCell.setCellStyle(dataStyle);
            }

            // 빈 행
            rowNum++;

            // 최종 결제 금액 행
            Row totalRow = sheet.createRow(rowNum++);
            Cell totalLabelCell = totalRow.createCell(0);
            totalLabelCell.setCellValue("최종 결제 금액");
            totalLabelCell.setCellStyle(totalStyle);
            sheet.addMergedRegion(new CellRangeAddress(rowNum - 1, rowNum - 1, 0, 8));

            Cell grandTotalCell = totalRow.createCell(9);
            grandTotalCell.setCellValue(safeGetLong(order.getGrandTotalKRW()));
            grandTotalCell.setCellStyle(totalStyle);

            // 빈 행 2개
            rowNum += 2;

            // 안내사항
            Row noticeHeaderRow = sheet.createRow(rowNum++);
            Cell noticeHeaderCell = noticeHeaderRow.createCell(0);
            noticeHeaderCell.setCellValue("< 안내사항 >");
            noticeHeaderCell.setCellStyle(noticeHeaderStyle);
            sheet.addMergedRegion(new CellRangeAddress(rowNum - 1, rowNum - 1, 0, 10));

            String[] notices = {
                "배송비는 실무게와 부피 무게 중 더 무거운 쪽으로 계산됩니다.",
                "본 서비스는 대행 상품입니다. 보험 미가입 시 파손 및 분실에 대해 책임을 지기 어렵습니다.",
                "보험과 추가 포장 신청이 필요하실 경우 구매 전 요청 부탁드립니다.",
                "보험 신청 시 파손 정도에 따라 보상이 지급되며, 대행 수수료 및 해외배송비는 미지급 됩니다.",
                "총 상품 가격이 150달러 이하라면 관부가세를 부과하지 않습니다.",
                "150달러 이상일 경우, 직접 납부 / 납부 대행은 따로 요청(3,000원)",
                "상품 문의는 결제 전에만 가능하며, 결제 후 할인된 금액에 대해 환불은 어렵습니다.",
                "배송비는 예상 배송비로 측정됩니다. 추가 비용이 발생하면 네스팅이 납부하나, 덜 나올 경우 따로 환불은 진행하지 않습니다."
            };

            for (String notice : notices) {
                Row noticeRow = sheet.createRow(rowNum++);
                Cell noticeCell = noticeRow.createCell(0);
                noticeCell.setCellValue(notice);
                noticeCell.setCellStyle(noticeStyle);
                sheet.addMergedRegion(new CellRangeAddress(rowNum - 1, rowNum - 1, 0, 10));
            }

            // 파일 저장
            try (FileOutputStream fileOut = new FileOutputStream(filePath)) {
                workbook.write(fileOut);
            }
        }

        return filePath;
    }

    private long safeGetLong(Long value) {
        return value != null ? value : 0L;
    }

    private CellStyle createTitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 16);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 10);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setWrapText(true);
        return style;
    }

    private CellStyle createDataStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createCurrencyStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setAlignment(HorizontalAlignment.RIGHT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        DataFormat format = workbook.createDataFormat();
        style.setDataFormat(format.getFormat("#,##0"));
        return style;
    }

    private CellStyle createTotalStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        DataFormat format = workbook.createDataFormat();
        style.setDataFormat(format.getFormat("#,##0"));
        return style;
    }

    private CellStyle createNoticeHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 10);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle createNoticeStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setFontHeightInPoints((short) 9);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }
}
