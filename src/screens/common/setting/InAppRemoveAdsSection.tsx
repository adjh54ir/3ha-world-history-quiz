import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import IconComponent from '@/src/screens/common/atomic/IconComponent';
import { showAlert, showConfirm } from '@/src/screens/common/modal/ConfirmModal';
import Colors, { withAlpha } from '@/src/const/ConstColors';
import { Spacing, SpacingV, Radius, Typography, Tracking, Border } from '@/src/const/ConstDesign';
import { scaledSize, scaleHeight, scaleWidth } from '@/src/utils';
import {
	getPlans,
	purchasePlan,
	restorePurchases,
	subscribePurchaseError,
	isCancelError,
	devResetAdsRemoved,
	devClearAdsOverride,
	isDevAdsOverrideOn,
	ADS_TEST_TOOLS_ENABLED,
	type PurchaseFailReason,
	type Plan,
	type SubPlanInfo,
} from '@/src/services/PurchaseService';
import useAdsRemoved from '@/src/hooks/useAdsRemoved';
import { themed } from '@/src/utils/ThemedStyles';

/** 구매 실패 사유별 안내 문구 */
const FAIL_MESSAGE: Record<Exclude<PurchaseFailReason, 'cancelled'>, string> = {
	'no-module': '결제 모듈이 준비되지 않았어요. 앱을 다시 시작해주세요.',
	'not-connected': '스토어에 연결할 수 없어요. 네트워크를 확인하고 다시 시도해주세요.',
	'no-product': __DEV__
		? '상품을 불러올 수 없어요.\n· 시뮬레이터: Xcode 스킴으로 실행해 StoreKit 설정 파일을 적용하세요.\n· 실기기: 스토어 상품 등록/승인 상태와 샌드박스 계정을 확인하세요.'
		: '지금은 상품을 불러올 수 없어요. 잠시 후 다시 시도해주세요.',
	failed: '결제를 진행할 수 없어요. 잠시 후 다시 시도해주세요.',
};

const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = 'https://ecodelab.im/terms/worldHistoryQuiz';
const MANAGE_URL = Platform.select({
	ios: 'https://apps.apple.com/account/subscriptions',
	default: 'https://play.google.com/store/account/subscriptions',
});

/** 스토어 가격 조회 전·실패 시 기본 표기 (KRW 기준가) */
const FALLBACK: Record<Plan, SubPlanInfo> = {
	monthly: { displayPrice: '₩3,900', price: 3900, currency: 'KRW' },
	yearly: { displayPrice: '₩18,900', price: 18900, currency: 'KRW' },
	lifetime: { displayPrice: '₩3,900', price: 3900, currency: 'KRW' },
};

const PLAN_META: Record<Plan, { label: string; unit: string }> = {
	yearly: { label: '연간 멤버십', unit: '년' },
	monthly: { label: '월간 멤버십', unit: '월' },
	lifetime: { label: '평생 이용권', unit: '1회' },
};
const PLAN_ORDER: Plan[] = ['yearly', 'monthly'];

const formatMoney = (value: number, currency?: string) => {
	try {
		return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: currency || 'KRW', maximumFractionDigits: 0 }).format(value);
	} catch {
		return `${Math.round(value).toLocaleString()}`;
	}
};

/**
 * 설정 — 광고 제거 구독 섹션
 * - 월간 · 연간 자동갱신 구독 (평생 이용권은 판매 중단, 기존 구매자 권한만 유지)
 */
const BENEFITS = [
	{ icon: 'block', label: '배너·전면 광고 완전 제거' },
	{ icon: 'bolt', label: '끊김 없이 학습에만 집중' },
];

