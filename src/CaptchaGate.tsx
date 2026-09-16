import ConfirmHcaptcha from '@hcaptcha/react-native-hcaptcha';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';

export type CaptchaGateHandle = {
  execute: () => Promise<string>;
};

type CaptchaGateProps = {
  siteKey: string;
};

type PendingChallenge = {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
};

const CaptchaGate = forwardRef<CaptchaGateHandle, CaptchaGateProps>(({ siteKey }, ref) => {
  const captchaRef = useRef<ConfirmHcaptcha>(null);
  const pendingRef = useRef<PendingChallenge | null>(null);

  useImperativeHandle(ref, () => ({
    execute: () => new Promise<string>((resolve, reject) => {
      pendingRef.current = { resolve, reject };
      captchaRef.current?.show();
    }),
  }));

  return (
    <ConfirmHcaptcha
      ref={captchaRef}
      siteKey={siteKey}
      baseUrl="https://divyapoojaapp.com"
      languageCode="en"
      size="invisible"
      onMessage={(event) => {
        const result = event.nativeEvent?.data;
        if (event.success && result) {
          event.markUsed?.();
          pendingRef.current?.resolve(result);
          pendingRef.current = null;
          captchaRef.current?.hide('verified');
          return;
        }
        if (result === 'challenge-closed' || result === 'cancel') {
          pendingRef.current?.reject(new Error('Verification cancelled. Please try again.'));
          pendingRef.current = null;
          captchaRef.current?.hide('cancelled');
          return;
        }
        if (result && result !== 'open') {
          pendingRef.current?.reject(new Error('Verification failed. Please try again.'));
          pendingRef.current = null;
          captchaRef.current?.hide('error');
        }
      }}
    />
  );
});

CaptchaGate.displayName = 'CaptchaGate';

export default CaptchaGate;
