import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AppModal from '@/src/screens/common/atomic/AppModal';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { SheetIn } from '@/src/screens/common/anim/Motion';
import { showAlert } from '@/src/screens/common/modal/ConfirmModal';
import Colors, { withAlpha, isDark } from '@/src/const/ConstColors';
import DateUtils from '@/src/utils/DateUtils';
import { Spacing, SpacingV, Radius, Typography, Tracking, Layout } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import BackupService from '@/src/services/BackupService';
import { reload } from '@/src/utils/ThemeReload';
import { themed } from '@/src/utils/ThemedStyles';

interface Props {
	visible: boolean;
	onClose: () => void;
}

type Tab = 'backup' | 'restore';

/** 코드 표기 — 8자리를 4자리씩 끊어 보여준다 (읽어 적기 쉽게) */
const formatCode = (code: string): string => `${code.slice(0, 4)}-${code.slice(4)}`;

/**
 * 학습 진도 백업·복원 팝업
 * - 백업하면 8자리 복원 코드가 나오고, 새 기기에서 그 코드를 넣으면 진도를 되살린다.
 * - 광고 제거(결제)는 백업 대상이 아니라 스토어 구매 복원으로 되살린다.
 */
const BackupRestoreModal: React.FC<Props> = ({ visible, onClose }) => {
	const [tab, setTab] = useState<Tab>('backup');
	const [busy, setBusy] = useState(false);
	const [code, setCode] = useState<string | null>(null);
	const [updatedAt, setUpdatedAt] = useState<string | null>(null);
	const [input, setInput] = useState('');

	const loadInfo = useCallback(async () => {
		const cached = await BackupService.getCachedCode();
		if (cached) setCode(cached);
		const info = await BackupService.getInfo();
		if (info) {
			setCode(info.code);
			setUpdatedAt(info.updatedAt);
		}
	}, []);

	useEffect(() => {
		if (!visible) return;
		setTab('backup');
		setInput('');
		setNotice(null);
		setAskRestore(false);
		loadInfo();
	}, [visible, loadInfo]);

	/**
	 * 이 시트는 그 자체가 RN Modal 이라, 앱 루트의 확인·안내 팝업(ConfirmModalHost)을 위에 띄우면
	 * iOS 에서 표시되지 않고 await 가 멈춘다. 그래서 확인·안내는 전부 시트 안에서 처리한다.
	 */
	const [notice, setNotice] = useState<{ icon: string; text: string; tone: 'ok' | 'error' } | null>(null);
	const [askRestore, setAskRestore] = useState(false);

	const runBackup = async () => {
		if (busy) return;
		setNotice(null);
		setBusy(true);
		const result = await BackupService.backup();
		setBusy(false);
		if (!result) {
			setNotice({ icon: 'cloud-off', text: '백업에 실패했어요. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.', tone: 'error' });
			return;
		}
		setCode(result);
		setUpdatedAt(DateUtils.toISOString());
		setNotice({ icon: 'cloud-done', text: '백업 완료! 기기를 바꿀 때 이 복원 코드가 필요해요.', tone: 'ok' });
	};

	const runRestore = async () => {
		const trimmed = input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
		if (busy || trimmed.length !== 8) return;
		setNotice(null);
		setAskRestore(true);
	};

	const confirmRestore = async () => {
		const trimmed = input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
		setAskRestore(false);
		setBusy(true);
		const result = await BackupService.restore(trimmed);
		setBusy(false);

		if (result === 'not-found') {
			setNotice({ icon: 'search-off', text: '코드를 찾을 수 없어요. 복원 코드를 다시 확인해 주세요.', tone: 'error' });
			return;
		}
		if (result === 'failed') {
			setNotice({ icon: 'cloud-off', text: '복원에 실패했어요. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.', tone: 'error' });
			return;
		}
		// 성공 안내는 시트가 닫힌 뒤 루트 팝업으로 — 곧바로 앱을 다시 띄우기 때문에 겹칠 일이 없다
		onClose();
		await showAlert('복원 완료', '앱을 다시 시작해 반영할게요.', 'check-circle');
		reload();
	};

	const shareCode = () => {
		if (!code) return;
		Share.share({ message: `세계 상식 퀴즈 복원 코드: ${formatCode(code)}` }).catch(() => { });
	};

	const updatedLabel = updatedAt ? new Date(updatedAt).toLocaleString('ko-KR') : null;
	const restoreReady = input.replace(/[^A-Za-z0-9]/g, '').length === 8;

	return (
		<AppModal visible={visible} transparent animationType="fade" onRequestClose={busy ? undefined : onClose}>
			<KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
				<TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={busy ? undefined : onClose} />
				<SheetIn visible={visible} distance={scaleHeight(24)} style={styles.card}>
					<View style={styles.iconWrap}>
						<IconComponent type="materialIcons" name="cloud-sync" size={scaledSize(28)} color={Colors.primary} />
					</View>
					<Text style={styles.title}>학습 기록 백업</Text>
					<Text style={styles.subtitle}>기기를 바꿔도 학습 기록을 그대로 옮길 수 있어요</Text>

					<View style={styles.tabRow}>
						{([['backup', '백업하기'], ['restore', '복원하기']] as [Tab, string][]).map(([key, label]) => (
							<TouchableOpacity
								key={key}
								style={[styles.tab, tab === key && styles.tabOn]}
								activeOpacity={0.85}
								disabled={busy}
								onPress={() => {
									setTab(key);
									setNotice(null);
									setAskRestore(false);
								}}>
								<Text style={[styles.tabText, tab === key && styles.tabTextOn]} numberOfLines={1} ellipsizeMode="tail">{label}</Text>
							</TouchableOpacity>
						))}
					</View>

					{tab === 'backup' ? (
						<>
							{code ? (
								<TouchableOpacity style={styles.codeBox} activeOpacity={0.85} onPress={shareCode}>
									<Text style={styles.codeLabel}>내 복원 코드</Text>
									<Text style={styles.codeText}>{formatCode(code)}</Text>
									{!!updatedLabel && <Text style={styles.codeDesc}>{updatedLabel} 저장됨</Text>}
									<View style={styles.shareHint}>
										<IconComponent type="materialIcons" name="ios-share" size={scaledSize(14)} color={Colors.primary} />
										<Text style={styles.shareHintText}>눌러서 코드 보내기</Text>
									</View>
								</TouchableOpacity>
							) : (
								<View style={styles.emptyBox}>
									<Text style={styles.emptyText}>아직 백업이 없어요.{'\n'}백업하면 복원 코드가 발급됩니다.</Text>
								</View>
							)}
							<TouchableOpacity style={[styles.primaryBtn, busy && styles.btnDisabled]} activeOpacity={0.9} disabled={busy} onPress={runBackup}>
								{busy ? <ActivityIndicator color={Colors.textInverse} /> : <Text style={styles.primaryText}>{code ? '지금 백업 갱신' : '백업하기'}</Text>}
							</TouchableOpacity>
						</>
					) : (
						<>
							<TextInput
								keyboardAppearance={isDark() ? 'dark' : 'light'}
								style={styles.input}
								value={input}
								onChangeText={setInput}
								placeholder="복원 코드 8자리"
								placeholderTextColor={Colors.textMuted}
								autoCapitalize="characters"
								autoCorrect={false}
								maxLength={9}
								editable={!busy}
							/>
							<TouchableOpacity
								style={[styles.primaryBtn, (!restoreReady || busy) && styles.btnDisabled]}
								activeOpacity={0.9}
								disabled={!restoreReady || busy}
								onPress={runRestore}>
								{busy ? <ActivityIndicator color={Colors.textInverse} /> : <Text style={styles.primaryText}>복원하기</Text>}
							</TouchableOpacity>
						</>
					)}

					{askRestore && (
						<View style={styles.confirmBox}>
							<Text style={styles.confirmText}>이 기기의 학습 기록을 백업 데이터로 덮어써요. 복원할까요?</Text>
							<View style={styles.confirmRow}>
								<TouchableOpacity style={styles.confirmCancel} activeOpacity={0.85} onPress={() => setAskRestore(false)}>
									<Text style={styles.confirmCancelText}>취소</Text>
								</TouchableOpacity>
								<TouchableOpacity style={styles.confirmOk} activeOpacity={0.9} onPress={confirmRestore}>
									<Text style={styles.confirmOkText}>복원</Text>
								</TouchableOpacity>
							</View>
						</View>
					)}

					{!!notice && (
						<View style={[styles.resultRow, notice.tone === 'ok' ? styles.resultRowOk : styles.resultRowError]}>
							<IconComponent type="materialIcons" name={notice.icon} size={scaledSize(16)} color={notice.tone === 'ok' ? Colors.success : Colors.error} />
							<Text style={[styles.resultText, { color: notice.tone === 'ok' ? Colors.success : Colors.error }]}>{notice.text}</Text>
						</View>
					)}

					<View style={styles.noticeRow}>
						<IconComponent type="materialIcons" name="info-outline" size={scaledSize(14)} color={Colors.textMuted} />
						<Text style={styles.noticeText}>광고 제거와 랭킹 닉네임은 백업에 포함되지 않아요. 광고 제거는 스토어 구매 복원, 닉네임은 새로 설정해 주세요.</Text>
					</View>

					<TouchableOpacity style={styles.closeBtn} activeOpacity={0.85} disabled={busy} onPress={onClose}>
						<Text style={styles.closeText}>닫기</Text>
					</TouchableOpacity>
				</SheetIn>
			</KeyboardAvoidingView>
		</AppModal>
	);
};

