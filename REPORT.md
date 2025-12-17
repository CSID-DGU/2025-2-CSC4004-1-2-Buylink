# Buylink 프로젝트 기술 보고서

## 1. 프로젝트 개요

**Buylink**는 일본 메르카리(Mercari) 상품을 한국에서 구매대행할 수 있는 서비스입니다. 사용자가 메르카리 상품 URL을 입력하면 자동으로 상품 정보를 크롤링하고, AI를 통해 무게/부피를 예측하여 배송비를 계산한 후, 토스 결제를 통해 주문을 완료할 수 있습니다.

### 주요 기능
- 메르카리 상품 URL 자동 크롤링
- AI 기반 상품 무게/부피 예측 (GPT-4o 활용)
- EMS 국제배송비 자동 계산
- 토스 결제 연동
- Slack 주문 알림 및 견적서 자동 발송
- Chrome 확장프로그램을 통한 빠른 상품 등록

---

## 2. 시스템 아키텍처

### 2.1 전체 구조 (Monorepo)

```
proxy-shopping/
├── FE/                    # Frontend (React + TypeScript)
├── BE/                    # Backend (Spring Boot)
├── AI/                    # AI Service (Python + Flask)
├── Crawler/               # Web Crawler (Python + Selenium)
└── .github/workflows/     # CI/CD Pipelines
```

### 2.2 서비스 구성

| 서비스 | 기술 스택 | 포트 | 역할 |
|--------|-----------|------|------|
| Frontend | React 19, TypeScript, Vite | Vercel | 사용자 인터페이스 |
| Backend | Spring Boot 3.5, Java 17 | 17788 | API 서버, 비즈니스 로직 |
| AI | Python 3.11, Flask, OpenAI | 7001 | 무게/부피 예측 |
| Crawler | Python 3.11, Selenium, Chrome | 5001 | 메르카리 크롤링 |
| Database | MariaDB | 3306 | 데이터 저장 |

### 2.3 서비스 간 통신 흐름

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

## 3. 코드 구조화 및 모듈화

### 3.1 Backend (Spring Boot) - 계층형 아키텍처

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

**설계 원칙:**
- **인터페이스-구현체 분리**: 서비스 계층을 interface와 impl로 분리하여 의존성 역전
- **도메인 기반 패키지 구조**: cart, orders 등 도메인별로 패키지 구성
- **DTO 패턴**: Entity와 API 응답을 분리하여 캡슐화

### 3.2 Frontend (React) - 기능별 구조

```
FE/buylink/src/
├── pages/                     # 페이지 컴포넌트
│   ├── MainPage.tsx
│   ├── RequestPage.tsx
│   ├── CartPage.tsx
│   ├── CheckoutPage.tsx
│   ├── PaymentsSuccessPage.tsx
│   ├── OrderHistoryPage.tsx
│   └── StatusPage.tsx         # 모니터링 대시보드
├── components/                # 재사용 컴포넌트
├── hooks/                     # Custom Hooks
│   └── checkout/
│       └── useCheckoutPayment.ts
├── layouts/                   # 레이아웃 컴포넌트
│   └── MainLayout.tsx
└── assets/                    # 정적 리소스
```

### 3.3 AI/Crawler - 단일 책임 구조

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

## 4. 사용된 오픈소스 라이브러리

### 4.1 Backend (Java/Spring)

| 라이브러리 | 버전 | 용도 | 라이선스 |
|------------|------|------|----------|
| Spring Boot | 3.5.6 | 웹 프레임워크 | Apache 2.0 |
| Spring WebFlux | - | 비동기 HTTP 클라이언트 (Slack API) | Apache 2.0 |
| Spring Data JPA | - | ORM, 데이터베이스 접근 | Apache 2.0 |
| Lombok | - | 보일러플레이트 코드 감소 | MIT |
| Apache POI | 5.2.5 | Excel 견적서 생성 | Apache 2.0 |
| Jackson | 2.17.1 | JSON 처리 | Apache 2.0 |
| MariaDB Connector | - | 데이터베이스 드라이버 | LGPL 2.1 |
| H2 Database | - | 개발/테스트용 인메모리 DB | MPL 2.0 |

### 4.2 Frontend (React/TypeScript)

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

### 4.3 AI Service (Python)

| 라이브러리 | 버전 | 용도 | 라이선스 |
|------------|------|------|----------|
| Flask | 3.0+ | 웹 프레임워크 | BSD-3 |
| OpenAI | 1.0+ | GPT-4o API 클라이언트 | MIT |
| Requests | 2.31+ | HTTP 클라이언트 | Apache 2.0 |
| Gunicorn | 21.0+ | WSGI 서버 | MIT |

### 4.4 Crawler Service (Python)

| 라이브러리 | 버전 | 용도 | 라이선스 |
|------------|------|------|----------|
| Flask | 3.0+ | 웹 프레임워크 | BSD-3 |
| Selenium | 4.15+ | 웹 브라우저 자동화 | Apache 2.0 |
| WebDriver Manager | 4.0+ | ChromeDriver 자동 관리 | Apache 2.0 |
| Gunicorn | 21.0+ | WSGI 서버 | MIT |

