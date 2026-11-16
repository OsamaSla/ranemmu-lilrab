/**
 * Cross-platform confirmation and alert helpers.
 *
 * `Alert.alert` is a no-op on react-native-web, so every destructive or
 * informational prompt that used it silently did nothing in the browser. These
 * helpers fall back to the native `window.confirm` / `window.alert` dialogs
 * there, and keep `Alert.alert` on iOS/Android.
 */
import { Alert, Platform } from 'react-native';

export interface ConfirmOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function confirmAction(
  title: string,
  message?: string,
  options?: ConfirmOptions,
): Promise<boolean> {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
    const body = message ? `${title}\n\n${message}` : title;
    return Promise.resolve(window.confirm(body));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: options?.cancelLabel ?? 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: options?.confirmLabel ?? 'OK',
          style: options?.destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}