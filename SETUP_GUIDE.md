# xPPM-Neo-Seoul: BPMN Editor Setup Guide

## 프로젝트 개요

**xPPM-Neo-Seoul**은 ISO 29481-1 및 ISO 29481-3 (idmXML) 표준을 준수하는 
크로스 플랫폼 IDM 저작 도구입니다.

### 기술 스택
- **Electron**: 크로스 플랫폼 데스크톱 앱 (Windows + Mac)
- **React 18**: UI 프레임워크
- **bpmn-js**: BPMN 2.0 다이어그램 에디터
- **TypeScript**: 타입 안정성
- **Vite**: 빠른 개발 서버 및 빌드

---

## 1단계: 프로젝트 생성

### 터미널에서 실행:

```bash
# 프로젝트 폴더 생성
mkdir xppm-neo-seoul
cd xppm-neo-seoul

# package.json 초기화
npm init -y
```

---

## 2단계: 의존성 설치

```bash
# React 및 핵심 라이브러리
npm install react react-dom

# bpmn-js (BPMN 에디터)
npm install bpmn-js

# Electron
npm install electron --save-dev
npm install electron-builder --save-dev

# Vite (빌드 도구)
npm install vite --save-dev
npm install @vitejs/plugin-react --save-dev

# TypeScript (선택사항이지만 권장)
npm install typescript --save-dev
npm install @types/react @types/react-dom --save-dev

# 추가 유틸리티
npm install uuid
```

**한 줄로 모두 설치:**
```bash
npm install react react-dom bpmn-js uuid && npm install --save-dev electron electron-builder vite @vitejs/plugin-react typescript @types/react @types/react-dom
```

---

## 3단계: 프로젝트 구조

설치 후 다음 파일/폴더 구조를 생성합니다:

```
xppm-neo-seoul/
├── package.json
├── vite.config.js
├── electron/
│   ├── main.js          # Electron 메인 프로세스
│   └── preload.js       # 프리로드 스크립트
├── src/
│   ├── index.html       # HTML 진입점
│   ├── main.jsx         # React 진입점
│   ├── App.jsx          # 메인 앱 컴포넌트
│   ├── styles/
│   │   └── app.css      # 전역 스타일
│   └── components/
│       ├── BPMNEditor/
│       │   ├── BPMNEditor.jsx
│       │   ├── BPMNEditor.css
│       │   └── defaultDiagram.js
│       ├── ERPanel/
│       │   ├── ERPanel.jsx
│       │   └── ERPanel.css
│       ├── WelcomeScreen/
│       │   └── WelcomeScreen.jsx
│       └── StepNavigation/
│           └── StepNavigation.jsx
└── public/
    └── icon.png         # 앱 아이콘
```

---

## 4단계: 파일 생성

아래 파일들을 순서대로 생성하세요. 제가 각 파일의 내용을 제공해드립니다.

---

## 5단계: 개발 서버 실행

```bash
# 개발 모드 (웹 브라우저에서 테스트)
npm run dev

# Electron 앱 실행
npm run electron:dev
```

---

## 6단계: 앱 빌드 (배포용)

```bash
# Windows용 빌드
npm run build:win

# Mac용 빌드
npm run build:mac

# 둘 다 빌드
npm run build:all
```

---

## 다음 단계

이 가이드를 읽으셨다면, 아래 파일들을 순서대로 생성해야 합니다:

1. `package.json` - 프로젝트 설정 및 스크립트
2. `vite.config.js` - Vite 빌드 설정
3. `electron/main.js` - Electron 메인 프로세스
4. `electron/preload.js` - IPC 통신 설정
5. `src/index.html` - HTML 진입점
6. `src/main.jsx` - React 진입점
7. `src/App.jsx` - 메인 앱
8. `src/components/BPMNEditor/BPMNEditor.jsx` - BPMN 에디터 컴포넌트

**제가 이 파일들을 모두 제공해드리겠습니다.**
