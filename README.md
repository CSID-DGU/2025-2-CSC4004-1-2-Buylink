<h1>Buylink - AI 해외 구매 대행 서비스</h1>

<p>
  AI 기반 무게/부피 자동 계산으로<br/>
  2차 배송비 결제를 생략하는 간편한 플랫폼
</p>

**Live Demo**: https://dgu-buylink.vercel.app/

---

## 지원 URL

> **중요**: 본 서비스는 **일본 메르카리(Mercari) 상품 페이지 URL만 지원**합니다.
>
> **지원 URL 형식**: `https://jp.mercari.com/item/mXXXXXXXXXX`
>
> 다른 쇼핑몰이나 일반 URL은 지원되지 않습니다.

---

## Tech Stack

### AI
<p>
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=Python&logoColor=white"/>
  <img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=OpenAI&logoColor=white"/>
  <img src="https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=Flask&logoColor=white"/>
</p>

### Frontend
<p>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=TypeScript&logoColor=white"/>
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=React&logoColor=black"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=Vite&logoColor=white"/>
  <img src="https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=TailwindCSS&logoColor=white"/>
</p>

### Backend
<p>
  <img src="https://img.shields.io/badge/Java-007396?style=for-the-badge&logo=OpenJDK&logoColor=white"/>
  <img src="https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=SpringBoot&logoColor=white"/>
  <img src="https://img.shields.io/badge/MariaDB-003545?style=for-the-badge&logo=MariaDB&logoColor=white"/>
</p>

### Crawler
<p>
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=Python&logoColor=white"/>
  <img src="https://img.shields.io/badge/Selenium-43B02A?style=for-the-badge&logo=Selenium&logoColor=white"/>
</p>

### DevOps
<p>
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=Docker&logoColor=white"/>
  <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=GitHubActions&logoColor=white"/>
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=Vercel&logoColor=white"/>
</p>

---

## 주요 기능

- **메르카리 상품 URL 자동 크롤링** - `https://jp.mercari.com/` 상품 페이지 URL만 지원
- **AI 기반 상품 무게/부피 예측** - GPT-4o 활용
- **EMS 국제배송비 자동 계산**
- **토스 결제 연동**
- **Slack 주문 알림 및 견적서 자동 발송**
- **Chrome 확장프로그램을 통한 빠른 상품 등록**

---

## 시스템 아키텍처

### 전체 구조 (Monorepo)

```
proxy-shopping/
├── FE/                    # Frontend (React + TypeScript)
├── BE/                    # Backend (Spring Boot)
├── AI/                    # AI Service (Python + Flask)
├── Crawler/               # Web Crawler (Python + Selenium)
└── .github/workflows/     # CI/CD Pipelines
```

### 서비스 구성

| 서비스 | 기술 스택 | 포트 | 역할 |
|--------|-----------|------|------|
| Frontend | React 19, TypeScript, Vite | Vercel | 사용자 인터페이스 |
| Backend | Spring Boot 3.5, Java 17 | 17788 | API 서버, 비즈니스 로직 |
| AI | Python 3.11, Flask, OpenAI | 7001 | 무게/부피 예측 |
| Crawler | Python 3.11, Selenium, Chrome | 5001 | 메르카리 크롤링 |
| Database | MariaDB | 3306 | 데이터 저장 |

### 서비스 간 통신 흐름

```
[사용자] → [FE (Vercel)] → [BE (Spring Boot)]
                                ↓
                    ┌───────────┼───────────┐
                    ↓           ↓           ↓
              [Crawler]      [AI]      [MariaDB]
              (크롤링)    (예측)      (저장)
                                ↓
                          [Slack API]
                         (알림/파일)
```

---

## 코드 구조

### Backend (Spring Boot) - 계층형 아키텍처

```
BE/src/main/java/io/github/hayo02/proxyshopping/
├── common/                    # 공통 유틸리티
│   └── ApiResponse.java       # 표준 API 응답 형식
├── cart/                      # 장바구니 도메인
│   ├── controller/            # REST Controller
│   ├── service/               # 서비스 인터페이스
│   ├── serviceImpl/           # 서비스 구현체
│   ├── repository/            # JPA Repository
│   ├── entity/                # JPA Entity
│   ├── dto/                   # Data Transfer Objects
│   └── support/               # 헬퍼 클래스
├── orders/                    # 주문 도메인
│   ├── controller/
│   ├── service/
│   ├── serviceImpl/
│   ├── repository/
│   ├── entity/
│   └── dto/
└── exception/                 # 전역 예외 처리
    └── GlobalExceptionHandler.java
```