const InAppRemoveAdsSection: React.FC = () => {
	const adsRemoved = useAdsRemoved();
	const [plans, setPlans] = useState<Record<Plan, SubPlanInfo>>(FALLBACK);
	const [selected, setSelected] = useState<Plan>('yearly');
	const [buying, setBuying] = useState(false);
	const [restoring, setRestoring] = useState(false);
	// [DEV] 강제 미구매 오버라이드 상태 (해제 버튼 노출용)
	const [overrideOn, setOverrideOn] = useState(() => isDevAdsOverrideOn());

	// 스토어 표시 가격 로드 (실패한 플랜은 기본가 유지)
	useEffect(() => {
		let alive = true;
		getPlans().then((p) => {
			if (alive) setPlans((prev) => ({ ...prev, ...p }));
		});
		return () => {
			alive = false;
		};
	}, []);

	// 스토어에서 비동기로 올라오는 구매 에러 → 사용자에게 안내 (취소는 조용히 무시)
	useEffect(() => {
		return subscribePurchaseError((e) => {
			setBuying(false);
			if (isCancelError(e.code)) return;
			showAlert('결제 실패', FAIL_MESSAGE.failed, 'error-outline');
		});
	}, []);

	const onPurchase = useCallback(async () => {
		if (buying) return;
		setBuying(true);
		try {
			const res = await purchasePlan(selected);
			// 결제 완료는 purchaseUpdatedListener → 플래그 갱신으로 카드가 전환되며 반영
			if (!res.ok && res.reason && res.reason !== 'cancelled') {
				showAlert('결제 불가', FAIL_MESSAGE[res.reason], 'error-outline');
			}
			setOverrideOn(isDevAdsOverrideOn());
		} catch {
			showAlert('결제 실패', FAIL_MESSAGE.failed, 'error-outline');
		} finally {
			setBuying(false);
		}
	}, [buying, selected]);

	const onRestore = useCallback(async () => {
		if (restoring) return;
		setRestoring(true);
		try {
			const owned = await restorePurchases();
			if (owned === null) {
				showAlert('복원 불가', '스토어에 연결할 수 없어요. 잠시 후 다시 시도해주세요.', 'cloud-off');
			} else if (owned) {
				showAlert('복원 완료', '광고 제거 이용권이 복원되었어요', 'check-circle');
			} else {
				showAlert('구매 내역 없음', '이 계정으로 이용 중인 광고 제거 내역이 없어요.', 'receipt-long');
			}
			setOverrideOn(isDevAdsOverrideOn());
		} finally {
			setRestoring(false);
		}
	}, [restoring]);

	const open = useCallback((url: string) => {
		Linking.openURL(url).catch(() => {});
	}, []);

	// 개발용: 강제 미구매 오버라이드 ON → 재시작·재검증에도 미구매 상태 유지
	const onDevRevert = useCallback(() => {
		showConfirm({
			title: '[DEV] 광고제거 되돌리기',
			message: '미구매 상태로 강제 전환해 광고를 다시 노출합니다.\n앱을 재시작해도 유지되며, 스토어 구매 이력은 그대로 남습니다.',
			confirmText: '되돌리기',
			destructive: true,
			icon: 'settings-backup-restore',
		}).then(async (ok) => {
			if (!ok) return;
			await devResetAdsRemoved();
			setOverrideOn(true);
			await showAlert('완료', '미구매 상태로 전환했어요. 광고가 다시 노출됩니다.', 'check-circle');
		});
	}, []);

	// 오터치 방지: 짧게 누르면 안내만
	const onDevRevertHint = useCallback(() => {
		showAlert('테스트 도구', '실수 방지를 위해 버튼을 1초간 길게 눌러주세요.', 'touch-app');
	}, []);

	// 개발용: 오버라이드 해제 → 실제 구매 상태로 복귀
	const onDevClearOverride = useCallback(async () => {
		await devClearAdsOverride();
		setOverrideOn(false);
		showAlert('완료', '실제 구매 상태로 복귀했어요.', 'check-circle');
	}, []);

	// 구매 완료 상태 — 프리미엄 멤버 카드
	if (adsRemoved) {
		return (
			<View style={styles.premiumWrap}>
				<LinearGradient colors={[Colors.inkSoft, Colors.ink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
				<View style={styles.doneRow}>
					<View style={styles.doneBadge}>
						<IconComponent type="materialIcons" name="verified" size={scaledSize(24)} color={Colors.gold} />
					</View>
					<View style={styles.doneBody}>
						<Text style={styles.premiumEyebrow}>PREMIUM</Text>
						<Text style={styles.doneTitle}>광고 없이 이용 중</Text>
						<Text style={styles.doneDesc}>모든 광고가 제거되었어요. 이용해주셔서 감사해요!</Text>
					</View>
				</View>
				<TouchableOpacity style={styles.restoreBtn} activeOpacity={0.7} onPress={() => open(MANAGE_URL)}>
					<Text style={styles.restoreText}>구독 관리</Text>
				</TouchableOpacity>

				{/* 테스트 도구: 상태 배지 + 되돌리기(오터치 방지용 길게 누르기) */}
				{ADS_TEST_TOOLS_ENABLED && (
					<>
						<View style={styles.testStateBadge}>
							<IconComponent type="materialIcons" name="science" size={scaledSize(11)} color={Colors.onBrandTextSoft} />
							<Text style={styles.testStateText}>테스트 모드 · 구매 상태</Text>
						</View>
						<TouchableOpacity
							style={styles.devRevertBtn}
							activeOpacity={0.7}
							delayLongPress={1000}
							onLongPress={onDevRevert}
							onPress={onDevRevertHint}>
							<IconComponent type="materialIcons" name="undo" size={scaledSize(14)} color={Colors.onBrandTextSoft} />
							<Text style={styles.devRevertText}>[DEV] 광고제거 되돌리기 (길게 누르기)</Text>
						</TouchableOpacity>
					</>
				)}
			</View>
		);
	}

	return (
		<View style={styles.premiumWrap}>
			{/* 딥네이비 그라데이션 + 다이아 워터마크 */}
			<LinearGradient colors={[Colors.inkSoft, Colors.ink, Colors.nightDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
			<View pointerEvents="none" style={styles.watermark}>
				<IconComponent type="fontAwesome6" name="gem" size={scaledSize(110)} color={withAlpha(Colors.gold, '14')} />
			</View>

			{/* 헤더: 골드 다이아 + 타이틀 */}
			<View style={styles.headRow}>
				<LinearGradient colors={[Colors.goldSoft, Colors.amber]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headIcon}>
					<IconComponent type="fontAwesome6" name="gem" size={scaledSize(18)} color={Colors.inkSoft} />
				</LinearGradient>
				<View style={styles.headBody}>
					<Text style={styles.premiumEyebrow}>PREMIUM MEMBERSHIP</Text>
					<Text style={styles.title}>광고 없는 학습</Text>
				</View>
			</View>
			<Text style={styles.headSub}>광고 없이 오롯이 세계 상식 공부에만 집중하세요.</Text>

			{/* 혜택 리스트 */}
			<View style={styles.benefits}>
				{BENEFITS.map((b) => (
					<View key={b.label} style={styles.benefitRow}>
						<View style={styles.benefitIcon}>
							<IconComponent type="materialIcons" name={b.icon} size={scaledSize(14)} color={Colors.gold} />
						</View>
						<Text style={styles.benefitText}>{b.label}</Text>
					</View>
				))}
			</View>

			{/* 플랜 선택 */}
			<View style={styles.plans}>
				{PLAN_ORDER.map((plan) => {
					const info = plans[plan];
					const on = selected === plan;
					const monthlyPrice = plans.monthly.price;
					const perMonth = plan === 'yearly' && info.price ? formatMoney(info.price / 12, info.currency) : null;
					const saving =
						plan === 'yearly' && info.price && monthlyPrice && info.currency === plans.monthly.currency
							? Math.round((1 - info.price / (monthlyPrice * 12)) * 100)
							: 0;
					return (
						<TouchableOpacity
							key={plan}
							activeOpacity={0.85}
							onPress={() => setSelected(plan)}
							accessibilityRole="radio"
							accessibilityState={{ checked: on }}
							style={[styles.planTile, on && styles.planTileOn]}>
							{saving > 0 && (
								<LinearGradient colors={[Colors.goldSoft, Colors.amber]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBadge}>
									<Text style={styles.saveBadgeText}>BEST · {saving}% 할인</Text>
								</LinearGradient>
							)}
							<View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
							<View style={styles.planBody}>
								<Text style={[styles.planLabel, on && styles.planLabelOn]}>{PLAN_META[plan].label}</Text>
								<Text style={styles.planSub}>{perMonth ? `월 ${perMonth} 꼴로 이용` : '매월 자동 갱신'}</Text>
							</View>
							<View style={styles.planPriceWrap}>
								<Text style={[styles.planPrice, on && styles.planPriceOn]}>{info.displayPrice}</Text>
								<Text style={styles.planUnit}>/ {PLAN_META[plan].unit}</Text>
							</View>
						</TouchableOpacity>
					);
				})}
			</View>

			{/* 골드 CTA */}
			<TouchableOpacity activeOpacity={0.9} disabled={buying} onPress={onPurchase} style={buying ? styles.btnDisabled : undefined}>
				<LinearGradient colors={[Colors.goldSoft, Colors.amber, Colors.goldDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buyBtn}>
					{buying ? (
						<ActivityIndicator size="small" color={Colors.inkSoft} />
					) : (
						<>
							<IconComponent type="materialIcons" name="auto-awesome" size={scaledSize(17)} color={Colors.inkSoft} />
							<Text style={styles.buyBtnText}>{PLAN_META[selected].label} 시작하기</Text>
						</>
					)}
				</LinearGradient>
			</TouchableOpacity>

			{/* 자동 갱신 고지 (스토어 심사 필수) */}
			<Text style={styles.legal}>
				{`구독은 현재 기간 종료 24시간 전까지 해지하지 않으면 같은 요금(${plans[selected].displayPrice}/${PLAN_META[selected].unit})으로 자동 갱신돼요. 결제는 ${Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'} 계정으로 청구되며, 스토어 계정 설정에서 언제든 해지할 수 있어요.`}
			</Text>
			<View style={styles.linkRow}>
				<Text style={styles.linkText} onPress={() => open(TERMS_URL)}>이용약관</Text>
				<Text style={styles.linkDot}>·</Text>
				<Text style={styles.linkText} onPress={() => open(PRIVACY_URL)}>개인정보처리방침</Text>
				<Text style={styles.linkDot}>·</Text>
				{restoring ? (
					<ActivityIndicator size="small" color={Colors.onBrandTextSoft} />
				) : (
					<Text style={styles.linkText} onPress={onRestore}>구매 복원</Text>
				)}
			</View>

			{/* 테스트 도구: 강제 미구매 상태 배지 + 해제(길게 누르기) */}
			{ADS_TEST_TOOLS_ENABLED && overrideOn && (
				<>
					<View style={styles.testStateBadge}>
						<IconComponent type="materialIcons" name="science" size={scaledSize(11)} color={Colors.onBrandTextSoft} />
						<Text style={styles.testStateText}>테스트 모드 · 강제 미구매</Text>
					</View>
					<TouchableOpacity
						style={styles.devRevertBtn}
						activeOpacity={0.7}
						delayLongPress={1000}
						onLongPress={onDevClearOverride}
						onPress={onDevRevertHint}>
						<IconComponent type="materialIcons" name="redo" size={scaledSize(14)} color={Colors.onBrandTextSoft} />
						<Text style={styles.devRevertText}>[DEV] 강제 미구매 해제 (길게 누르기)</Text>
					</TouchableOpacity>
				</>
			)}
		</View>
	);
};

const styles = themed(() => StyleSheet.create({
	// 프리미엄 카드 컨테이너 (딥네이비 + 골드 보더)
	premiumWrap: {
		borderRadius: Radius.xl,
		padding: Spacing.xl,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: withAlpha(Colors.gold, '8A'),
	},
	watermark: { position: 'absolute', right: -scaleWidth(16), bottom: -scaleHeight(16), transform: [{ rotate: '-14deg' }] },
	headRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
	headIcon: { width: scaleWidth(42), height: scaleWidth(42), borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
	headBody: { flex: 1 },
	premiumEyebrow: { fontSize: Typography.micro, fontWeight: '900', color: Colors.gold, letterSpacing: Tracking.wider },
	title: { fontSize: Typography.title, fontWeight: '900', color: Colors.textInverse, marginTop: SpacingV.xxs },
	headSub: { fontSize: Typography.footnote, fontWeight: '600', color: Colors.onBrandTextSoft, marginTop: SpacingV.sm },
	plans: { marginTop: SpacingV.xl, gap: SpacingV.md },
	planTile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.onBrandBorderSoft, backgroundColor: Colors.onBrandSurface, paddingHorizontal: Spacing.lg, paddingVertical: SpacingV.lg },
	planTileOn: { borderWidth: Border.thin, borderColor: Colors.gold, backgroundColor: withAlpha(Colors.gold, '1A') },
	saveBadge: { position: 'absolute', top: -scaleHeight(10), right: Spacing.lg, borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs },
	saveBadgeText: { fontSize: Typography.micro, fontWeight: '900', color: Colors.inkSoft, letterSpacing: Tracking.wide },
	radio: { width: scaleWidth(20), height: scaleWidth(20), borderRadius: Radius.pill, borderWidth: Border.thin, borderColor: Colors.onBrandTextSoft, alignItems: 'center', justifyContent: 'center' },
	radioOn: { borderColor: Colors.gold },
	radioDot: { width: scaleWidth(10), height: scaleWidth(10), borderRadius: Radius.pill, backgroundColor: Colors.gold },
	planBody: { flex: 1 },
	planLabel: { fontSize: Typography.body, fontWeight: '800', color: Colors.onBrandText },
	planLabelOn: { color: Colors.textInverse },
	planSub: { fontSize: Typography.footnote, fontWeight: '600', color: Colors.onBrandTextSoft, marginTop: SpacingV.xxs },
	planPriceWrap: { alignItems: 'flex-end' },
	planPrice: { fontSize: Typography.callout, fontWeight: '900', color: Colors.onBrandText },
	planPriceOn: { color: Colors.gold },
	planUnit: { fontSize: Typography.micro, fontWeight: '700', color: Colors.onBrandTextSoft, marginTop: SpacingV.xxs },
	legal: { fontSize: Typography.micro, color: Colors.onBrandTextSoft, lineHeight: scaleHeight(16), marginTop: SpacingV.md, textAlign: 'center' },
	linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: SpacingV.sm, minHeight: scaleHeight(28) },
	linkText: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.onBrandTextSoft, textDecorationLine: 'underline', paddingVertical: SpacingV.xs },
	linkDot: { fontSize: Typography.footnote, color: Colors.onBrandTextSoft },
	benefits: { marginTop: SpacingV.lg, gap: SpacingV.sm },
	benefitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
	benefitIcon: { width: scaleWidth(24), height: scaleWidth(24), borderRadius: Radius.sm, backgroundColor: withAlpha(Colors.gold, '24'), alignItems: 'center', justifyContent: 'center' },
	benefitText: { fontSize: Typography.body, fontWeight: '600', color: Colors.onBrandText },
	buyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.lg, paddingVertical: SpacingV.lg, marginTop: SpacingV.xl },
	buyBtnText: { flexShrink: 1, color: Colors.inkSoft, fontSize: Typography.callout, fontWeight: '900', textAlign: 'center' },
	btnDisabled: { opacity: 0.6 },
	restoreBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: SpacingV.sm, marginTop: SpacingV.sm },
	restoreText: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.onBrandTextSoft, textDecorationLine: 'underline' },
	// 구매 완료
	doneRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
	doneBadge: { width: scaleWidth(46), height: scaleWidth(46), borderRadius: Radius.lg, backgroundColor: withAlpha(Colors.gold, '24'), borderWidth: 1, borderColor: withAlpha(Colors.gold, '66'), alignItems: 'center', justifyContent: 'center' },
	doneBody: { flex: 1 },
	doneTitle: { fontSize: Typography.callout, fontWeight: '900', color: Colors.textInverse, marginTop: SpacingV.xxs },
	doneDesc: { fontSize: Typography.footnote, color: Colors.onBrandTextSoft, marginTop: SpacingV.xxs, lineHeight: scaleHeight(18) },
	devRevertBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, alignSelf: 'center', marginTop: SpacingV.md, paddingHorizontal: Spacing.md, paddingVertical: SpacingV.xs, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.onBrandBorderSoft },
	devRevertText: { fontSize: Typography.footnote, fontWeight: '700', color: Colors.onBrandTextSoft },
	testStateBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: Spacing.xs, marginTop: SpacingV.md, paddingHorizontal: Spacing.sm, paddingVertical: SpacingV.xxs, borderRadius: Radius.pill, backgroundColor: Colors.onBrandSurface },
	testStateText: { fontSize: Typography.footnote, fontWeight: '800', color: Colors.onBrandTextSoft },
}));

export default InAppRemoveAdsSection;