### 4.5 CI/CD & Infrastructure

| 도구 | 용도 | 라이선스 |
|------|------|----------|
| GitHub Actions | CI/CD 파이프라인 | - |
| Docker | 컨테이너화 | Apache 2.0 |
| appleboy/ssh-action | SSH 배포 | MIT |
| appleboy/scp-action | 파일 전송 | MIT |
| Google Chrome | 헤드리스 브라우저 | Proprietary |

---

## 5. CI/CD 및 배포 자동화

### 5.1 GitHub Actions 워크플로우 구성

```
.github/workflows/
├── be-deploy.yml          # BE 프로덕션 배포 (main → 17788)
├── ai-deploy.yml          # AI 프로덕션 배포 (main → 7001)
├── crawler-deploy.yml     # Crawler 프로덕션 배포 (main → 5001)
├── be-deploy-test.yml     # BE 테스트 배포 (develop → 17789)
├── ai-deploy-test.yml     # AI 테스트 배포 (develop → 7002)
└── ci.yml                 # 기본 CI
```

### 5.2 배포 파이프라인 상세

#### BE 배포 (be-deploy.yml)

```yaml
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
   - 환경변수 주입 (TOSS_SECRET_KEY, SLACK_BOT_TOKEN)
   - 컨테이너 실행 (--network host)
```

#### 환경변수 및 Secrets 관리

| Secret | 용도 |
|--------|------|
| SSH_HOST | 배포 서버 IP |
| SSH_USERNAME | SSH 사용자명 |
| SSH_PRIVATE_KEY | SSH 개인키 |
| TOSS_SECRET_KEY | 토스 결제 시크릿 키 |
| SLACK_BOT_TOKEN | Slack Bot 토큰 |
| OPENAI_API_KEY | OpenAI API 키 |

### 5.3 Docker 컨테이너 구성

#### BE Dockerfile (Multi-stage Build)

```dockerfile
# 빌드 스테이지
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY . .
RUN ./gradlew clean bootJar -x test

# 실행 스테이지
FROM eclipse-temurin:17-jre
COPY --from=build /app/build/libs/*.jar app.jar
RUN mkdir -p /opt/buylink/quotation  # 견적서 저장 디렉토리
EXPOSE 17788
ENTRYPOINT ["java","-jar","/app/app.jar"]
```

#### Crawler Dockerfile (Chrome 포함)

```dockerfile
FROM python:3.11-slim

# Chrome 설치
RUN mkdir -p /etc/apt/keyrings \
    && wget -O /etc/apt/keyrings/google-chrome.asc https://dl.google.com/linux/linux_signing_key.pub \
    && echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/google-chrome.asc] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable

# Python 의존성 설치
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "2", "app:app"]
```

### 5.4 서버 관리 스크립트

```bash
# 서비스 상태 확인
/new_data/bm/buylink/docker-status.sh

# 서비스 시작
/new_data/bm/buylink/docker-start.sh

# 서비스 중지
/new_data/bm/buylink/docker-stop.sh

# 서비스 재시작
/new_data/bm/buylink/docker-restart.sh
```

---

## 6. 추가 기능 상세

### 6.1 Slack 연동

#### 6.1.1 구현 방식

**사용 API:**
- `chat.postMessage`: 메시지 전송
- `files.getUploadURLExternal`: 파일 업로드 URL 획득
- `files.completeUploadExternal`: 파일 업로드 완료

**인증 방식:**
- Bot Token (Bearer Token) 사용
- GitHub Secrets에서 환경변수로 주입

#### 6.1.2 알림 유형

**1. 결제 완료 알림**
```
:tada: *결제 완료 알림*

*주문 정보*
주문번호: ORD-20231217-001
주문자: 홍길동
연락처: ****1234
결제금액: 150,000원
결제일시: 2023-12-17 15:30:00

*배송지*
서울시 강남구 테헤란로 123
우편번호: 06234

*주문 상품*
1. Nintendo Switch - 50,000원
2. 게임 소프트 - 30,000원

*비용 내역*
상품금액: 80,000원
배송비: 45,000원
대행수수료: 20,000원
결제수수료: 5,000원
총 결제금액: 150,000원
```

**2. 서버 에러 알림**
```
:rotating_light: *서버 에러 발생*

*요청 정보*
URI: /api/orders/pay
시간: 2023-12-17 15:30:00

*에러 메시지*
NullPointerException: ...

*스택 트레이스*
at com.example...
```

#### 6.1.3 파일 업로드 (견적서)

```java
// 3단계 업로드 프로세스
1. files.getUploadURLExternal → upload_url, file_id 획득
2. upload_url로 파일 바이너리 POST
3. files.completeUploadExternal로 채널에 공유
```

#### 6.1.4 Slack Bot 설정 방법