### Frontend (React) - 기능별 구조

```
FE/buylink/src/
├── pages/                     # 페이지 컴포넌트
│   ├── MainPage.tsx
│   ├── RequestPage.tsx
│   ├── CartPage.tsx
│   ├── CheckoutPage.tsx
│   ├── PaymentsSuccessPage.tsx
│   └── OrderHistoryPage.tsx
├── components/                # 재사용 컴포넌트
├── hooks/                     # Custom Hooks
├── layouts/                   # 레이아웃 컴포넌트
└── assets/                    # 정적 리소스
```

### AI/Crawler - 단일 책임 구조

```
AI/
├── api_server_standalone.py   # Flask API 서버
├── category_stats.json        # 카테고리별 통계 데이터
├── requirements.txt
└── Dockerfile

Crawler/
├── app.py                     # Flask API 진입점
├── mercari_crawler_2.py       # 크롤러 핵심 로직
├── requirements.txt
└── Dockerfile
```

---

## 사용된 오픈소스 라이브러리

### Backend (Java/Spring)

| 라이브러리 | 버전 | 용도 | 라이선스 |
|------------|------|------|----------|
| Spring Boot | 3.5.6 | 웹 프레임워크 | Apache 2.0 |
| Spring WebFlux | - | 비동기 HTTP 클라이언트 | Apache 2.0 |
| Spring Data JPA | - | ORM, 데이터베이스 접근 | Apache 2.0 |
| Lombok | - | 보일러플레이트 코드 감소 | MIT |
| Apache POI | 5.2.5 | Excel 견적서 생성 | Apache 2.0 |
| Jackson | 2.17.1 | JSON 처리 | Apache 2.0 |
| MariaDB Connector | - | 데이터베이스 드라이버 | LGPL 2.1 |

### Frontend (React/TypeScript)

| 라이브러리 | 버전 | 용도 | 라이선스 |
|------------|------|------|----------|
| React | 19.1.1 | UI 프레임워크 | MIT |
| TypeScript | 5.9.3 | 정적 타입 | Apache 2.0 |
| Vite | 7.1.7 | 빌드 도구 | MIT |
| React Router | 7.9.5 | 클라이언트 라우팅 | MIT |
| Recoil | 0.7.7 | 상태 관리 | MIT |
| Axios | 1.13.1 | HTTP 클라이언트 | MIT |
| TailwindCSS | 4.1.16 | CSS 프레임워크 | MIT |
| Motion (Framer) | 12.23.24 | 애니메이션 | MIT |
| Lucide React | 0.553.0 | 아이콘 | ISC |

### AI Service (Python)

| 라이브러리 | 버전 | 용도 | 라이선스 |
|------------|------|------|----------|
| Flask | 3.0+ | 웹 프레임워크 | BSD-3 |
| OpenAI | 1.0+ | GPT-4o API 클라이언트 | MIT |
| Requests | 2.31+ | HTTP 클라이언트 | Apache 2.0 |
| Gunicorn | 21.0+ | WSGI 서버 | MIT |

### Crawler Service (Python)

| 라이브러리 | 버전 | 용도 | 라이선스 |
|------------|------|------|----------|
| Flask | 3.0+ | 웹 프레임워크 | BSD-3 |
| Selenium | 4.15+ | 웹 브라우저 자동화 | Apache 2.0 |
| WebDriver Manager | 4.0+ | ChromeDriver 자동 관리 | Apache 2.0 |
| Gunicorn | 21.0+ | WSGI 서버 | MIT |

---

## CI/CD 및 배포 자동화

### GitHub Actions 워크플로우 구성

```
.github/workflows/
├── be-deploy.yml          # BE 프로덕션 배포 (main → 17788)
├── ai-deploy.yml          # AI 프로덕션 배포 (main → 7001)
├── crawler-deploy.yml     # Crawler 프로덕션 배포 (main → 5001)
├── be-deploy-test.yml     # BE 테스트 배포 (develop → 17789)
├── ai-deploy-test.yml     # AI 테스트 배포 (develop → 7002)
└── ci.yml                 # 기본 CI
```

### 배포 파이프라인 (BE 예시)

