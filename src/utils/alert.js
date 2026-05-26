import { Alert, Platform } from 'react-native';

export const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
};

export const showConfirm = (title, message, onConfirm, onCancel) => {
  if (Platform.OS === 'web') {
    const ok = window.confirm(message ? `${title}\n\n${message}` : title);
    if (ok) onConfirm?.();
    else onCancel?.();
  } else {
    Alert.alert(title, message, [
      { text: '취소', style: 'cancel', onPress: onCancel },
      { text: '확인', style: 'destructive', onPress: onConfirm },
    ]);
  }
};