1. https://api.slack.com/apps 에서 앱 생성
2. OAuth & Permissions에서 Bot Token Scopes 추가:
   - `chat:write`
   - `files:write`
   - `files:read`
3. 워크스페이스에 앱 설치
4. Bot User OAuth Token 복사 (`xoxb-...`)
5. GitHub Secrets에 `SLACK_BOT_TOKEN`으로 저장

### 6.2 Chrome 확장프로그램

#### 6.2.1 목적
메르카리 상품 페이지에서 한 번의 클릭으로 Buylink 서비스에 상품을 등록할 수 있도록 함.

#### 6.2.2 동작 방식

```
[메르카리 상품 페이지]
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

#### 6.2.3 주요 파일 구성

```
extension/
├── manifest.json          # 확장프로그램 설정
├── background.js          # 백그라운드 스크립트
├── content.js             # 콘텐츠 스크립트
├── popup.html             # 팝업 UI
├── popup.js               # 팝업 로직
└── icons/                 # 아이콘 파일
```

#### 6.2.4 manifest.json 예시

```json
{
  "manifest_version": 3,
  "name": "Buylink - 메르카리 구매대행",
  "version": "1.0.0",
  "description": "메르카리 상품을 Buylink로 빠르게 등록",
  "permissions": ["activeTab", "tabs"],
  "host_permissions": ["https://jp.mercari.com/*"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icons/icon48.png"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

#### 6.2.5 Chrome 웹스토어 등록

1. **개발자 계정 등록**: https://chrome.google.com/webstore/devconsole
2. **개인정보처리방침 작성**: `privacy-policy.html` (필수)
3. **확장프로그램 패키징**: ZIP 파일로 압축
4. **스토어에 업로드**: 스크린샷, 설명 등 메타데이터 입력
5. **심사 대기**: 보통 1-3일 소요

---

## 7. 보안 체계

### 7.1 환경변수 관리

- **민감 정보 분리**: API 키, 시크릿 키는 코드에 포함하지 않음
- **GitHub Secrets 활용**: CI/CD 파이프라인에서 안전하게 주입
- **환경별 설정 분리**: `application-prod.yml`, `application-dev.yml`

### 7.2 보안 조치

| 항목 | 적용 방식 |
|------|-----------|
| API 키 보호 | 환경변수로 외부 주입 |
| 개인정보 마스킹 | 전화번호 뒷 4자리만 표시 |
| CORS 설정 | 허용된 도메인만 접근 |
| HTTPS | Vercel 자동 SSL, 서버 Nginx SSL |

### 7.3 입력 검증

```java
// Spring Validation 활용
@Valid @RequestBody CartAddRequest request

// DTO에 검증 어노테이션
public class CartAddRequest {
    @NotBlank(message = "URL은 필수입니다")
    private String url;
}
```

---

## 8. 테스트 체계

### 8.1 테스트 환경 구성

| 환경 | 브랜치 | BE 포트 | AI 포트 |
|------|--------|---------|---------|
| Production | main | 17788 | 7001 |
| Test | develop | 17789 | 7002 |

### 8.2 테스트 워크플로우

```yaml
# develop 브랜치 push 시 테스트 환경 자동 배포
on:
  push:
    branches: ["develop"]
    paths:
      - "BE/**"
```

### 8.3 헬스체크 엔드포인트

```
GET /health → {"status": "healthy"}
GET /api/health → {"status": "ok"}
```

### 8.4 모니터링 대시보드

`/status` 페이지에서 다음 항목 실시간 확인:
- Backend API 상태
- AI Service 상태
- Database 연결 상태
- 응답 시간 (ms)

---

## 9. 향후 개선 사항

### 9.1 CI/CD 개선
- [ ] 테스트 자동화 추가 (JUnit, Jest)
- [ ] 코드 커버리지 측정
- [ ] 정적 분석 도구 연동 (SonarQube)

### 9.2 보안 강화
- [ ] JWT 기반 인증 추가
- [ ] Rate Limiting 구현
- [ ] SQL Injection 방어 강화

### 9.3 모니터링 강화
- [ ] Prometheus + Grafana 도입
- [ ] 로그 중앙화 (ELK Stack)
- [ ] APM 도구 연동

---

## 10. 결론

Buylink 프로젝트는 **마이크로서비스 아키텍처**를 기반으로 Frontend, Backend, AI, Crawler 서비스를 분리하여 개발되었습니다. **GitHub Actions**를 활용한 완전 자동화된 CI/CD 파이프라인을 구축하여, main 브랜치에 push하면 자동으로 Docker 이미지 빌드 및 서버 배포가 이루어집니다.

**Slack 연동**을 통해 주문 발생 시 실시간 알림과 견적서 파일을 자동으로 전송하여 운영 효율성을 높였으며, **Chrome 확장프로그램**을 통해 사용자가 메르카리 상품을 쉽게 등록할 수 있도록 UX를 개선했습니다.

오픈소스 라이브러리를 적극 활용하여 개발 생산성을 높이면서도, 환경변수 분리와 GitHub Secrets를 통해 보안을 유지하고 있습니다.
