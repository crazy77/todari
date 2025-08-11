export function KakaoLoginButton(): JSX.Element {
  return (
    <button
      onClick={() => {
        location.href = '/api/auth/kakao/login';
      }}
      style={{ position: 'fixed', top: 8, left: 8 }}
    >
      카카오로 로그인
    </button>
  );
}
