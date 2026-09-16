import HCaptcha from '@hcaptcha/react-hcaptcha';
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
  const captchaRef = useRef<HCaptcha>(null);
  const pendingRef = useRef<PendingChallenge | null>(null);

  useImperativeHandle(ref, () => ({
    execute: () => new Promise<string>((resolve, reject) => {
      pendingRef.current = { resolve, reject };
      captchaRef.current?.execute();
    }),
  }));

  return (
    <HCaptcha
      ref={captchaRef}
      sitekey={siteKey}
      size="invisible"
      onVerify={(token) => {
        pendingRef.current?.resolve(token);
        pendingRef.current = null;
        captchaRef.current?.resetCaptcha();
      }}
      onClose={() => {
        pendingRef.current?.reject(new Error('Verification cancelled. Please try again.'));
        pendingRef.current = null;
      }}
      onError={() => {
        pendingRef.current?.reject(new Error('Verification failed. Please try again.'));
        pendingRef.current = null;
      }}
      onExpire={() => {
        pendingRef.current?.reject(new Error('Verification expired. Please try again.'));
        pendingRef.current = null;
      }}
    />
  );
});

CaptchaGate.displayName = 'CaptchaGate';

export default CaptchaGate;
