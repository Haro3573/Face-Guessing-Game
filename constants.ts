import { Translation, Language } from './types';

export const TRANSLATIONS: Record<Language, Translation> = {
  en: {
    title: "Face Guessing Game",
    subtitle: "Upload portraits, AI describes them, you guess who!",
    startBtn: "Start Game",
    uploadTitle: "Upload Photos",
    uploadDesc: "Select 2-10 clear portrait photos.",
    uploadLimit: "Minimum 2 photos required",
    nameLabel: "Primary Name",
    aliasLabel: "Aliases (comma separated)",
    processingTitle: "Analyzing Faces...",
    processingDesc: "AI is generating descriptions for your photos.",
    gameInputPlaceholder: "Who is this?",
    submitAnswer: "Submit Guess",
    correct: "Correct!",
    incorrect: "Incorrect",
    nextQuestion: "Next Question",
    resultsTitle: "Game Over",
    scoreLabel: "Final Score",
    timeLabel: "Time",
    accuracyLabel: "Accuracy",
    newGame: "New Game",
    replay: "Replay Same Photos",
    analyzing: "Analyzing photo...",
    errorNoFace: "No clear face detected",
    errorGemini: "Analysis failed",
    validation: "Validating images...",
    dropzone: "Click to upload or drag and drop"
  },
  kr: {
    title: "얼굴 맞추기 게임",
    subtitle: "사진을 올리면 AI가 묘사하고, 누군지 맞춰보세요!",
    startBtn: "게임 시작",
    uploadTitle: "사진 업로드",
    uploadDesc: "선명한 인물 사진 2-10장을 선택하세요.",
    uploadLimit: "최소 2장이 필요합니다",
    nameLabel: "이름",
    aliasLabel: "별명 (쉼표로 구분)",
    processingTitle: "얼굴 분석 중...",
    processingDesc: "AI가 사진에 대한 묘사를 생성하고 있습니다.",
    gameInputPlaceholder: "누구일까요?",
    submitAnswer: "정답 제출",
    correct: "정답입니다!",
    incorrect: "틀렸습니다",
    nextQuestion: "다음 문제",
    resultsTitle: "게임 종료",
    scoreLabel: "최종 점수",
    timeLabel: "소요 시간",
    accuracyLabel: "정확도",
    newGame: "새 게임",
    replay: "다시 하기",
    analyzing: "사진 분석 중...",
    errorNoFace: "얼굴을 찾을 수 없습니다",
    errorGemini: "분석 실패",
    validation: "이미지 확인 중...",
    dropzone: "클릭하여 업로드하거나 드래그하세요"
  }
};

export const GEMINI_MODEL = "gemini-3-pro-preview";

export const PROMPTS = {
  en: `Analyze the image and provide a detailed physical description of the person's facial features for a guessing game. 
  Focus ONLY on: Face shape, skin tone/texture, hair color/style, eyes, eyebrows, nose, and mouth. 
  Rules:
  1. Do NOT mention the person's name.
  2. Do NOT mention clothing, background, or accessories (like glasses if possible).
  3. Keep it objective and non-judgmental.
  4. Maximum 60 words.
  5. If no human face is clearly visible or if there are multiple people, return exactly: "INVALID_IMAGE".`,
  
  kr: `이 사진 속 인물의 얼굴 특징을 맞추기 게임용으로 묘사해주세요.
  초점: 얼굴형, 피부, 머리 스타일/색상, 눈, 눈썹, 코, 입.
  규칙:
  1. 이름은 절대 언급하지 마세요.
  2. 옷, 배경, 장신구는 묘사하지 마세요.
  3. 객관적으로 묘사하세요.
  4. 최대 60단어로 작성하세요.
  5. 사람 얼굴이 명확하지 않거나 여러 명일 경우 정확히 "INVALID_IMAGE"라고만 반환하세요.`
};