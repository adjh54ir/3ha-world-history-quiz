import { configureStore } from '@reduxjs/toolkit';
import RootReducer, { RootState } from './RootReducer';
import { persistStore, persistReducer, PersistConfig } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

const persistConfig: PersistConfig<RootState> = {
    key: 'root', // 이 key는 저장되는 값에 대한 식별자로 반드시 입력해주세요.
    // persist store의 storage로 AsyncStorage를 이용하겠습니다.
    // redux-persist에 내장되어 있는 localstorage 또는 sessionStorage를 import해 사용 할 수도 있습니다.
    // 반드시 storage를 입력해 주어야 합니다.
    storage: AsyncStorage,
    blacklist: [], // 선택적으로 저장하지 않을 리듀서를 지정할 수 있습니다.
    /**
     * 저장 주기(ms). 기본값 0 은 상태가 바뀔 때마다 곧바로 통째로 직렬화해 AsyncStorage 에 쓴다.
     * 학습 목록(최대 5천 단어)·기록이 함께 들어 있어 한 번 쓰는 양이 수십 KB 라,
     * 퀴즈 한 판에서만 수십 번 쓰면 저사양 안드로이드에서 눈에 띄게 버벅인다.
     * 1초로 묶어 쓴다 — 앱이 갑자기 죽으면 최대 1초치의 진행 기록이 누락될 수 있다.
     */
    throttle: 1000,
};

const persistedReducer = persistReducer(persistConfig, RootReducer);

/**
 * 애플리케이션의 '상태'를 관리하기 위한 Stroe 구성
 */
export const Store = configureStore({
    // combined된 여러개의 리듀서를 store에 저장합니다.
    reducer: persistedReducer,

    // 미들 웨어로 logger를 사용합니다.
    // middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(logger),
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ serializableCheck: false }),
});

export const persistor = persistStore(Store);

export type AppDispatch = typeof Store.dispatch;
