import { FirebaseError } from "firebase/app";
import {
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
  TotpMultiFactorGenerator,
  getMultiFactorResolver,
  multiFactor,
  type MultiFactorError,
  type MultiFactorInfo,
  type MultiFactorResolver,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { APP_NAME } from "@/lib/branding/app-name";

export type MfaFactorSummary = {
  uid: string;
  factorId: string;
  displayName: string | null;
  enrollmentTime: string;
};

export function listEnrolledFactors(user: User): MfaFactorSummary[] {
  return multiFactor(user).enrolledFactors.map((f) => ({
    uid: f.uid,
    factorId: f.factorId,
    displayName: f.displayName ?? null,
    enrollmentTime: f.enrollmentTime,
  }));
}

export function userHasMfa(user: User): boolean {
  return multiFactor(user).enrolledFactors.length > 0;
}

export type TotpEnrollmentSession = {
  secretKey: string;
  qrCodeUrl: string;
  totpSecret: Awaited<
    ReturnType<typeof TotpMultiFactorGenerator.generateSecret>
  >;
};

export async function startTotpEnrollment(
  user: User,
): Promise<TotpEnrollmentSession> {
  if (!user.emailVerified) {
    throw new FirebaseError(
      "auth/unverified-email",
      "Verify your email before enrolling in two-factor authentication.",
    );
  }
  const session = await multiFactor(user).getSession();
  const totpSecret = await TotpMultiFactorGenerator.generateSecret(session);
  const qrCodeUrl = totpSecret.generateQrCodeUrl(
    user.email ?? user.uid,
    APP_NAME,
  );
  return {
    secretKey: totpSecret.secretKey,
    qrCodeUrl,
    totpSecret,
  };
}

export async function finishTotpEnrollment(
  user: User,
  totpSecret: TotpEnrollmentSession["totpSecret"],
  verificationCode: string,
  displayName = "Authenticator app",
): Promise<void> {
  const assertion = TotpMultiFactorGenerator.assertionForEnrollment(
    totpSecret,
    verificationCode.trim(),
  );
  await multiFactor(user).enroll(assertion, displayName);
}

export function createRecaptchaVerifier(
  containerId: string,
): RecaptchaVerifier {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("Firebase Auth is not configured.");
  }
  return new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
  });
}

export async function startPhoneMfaEnrollment(
  user: User,
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier,
): Promise<string> {
  if (!user.emailVerified) {
    throw new FirebaseError(
      "auth/unverified-email",
      "Verify your email before enrolling SMS two-factor.",
    );
  }
  const session = await multiFactor(user).getSession();
  const phoneAuthProvider = new PhoneAuthProvider(getFirebaseAuth()!);
  return phoneAuthProvider.verifyPhoneNumber(
    { phoneNumber: phoneNumber.trim(), session },
    recaptchaVerifier,
  );
}

export async function finishPhoneMfaEnrollment(
  user: User,
  verificationId: string,
  verificationCode: string,
  displayName = "SMS",
): Promise<void> {
  const cred = PhoneAuthProvider.credential(
    verificationId,
    verificationCode.trim(),
  );
  const assertion = PhoneMultiFactorGenerator.assertion(cred);
  await multiFactor(user).enroll(assertion, displayName);
}

export async function unenrollMfaFactor(
  user: User,
  factorUid: string,
): Promise<void> {
  await multiFactor(user).unenroll(factorUid);
}

export function getMfaResolver(error: unknown): MultiFactorResolver | null {
  const auth = getFirebaseAuth();
  if (!auth || !(error instanceof FirebaseError)) return null;
  if (error.code !== "auth/multi-factor-auth-required") return null;
  return getMultiFactorResolver(auth, error as MultiFactorError);
}

export function isTotpHint(
  hint: MultiFactorInfo,
): hint is MultiFactorInfo & { factorId: string } {
  return hint.factorId === TotpMultiFactorGenerator.FACTOR_ID;
}

export function isPhoneHint(
  hint: MultiFactorInfo,
): hint is MultiFactorInfo & { factorId: string } {
  return hint.factorId === PhoneMultiFactorGenerator.FACTOR_ID;
}

export async function resolveTotpMfaSignIn(
  resolver: MultiFactorResolver,
  hintIndex: number,
  verificationCode: string,
): Promise<void> {
  const hint = resolver.hints[hintIndex];
  if (!hint || !isTotpHint(hint)) {
    throw new Error("Selected factor is not an authenticator app.");
  }
  const assertion = TotpMultiFactorGenerator.assertionForSignIn(
    hint.uid,
    verificationCode.trim(),
  );
  await resolver.resolveSignIn(assertion);
}

export async function startPhoneMfaSignIn(
  resolver: MultiFactorResolver,
  hintIndex: number,
  recaptchaVerifier: RecaptchaVerifier,
): Promise<string> {
  const hint = resolver.hints[hintIndex];
  if (!hint || !isPhoneHint(hint)) {
    throw new Error("Selected factor is not SMS.");
  }
  const phoneAuthProvider = new PhoneAuthProvider(getFirebaseAuth()!);
  return phoneAuthProvider.verifyPhoneNumber(
    { multiFactorHint: hint, session: resolver.session },
    recaptchaVerifier,
  );
}

export async function resolvePhoneMfaSignIn(
  resolver: MultiFactorResolver,
  verificationId: string,
  verificationCode: string,
): Promise<void> {
  const cred = PhoneAuthProvider.credential(
    verificationId,
    verificationCode.trim(),
  );
  const assertion = PhoneMultiFactorGenerator.assertion(cred);
  await resolver.resolveSignIn(assertion);
}
