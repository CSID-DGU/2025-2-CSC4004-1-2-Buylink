# Buylink - 일본 구매대행 서비스

동국대학교 2025-2 CSC4004 오픈소스소프트웨어실습 팀 프로젝트

## 프로젝트 소개

Buylink는 일본 Mercari 상품을 한국 사용자가 쉽게 구매할 수 있도록 돕는 구매대행 플랫폼입니다.
AI 기반 무게/부피 예측을 통해 정확한 배송비를 산출하고, 토스페이먼츠 결제 연동으로 간편한 결제 경험을 제공합니다.

## 주요 기능

- **상품 검색 및 조회**: Mercari 상품 크롤링
- **AI 무게/부피 예측**: GPT-4o 기반 상품 무게 및 부피 자동 예측
- **실시간 배송비 계산**: EMS 요금표 기반 정확한 국제 배송비 산출
- **장바구니 및 견적**: 복수 상품 장바구니 담기 및 통합 견적 제공
- **토스페이먼츠 결제**: 카드/간편결제 지원
- **주문 관리**: 주문 생성, 조회 및 견적서 Excel 자동 생성
- **배송지 관리**: 다음 우편번호 API 연동 주소 검색

## 기술 스택

### Frontend
- React 18 + TypeScript
- Vite
- TailwindCSS
- Framer Motion
- Vercel 배포

### Backend
- Java 17 + Spring Boot 3.5
- Spring Data JPA
- MariaDB
- Apache POI (Excel 생성)
- WebFlux (외부 API 호출)

### AI Server
- Python 3.x + Flask
- OpenAI GPT-4o API
- 카테고리별 통계 데이터 활용

## 프로젝트 구조

```
├── FE/                     # 프론트엔드 (React)
│   └── buylink/
│       ├── src/
│       │은 | Frontend |
| 최하영 | Backend |
| 강병민 | AI/ML |
| 남윤수 | 기획 |

## 개발 저장소 안내

본 프로젝트의 실제 개발 및 커밋 히스토리는 아래 개인 GitHub 저장소에서 추가로 관리되었습니다.

- 개인 레포지토리: https://github.com/2025-2-OSS-Team2/proxy-shopping

사유:
- 학교 GitHub 조직 레포지토리는 Vercel 연동 권한 문제로 인해 배포 설정이 어려웠음
- Vercel을 이용한 배포 및 테스트를 위해 개인 레포지토리에서 개발을 진행함
- 최종 결과물 코드는 평가를 위해 본 저장소에 동기화하여 업로드함

## 라이선스

MIT License
