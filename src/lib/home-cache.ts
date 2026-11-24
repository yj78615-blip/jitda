import { revalidateTag } from 'next/cache';

export const HOME_TAG = 'home';

// 홈에 보이는 데이터를 바꾼 뒤 호출한다.
export const revalidateHome = () => revalidateTag(HOME_TAG);