export default BackupRestoreModal;

const styles = themed(() => StyleSheet.create({
	overlay: { flex: 1, backgroundColor: Colors.backdrop, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
	card: { width: '100%', maxWidth: Layout.dialogMaxWidth, backgroundColor: Colors.surface, borderRadius: Radius.xl, paddingHorizontal: Spacing.xl, paddingVertical: SpacingV.xxl, alignItems: 'center' },
	iconWrap: { width: scaleWidth(56), height: scaleWidth(56), borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: SpacingV.md, backgroundColor: Colors.primarySoft },
	title: { fontSize: Typography.title, fontWeight: '900', color: Colors.textStrong, textAlign: 'center' },
	subtitle: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', marginTop: SpacingV.xs },
	tabRow: { flexDirection: 'row', alignSelf: 'stretch', gap: Spacing.xs, marginTop: SpacingV.lg, padding: Spacing.xxs, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt },
	tab: { flex: 1, alignItems: 'center', paddingVertical: SpacingV.sm, borderRadius: Radius.md },
	tabOn: { backgroundColor: Colors.surface },
	tabText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textMuted },
	tabTextOn: { color: Colors.primary },
	codeBox: { alignSelf: 'stretch', alignItems: 'center', marginTop: SpacingV.lg, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.lg, borderRadius: Radius.lg, backgroundColor: Colors.primaryBg },
	codeLabel: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.textSecondary },
	codeText: { fontSize: Typography.h2, fontWeight: '900', color: Colors.primary, letterSpacing: Tracking.wider, marginTop: SpacingV.xs },
	codeDesc: { fontSize: Typography.footnote, color: Colors.textMuted, marginTop: SpacingV.xs },
	shareHint: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, marginTop: SpacingV.sm },
	shareHintText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.primary },
	emptyBox: { alignSelf: 'stretch', marginTop: SpacingV.lg, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.lg, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt },
	emptyText: { fontSize: Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: scaleHeight(20) },
	input: {
		alignSelf: 'stretch', marginTop: SpacingV.lg, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.md,
		borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surface,
		fontSize: Typography.callout, fontWeight: '900', color: Colors.textStrong, textAlign: 'center', letterSpacing: Tracking.wider,
	},
	primaryBtn: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', paddingVertical: SpacingV.lg, borderRadius: Radius.md, marginTop: SpacingV.lg, backgroundColor: Colors.primary },
	primaryText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textInverse },
	btnDisabled: { opacity: 0.5 },
	confirmBox: { alignSelf: 'stretch', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.lg, padding: Spacing.lg, marginTop: SpacingV.sm },
	confirmText: { fontSize: Typography.body, color: Colors.textStrong, fontWeight: '700', lineHeight: scaleHeight(20) },
	confirmRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: SpacingV.md },
	confirmCancel: { flex: 1, alignItems: 'center', paddingVertical: SpacingV.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
	confirmCancelText: { fontSize: Typography.body, fontWeight: '800', color: Colors.textSecondary },
	confirmOk: { flex: 1, alignItems: 'center', paddingVertical: SpacingV.md, borderRadius: Radius.md, backgroundColor: Colors.primary },
	confirmOkText: { fontSize: Typography.body, fontWeight: '900', color: Colors.textInverse },
	resultRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, alignSelf: 'stretch', marginTop: SpacingV.md, padding: Spacing.md, borderRadius: Radius.lg },
	resultRowOk: { backgroundColor: withAlpha(Colors.success, '14') },
	resultRowError: { backgroundColor: withAlpha(Colors.error, '14') },
	resultText: { flex: 1, fontSize: Typography.footnote, fontWeight: '700', lineHeight: scaleHeight(18) },
	noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xxs, alignSelf: 'stretch', marginTop: SpacingV.md },
	noticeText: { flex: 1, fontSize: Typography.footnote, color: Colors.textMuted, lineHeight: scaleHeight(16) },
	closeBtn: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: SpacingV.md, marginTop: SpacingV.sm },
	closeText: { fontSize: Typography.callout, fontWeight: '800', color: Colors.textSecondary },
}));
