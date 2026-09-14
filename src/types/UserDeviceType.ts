export declare namespace UserDeviceType {

    /** 
    * 사용자 디바이스 DTO
    */
    export type UserDvcDto = {

        dvcSq?: number,              // 장치 시퀀스
        userSq: number,              // 사용자 시퀀스
        dvcUuid: string,             // 디바이스 UUID
        dvcTkn: string,              // 디바이스 FCM ID
        dvcNm: string,               // 디바이스 아이디
        dvcTypeNm?: string,          // 디바이스 유형 이름
        osNm?: string,               // 운영체제 이름
        osVer?: string,              // 운영체제 버전
        dvcRegDttm?: string,          // 장치 등록 일시
        clientVer: string,              // 디바이스 앱 버전
        delYn?: boolean,               // 삭제 여부
    }

    /**
     * 사용자 조회에 사용되는 DTO
     */
    export type ExsistUserDeviceInfo = {
        userSq: number,              // 사용자 시퀀스
        dvcUuid: string,             // 디바이스 UUID
    }

    /**
     * 사용자 디바이스 변경에 사용되는 DTO
     */
    export type UpdateUserDeviceInfo = {
        dvcUuid: string,                // 디바이스 UUID
        dvcTkn?: string,                // 디바이스 FCM ID
        userSq?: number                 // 사용자 시퀀스 
        clientVer?: string,             // 디바이스 앱 버전
        delYn?: boolean                  // 디바이스 삭제여부
    }

    /**
     * Reudx에 저장하는 사용자 디바이스 DTO
     */
    export type ReduxUserDeviceInfo = {
        dvcUuid: string,             // 디바이스 UUID
        dvcTkn: string,              // 디바이스 FCM ID
        dvcNm: string,               // 디바이스 아이디
        dvcTypeNm?: string,          // 디바이스 유형 이름
        osNm?: string,               // 운영체제 이름
        osVer?: string,              // 운영체제 버전
        appVer?: string             // 앱 버전
    }

}