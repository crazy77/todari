export type Profile = {
  id: string; // user id
  nickname: string;
  tableNumber?: string;
  createdAt: number;
  updatedAt: number;
  provider?: 'kakao' | 'guest';
  kakaoId?: string;
};