```
트리거: main 브랜치 push (BE/** 경로)

단계:
1. Checkout 코드
2. JDK 17 설정 (Temurin)
3. Gradle 빌드 (bootJar)
4. Docker 이미지 빌드
5. 이미지 압축 (tar.gz)
6. SCP로 서버 전송
7. SSH로 배포 실행
   - 기존 컨테이너 중지/삭제
   - 새 이미지 로드
   - 환경변수 주입
   - 컨테이너 실행
```

### Docker 컨테이너 구성

**BE Dockerfile (Multi-stage Build)**
```dockerfile
# 빌드 스테이지
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY . .
RUN ./gradlew clean bootJar -x test

# 실행 스테이지
FROM eclipse-temurin:17-jre
COPY --from=build /app/build/libs/*.jar app.jar
RUN mkdir -p /opt/buylink/quotation
EXPOSE 17788
ENTRYPOINT ["java","-jar","/app/app.jar"]
```

---

## Slack 연동

### 구현 방식

- **Spring WebFlux WebClient**를 활용하여 비동기 방식으로 Slack API와 통신
- **결제 완료 시** 주문 정보와 Excel 견적서 파일을 Slack 채널에 자동 전송
- **서버 에러 발생 시** GlobalExceptionHandler에서 즉시 Slack 알림 전송

### 사용 API

| API | 용도 |
|-----|------|
| `chat.postMessage` | 메시지 전송 |
| `files.getUploadURLExternal` | 파일 업로드 URL 획득 |
| `files.completeUploadExternal` | 파일 업로드 완료 |

### 알림 예시

**결제 완료 알림**
```
:tada: *결제 완료 알림*

*주문 정보*
주문번호: ORD-20231217-001
주문자: 홍길동
연락처: ****1234
결제금액: 150,000원

*주문 상품*
1. Nintendo Switch - 50,000원

*비용 내역*
상품금액: 80,000원
배송비: 45,000원
총 결제금액: 150,000원
```

---

## Chrome 확장프로그램

### 목적

메르카리 상품 페이지에서 한 번의 클릭으로 Buylink 서비스에 상품을 등록

> **주의**: `https://jp.mercari.com/` 도메인의 상품 페이지에서만 동작합니다.

### 동작 방식

```
[메르카리 상품 페이지] (https://jp.mercari.com/item/mXXX)
        ↓
[확장프로그램 아이콘 클릭]
        ↓
[현재 URL 추출]
        ↓
[Buylink 사이트로 리다이렉트]
(https://dgu-buylink.vercel.app/request?url=메르카리URL)
        ↓
[자동으로 상품 정보 크롤링 시작]
```

### 주요 특징

- **Manifest V3** 기반 개발
- **최소 권한 원칙**: `activeTab`, `tabs` 권한만 사용
- **개인정보 보호**: 사용자 데이터 저장 없음

---

## 보안

### 환경변수 관리

- **민감 정보 분리**: API 키, 시크릿 키는 코드에 포함하지 않음
- **GitHub Secrets 활용**: CI/CD 파이프라인에서 안전하게 주입
- **환경별 설정 분리**: `application-prod.yml`, `application-dev.yml`

### 보안 조치

| 항목 | 적용 방식 |
|------|-----------|
| API 키 보호 | 환경변수로 외부 주입 |
| 개인정보 마스킹 | 전화번호 뒷 4자리만 표시 |
| CORS 설정 | 허용된 도메인만 접근 |
| HTTPS | Vercel 자동 SSL, 서버 SSL |

---

## 테스트 환경

| 환경 | 브랜치 | BE 포트 | AI 포트 |
|------|--------|---------|---------|
| Production | main | 17788 | 7001 |
| Test | develop | 17789 | 7002 |

### 헬스체크 엔드포인트

```
GET /health → {"status": "healthy"}
GET /api/health → {"status": "ok"}
```

---

## 사용 방법

1. https://dgu-buylink.vercel.app/ 접속
2. **메르카리 상품 URL 입력** (`https://jp.mercari.com/item/mXXXXXXXXXX` 형식만 지원)
3. 상품 정보 자동 크롤링 확인
4. 장바구니에 추가
5. 결제 진행

---

## 팀원

| 이름 | 역할 |
|------|------|
| [zienyyyy](https://github.com/zienyyyy) | Frontend |
| [choconaena](https://github.com/choconaena) | Backend, DevOps |
| [hayo02](https://github.com/hayo02) | Backend, AI |

---

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.
