# NetScope

전문가용 모바일 네트워크 품질 진단 앱입니다. HTTP 왕복 요청을 이용해 iOS의 권한 제한 안에서 지연시간, 지터, 요청 손실률과 첫 응답시간을 측정하고 결과를 로컬에 보관합니다.

## 실행

```bash
npm install
npx expo start
```

아이폰에 Expo Go를 설치하고 같은 네트워크에서 QR 코드를 스캔하면 바로 확인할 수 있습니다.

## 진단 서버 연결

`.env.example`을 `.env`로 복사한 뒤 `EXPO_PUBLIC_DIAGNOSTIC_URL`에 HTTPS 상태 확인 엔드포인트를 지정하세요. 서버는 `GET` 요청에 빠르게 `200` 또는 `204`를 반환해야 합니다.

## iOS 빌드

1. `app.json`의 `bundleIdentifier`를 본인 식별자로 변경합니다.
2. `npx eas login`
3. `npx eas build:configure`
4. `npx eas build --platform ios --profile preview`
5. App Store용은 `npx eas build --platform ios --profile production`

Apple Developer 계정과 App Store Connect 등록은 계정 소유자가 직접 완료해야 합니다.
