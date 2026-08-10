import { useLogin } from '@privy-io/react-auth';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSubmitClaim } from '../hooks/useSubmitClaim';
import { colors, radii, spacing } from '../theme';
import { prepareClaimUri, uriToImageFile } from '../utils/uploadProof';

type Step = 'photo' | 'details' | 'review';

type Props = {
  chainId: number;
  onChainBountyId: number;
  bountyTitle: string;
  issuerAddress: string;
  canClaim: boolean;
  disabledReason?: string | null;
  onCancel: () => void;
  /** Called after a successful on-chain claim so the bounty page can open Claims + refresh. */
  onComplete: (txHash: string) => void;
};

const STEPS: Step[] = ['photo', 'details', 'review'];

export function ClaimFlow({
  chainId,
  onChainBountyId,
  bountyTitle,
  issuerAddress,
  canClaim,
  disabledReason,
  onCancel,
  onComplete,
}: Props) {
  const { login } = useLogin();
  const { authenticated, walletAddress, submitting, submitClaim } =
    useSubmitClaim();
  const [step, setStep] = useState<Step>('photo');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  /** In-memory object URL — bytes are copied at pick time so iOS can't revoke them. */
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = submitting || uploading;
  const stepIndex = STEPS.indexOf(step);

  useEffect(() => {
    setStep('photo');
    setName('');
    setDescription('');
    setLocalImageUri((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    setUploading(false);
    setError(null);
  }, [onChainBountyId]);

  useEffect(() => {
    return () => {
      if (localImageUri?.startsWith('blob:')) {
        URL.revokeObjectURL(localImageUri);
      }
    };
  }, [localImageUri]);

  const isIssuer =
    Boolean(walletAddress) &&
    Boolean(issuerAddress) &&
    walletAddress!.toLowerCase() === issuerAddress.toLowerCase();

  const pickImage = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to attach proof');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets[0]?.uri) return;

    try {
      // Copy bytes immediately — iOS Safari gallery File refs can go empty later.
      const file = await uriToImageFile(result.assets[0].uri, 'claim.jpg');
      const objectUrl = URL.createObjectURL(file);
      setLocalImageUri((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return objectUrl;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read the selected photo');
    }
  };

  const goBack = () => {
    setError(null);
    if (step === 'photo') {
      onCancel();
      return;
    }
    setStep(STEPS[stepIndex - 1]);
  };

  const goNext = () => {
    setError(null);
    if (step === 'photo') {
      if (!localImageUri) {
        setError('Pick a proof photo');
        return;
      }
      setStep('details');
      return;
    }
    if (step === 'details') {
      if (!name.trim() || !description.trim()) {
        setError('Add a title and description');
        return;
      }
      setStep('review');
    }
  };

  const onSubmit = async () => {
    setError(null);
    if (!authenticated) {
      login({ loginMethods: ['email', 'sms'] });
      return;
    }
    if (!canClaim) {
      setError(disabledReason ?? 'This bounty cannot be claimed right now');
      return;
    }
    if (isIssuer) {
      setError('Bounty issuers cannot claim their own bounty');
      return;
    }

    try {
      setUploading(true);
      const proofUri = await prepareClaimUri({
        name,
        description,
        localImageUri,
      });
      setUploading(false);

      const hash = await submitClaim({
        chainId,
        onChainBountyId,
        name,
        description,
        proofUri,
      });
      onComplete(hash);
    } catch (err) {
      setUploading(false);
      setError(err instanceof Error ? err.message : 'Failed to submit claim');
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={goBack} style={styles.back} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <View style={styles.topCopy}>
          <Text style={styles.topTitle}>Claim</Text>
          <Text style={styles.topSubtitle} numberOfLines={1}>
            {bountyTitle}
          </Text>
        </View>
        <Pressable onPress={onCancel} hitSlop={10}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>

      <View style={styles.progress}>
        {STEPS.map((item, index) => (
          <View
            key={item}
            style={[
              styles.progressDot,
              index <= stepIndex && styles.progressDotActive,
            ]}
          />
        ))}
      </View>
      <Text style={styles.stepLabel}>
        {step === 'photo'
          ? '1 · Proof photo'
          : step === 'details'
            ? '2 · Claim details'
            : '3 · Review & submit'}
      </Text>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {disabledReason ? <Text style={styles.warn}>{disabledReason}</Text> : null}
        {isIssuer ? (
          <Text style={styles.warn}>
            You are the issuer — claiming is blocked on-chain.
          </Text>
        ) : null}

        {step === 'photo' ? (
          <>
            <Text style={styles.help}>
              Choose the photo that proves you completed this bounty.
            </Text>
            <Pressable
              onPress={() => void pickImage()}
              disabled={busy}
              style={[styles.picker, busy && styles.disabled]}
            >
              {localImageUri ? (
                <Image
                  source={{ uri: localImageUri }}
                  style={styles.preview}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.pickerEmpty}>
                  <Text style={styles.pickerTitle}>Choose from camera roll</Text>
                  <Text style={styles.pickerHint}>JPG, PNG, GIF, or WebP</Text>
                </View>
              )}
            </Pressable>
            {localImageUri ? (
              <Pressable onPress={() => void pickImage()} disabled={busy}>
                <Text style={styles.link}>Replace photo</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {step === 'details' ? (
          <>
            <Text style={styles.help}>
              Add a short title and description.
            </Text>
            {localImageUri ? (
              <Image
                source={{ uri: localImageUri }}
                style={styles.thumb}
                contentFit="cover"
              />
            ) : null}
            <Text style={styles.label}>Claim title</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Short title for your proof"
              placeholderTextColor={colors.inkDim}
              style={styles.input}
              editable={!busy}
              // Helps iOS avoid treating these as “small text” fields.
              autoCorrect={false}
            />
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="How you completed the bounty"
              placeholderTextColor={colors.inkDim}
              style={[styles.input, styles.textarea]}
              multiline
              editable={!busy}
              autoCorrect={false}
            />
          </>
        ) : null}

        {step === 'review' ? (
          <>
            <Text style={styles.help}>
              Confirm everything looks right, then submit!
            </Text>
            {localImageUri ? (
              <Image
                source={{ uri: localImageUri }}
                style={styles.preview}
                contentFit="cover"
              />
            ) : null}
            <Text style={styles.reviewTitle}>{name.trim()}</Text>
            <Text style={styles.reviewBody}>{description.trim()}</Text>
          </>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        {step !== 'review' ? (
          <Pressable
            onPress={goNext}
            style={[styles.cta, busy && styles.disabled]}
            disabled={busy}
          >
            <Text style={styles.ctaText}>Continue</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => void onSubmit()}
            style={[styles.cta, busy && styles.disabled]}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#1A1010" />
            ) : (
              <Text style={styles.ctaText}>
                {!authenticated
                  ? 'Log in to claim'
                  : uploading
                    ? 'Uploading to IPFS…'
                    : submitting
                      ? 'Submitting…'
                      : 'Submit claim'}
              </Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCopy: {
    flex: 1,
  },
  topTitle: {
    color: colors.coral,
    fontFamily: 'Syne_700Bold',
    fontSize: 18,
  },
  topSubtitle: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
  cancel: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  progress: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.bgSoft,
  },
  progressDotActive: {
    backgroundColor: colors.coral,
  },
  stepLabel: {
    color: colors.inkDim,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  body: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  help: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  warn: {
    color: colors.voting,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
  label: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    marginTop: spacing.xs,
  },
  picker: {
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.bgSoft,
    minHeight: 220,
  },
  pickerEmpty: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: spacing.lg,
  },
  pickerTitle: {
    color: colors.ink,
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
  },
  pickerHint: {
    color: colors.inkDim,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: radii.md,
  },
  thumb: {
    width: '100%',
    height: 120,
    borderRadius: radii.sm,
  },
  link: {
    color: colors.coral,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bgSoft,
    borderRadius: radii.sm,
    color: colors.ink,
    fontFamily: 'DMSans_400Regular',
    // iOS Safari auto-zooms focused inputs under 16px
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  textarea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  reviewTitle: {
    color: colors.ink,
    fontFamily: 'Syne_700Bold',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  reviewBody: {
    color: colors.inkMuted,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: colors.coral,
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.bg,
  },
  cta: {
    backgroundColor: colors.coral,
    borderRadius: radii.sm,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#1A1010',
    fontFamily: 'Syne_700Bold',
    fontSize: 14,
  },
  disabled: {
    opacity: 0.7,
  },
});
