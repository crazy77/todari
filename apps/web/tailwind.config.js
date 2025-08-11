// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  safelist: [
    // 특정 클래스 직접 지정
    'text-blue-500',
    'text-red-500',
    'grid-cols-3',
    'grid-cols-4',

    // 정규표현식 패턴으로 지정
    {
      pattern: /grid-cols-./, // grid-cols-로 시작하는 모든 클래스
    },
    {
      pattern: /(bg|text)-color-(1|2|3|4|5|6)/, // 여러 패턴 조합
    },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
