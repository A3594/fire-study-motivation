# 소방시설관리사 동차 루틴

React + Vite + TypeScript 기반 모바일 우선 동기부여 웹앱입니다.

## 실행

```powershell
npm install
npm run dev
```

기본 주소는 `http://127.0.0.1:3227`입니다.

## 저장

서버 없이 브라우저 `localStorage`에 저장합니다. 설정 화면에서 JSON 내보내기/가져오기를 할 수 있습니다.

## 휴대폰 설치용 PWA

이 앱은 PWA로 설정되어 있어 GitHub Pages 같은 HTTPS 주소에 올리면 휴대폰에 앱처럼 설치할 수 있습니다.

### GitHub Pages 배포

저장소 루트에 포함된 `.github/workflows/deploy-fire-study-motivation.yml`이 `tools/fire_study_motivation`을 빌드해서 Pages에 배포합니다.

1. 이 폴더를 GitHub 저장소에 올립니다.
2. GitHub 저장소의 `Settings > Pages`에서 `Source`를 `GitHub Actions`로 설정합니다.
3. `Actions` 탭에서 `Deploy Fire Study Motivation PWA`가 성공했는지 확인합니다.
4. Pages 주소를 휴대폰 브라우저에서 엽니다.

### 휴대폰 설치

- Android Chrome: 주소창 또는 메뉴에서 `앱 설치` / `홈 화면에 추가`
- iPhone Safari: 공유 버튼 > `홈 화면에 추가`

주의: GitHub Pages에 올린 휴대폰 앱은 계획/체크/통계는 정상 작동하지만, PC 로컬 PDF 서버 주소(`127.0.0.1:3217`)는 휴대폰에서 바로 열리지 않습니다. PDF까지 휴대폰에서 보려면 PDF 파일도 GitHub Pages나 별도 HTTPS 주소로 같이 올리는 단계가 필요합니다.
