// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * 세계 상식 퀴즈 — 인앱 구매 기록 (구매 도메인 전용 함수)
 * -------------------------------------------------
 *   POST { action: "record", platform, productId, transactionId, purchaseToken?, purchasedAt?, expiresAt? } → 200 { ok: true }
 *   POST { action: "status" }                                                → 200 { active: boolean }
 *
 * 공용 테이블 tb_purchases(supabase/tb_purchases.sql)에 app_id = 이 앱 번들 ID 로 기록한다.
 * 호출자는 앱의 익명 인증 세션(JWT) — user_id 는 요청 본문이 아니라 토큰에서 꺼낸다.
 * 같은 영수증(transaction_id)이 다시 오면 현재 uid 로 소유권을 옮긴다 (기기 변경 = 새 익명 uid).
 *
 * 평생 광고제거(비소모성)는 expires_at = null 로 기록한다.
 * 구독 만료일(expires_at): iOS 는 앱이 보낸 expirationDate, Android 는 스토어가 만료일을 주지 않으므로
 *   "스토어가 유효하다고 확인한 시점 + 구독 기간" 으로 기록한다 (앱은 스토어가 유효하다고 할 때만 record 를 보낸다).
 *
 * ponytail: 스토어 영수증 검증 없이 앱이 보낸 값을 기록한다. status 는 스토어 조회 실패 시 보조 근거일 뿐이라
 *   위조로 얻는 건 광고 제거뿐이다. 매출·권한 근거로 쓰게 되면 App Store Server API / Play Developer API 검증을 붙이고
 *   키는 WORLDQUIZ_APPLE_IAP_KEY · WORLDQUIZ_GOOGLE_SERVICE_ACCOUNT secret 으로 둔다.
 *
 * 배포:
 *   supabase functions deploy worldquiz-purchase --project-ref <ref>
 *   (SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 는 Supabase 가 자동으로 넣어 준다)
 */

const APP_ID = "com.tha.worldhistoryquiz";
const LIFETIME = "com.tha.worldhistoryquiz.remove_ad";

const DAY_MS = 24 * 60 * 60 * 1000;

/** 이 앱이 파는 상품과 구독 기간(일) — 여기 없는 상품 ID 는 받지 않는다. 평생은 0 */
const PRODUCTS: Record<string, number> = {
	[LIFETIME]: 0,
	"com.tha.worldhistoryquiz.remove_ad.monthly": 31,
	"com.tha.worldhistoryquiz.remove_ad.yearly": 366,
};

/** 클라이언트가 보낸 만료일은 구독 기간 + 유예 3일 이내로 자른다 */
const expiresAt = (productId: string, sent: number | null) => {
	if (!PRODUCTS[productId]) return null;
	const max = Date.now() + (PRODUCTS[productId] + 3) * DAY_MS;
	return new Date(Math.min(sent ?? max, max)).toISOString();
};

const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
	auth: { persistSession: false },
});

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

const str = (v: unknown, max = 4096) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : null);
const ms = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
const iso = (v: number | null) => (v == null ? null : new Date(v).toISOString());

async function record(userId: string, body: Record<string, unknown>) {
	const productId = str(body.productId, 200);
	const transactionId = str(body.transactionId, 200);
	const platform = body.platform === "ios" || body.platform === "android" ? body.platform : null;
	if (!productId || !(productId in PRODUCTS)) return json({ error: "productId" }, 400);
	if (!transactionId) return json({ error: "transactionId" }, 400);
	if (!platform) return json({ error: "platform" }, 400);
	// Xcode StoreKit 로컬 거래(0,1,2…)는 실제 영수증이 아니며 ID가 겹친다 — 실제 App Store 거래 ID는 15자리 이상
	if (platform === "ios" && !/^\d{10,}$/.test(transactionId)) return json({ error: "transactionId" }, 400);

	const { error } = await db.from("tb_purchases").upsert(
		{
			app_id: APP_ID,
			transaction_id: transactionId,
			user_id: userId,
			product_id: productId,
			platform,
			purchase_token: str(body.purchaseToken, 16384), // iOS JWS 는 수 KB
			purchased_at: iso(ms(body.purchasedAt)) ?? new Date().toISOString(),
			expires_at: expiresAt(productId, ms(body.expiresAt)),
		},
		{ onConflict: "app_id,transaction_id" },
	);
	if (error) {
		console.error("[worldquiz-purchase] upsert failed:", error.message);
		return json({ error: "db" }, 500);
	}
	return json({ ok: true });
}

/** 평생 구매 또는 만료 전 구독이 하나라도 있으면 active */
async function status(userId: string) {
	const { data, error } = await db
		.from("tb_purchases")
		.select("transaction_id")
		.eq("app_id", APP_ID)
		.eq("user_id", userId)
		.in("product_id", Object.keys(PRODUCTS))
		.or(`product_id.eq.${LIFETIME},expires_at.gt.${new Date().toISOString()}`)
		.limit(1);
	if (error) return json({ error: "db" }, 500);
	return json({ active: (data?.length ?? 0) > 0 });
}

Deno.serve(async (req) => {
	if (req.method !== "POST") return json({ error: "method" }, 405);

	const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
	const { data: auth } = await db.auth.getUser(token);
	if (!auth?.user) return json({ error: "auth" }, 401);

	let body: Record<string, unknown>;
	try {
		body = await req.json();
	} catch {
		return json({ error: "json" }, 400);
	}

	if (body.action === "record") return record(auth.user.id, body);
	if (body.action === "status") return status(auth.user.id);
	return json({ error: "action" }, 400);
});
