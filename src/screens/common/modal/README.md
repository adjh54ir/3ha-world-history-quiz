## 1. 모달 팝업 구성시 주의점

### 1. 모달 팝업내에서 텍스트 입력할때 키보드 가림 증상 해결 방법 : KeyboardAvoidingView 적용 필요

```tsx
  <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={editModalHandler.close}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >

      <View>
        <Text>Content 영역</Text>
      </View>
      </KeyboardAvoidingView>
    </Modal>


```

### 2. 모달 팝업 외에 영역을 눌렀을 경우 팝업이 닫히는 방법


 