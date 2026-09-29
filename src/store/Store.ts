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
