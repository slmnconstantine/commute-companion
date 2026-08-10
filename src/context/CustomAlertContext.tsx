import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert as RNAlert, AlertButton } from 'react-native';
import CustomAlertModal from '@/components/common/CustomAlertModal';

export interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  type?: 'error' | 'success' | 'warning' | 'info';
}

type AlertListener = (state: AlertState) => void;
let globalAlertListener: AlertListener | null = null;

export function showCustomAlert(title: string, message?: string, buttons?: AlertButton[]) {
  const lowerTitle = (title || '').toLowerCase();
  const lowerMsg = (message || '').toLowerCase();

  let type: 'error' | 'success' | 'warning' | 'info' = 'info';

  if (
    lowerTitle.includes('error') ||
    lowerTitle.includes('fail') ||
    lowerTitle.includes('denied') ||
    lowerTitle.includes('cannot') ||
    lowerTitle.includes('missing') ||
    lowerMsg.includes('violates') ||
    lowerMsg.includes('error')
  ) {
    type = 'error';
  } else if (
    lowerTitle.includes('success') ||
    lowerTitle.includes('submitted') ||
    lowerTitle.includes('verified') ||
    lowerTitle.includes('saved') ||
    lowerTitle.includes('arrived') ||
    lowerTitle.includes('done') ||
    lowerTitle.includes('🎉') ||
    lowerTitle.includes('✅')
  ) {
    type = 'success';
  } else if (
    lowerTitle.includes('delete') ||
    lowerTitle.includes('remove') ||
    lowerTitle.includes('warning') ||
    lowerTitle.includes('sure') ||
    lowerTitle.includes('confirm') ||
    lowerTitle.includes('cancel') ||
    lowerTitle.includes('leave')
  ) {
    type = 'warning';
  }

  const notifyListener = () => {
    if (globalAlertListener) {
      globalAlertListener({
        visible: true,
        title,
        message,
        buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK', style: 'default' }],
        type,
      });
    } else {
      RNAlert.alert(title, message as any, buttons as any);
    }
  };

  // Schedule asynchronously so it never triggers during React component render phase
  setTimeout(notifyListener, 0);
}

// Global monkey-patch of React Native Alert.alert
RNAlert.alert = (title: string, message?: string, buttons?: AlertButton[], options?: any) => {
  showCustomAlert(title, message, buttons);
};

export const CustomAlertContext = createContext({
  showCustomAlert,
});

export function useCustomAlert() {
  return useContext(CustomAlertContext);
}

export function CustomAlertProvider({ children }: { children: React.ReactNode }) {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
    type: 'info',
  });

  useEffect(() => {
    globalAlertListener = (newState) => {
      setAlertState(newState);
    };
    return () => {
      globalAlertListener = null;
    };
  }, []);

  const hideAlert = () => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  };

  return (
    <CustomAlertContext.Provider value={{ showCustomAlert }}>
      {children}
      <CustomAlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        type={alertState.type}
        onClose={hideAlert}
      />
    </CustomAlertContext.Provider>
  );
}
