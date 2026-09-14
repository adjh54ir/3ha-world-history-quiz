import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * 초기 변수에 대한 Typescript 정의 
 */
interface UserSliceState {
    userSq: number;
    userUuid: string,
    email: string,
}

/**
 * 관리가 되는 초기 State 값
 */
const initialState: UserSliceState = {
    userSq: 0,      // 사용자 시퀀스
    userUuid: '',   // 사용자 userUuid
    email: '',      // 사용자 이메일
}

/**
 * Slice에서 관리가 될 Store 관리
 */
export const UserSlice = createSlice({
    name: 'userInfo',
    initialState,
    reducers: {
        setUuid(state, action: PayloadAction<string>) {
            state.userUuid = action.payload;
        },
        setEmail(state, action: PayloadAction<string>) {
            state.email = action.payload;
        },
    }
});

export const { setUuid } = UserSlice.actions;
export default UserSlice.reducer;