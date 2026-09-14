/**
 * 획순 따라 쓰기 채점 — 손가락 자취와 획 중심선을 견준다.
 * -------------------------------------------------
 * 좌표는 화면 크기와 무관하게 0~1 로 환산해 넘긴다. 그래야 폰과 태블릿에서 같은 난이도가 된다.
 * 화면(RN)을 끌어오지 않는 순수 계산이라 노드에서 그대로 돌려 볼 수 있다.
 */

/** 시작·끝 점이 이만큼 안쪽이면 맞다고 본다 (한 변 대비 비율) */
export const END_TOLERANCE = 0.22;
/** 목표 획 위의 표본이 손가락 자취에서 이만큼 안쪽이면 지나갔다고 본다 */
export const COVER_TOLERANCE = 0.17;
/** 손가락이 목표 획에서 이보다 멀리 벗어나면 딴 데 그은 것으로 본다 */
export const STRAY_TOLERANCE = 0.26;
/** 목표 획을 몇 점으로 잘라 검사할지 */
const SAMPLE_COUNT = 14;
/** 이 길이(한 변 대비)보다 짧은 획은 '점' 으로 보고 지나간 자리만 본다 */
const DOT_LENGTH = 0.06;

export interface TracePoint {
	x: number;
	y: number;
}

const distance = (a: TracePoint, b: TracePoint): number => Math.hypot(a.x - b.x, a.y - b.y);

/** 점에서 선분 ab 까지의 최단 거리 */
const toSegment = (point: TracePoint, a: TracePoint, b: TracePoint): number => {
	const vx = b.x - a.x;
	const vy = b.y - a.y;
	const lengthSquared = vx * vx + vy * vy;
	if (lengthSquared === 0) {
		return distance(point, a);
	}
	// 선분 위에서 가장 가까운 자리를 0~1 로 찾아 그 점까지의 거리를 잰다
	const t = Math.max(0, Math.min(1, ((point.x - a.x) * vx + (point.y - a.y) * vy) / lengthSquared));
	return Math.hypot(point.x - (a.x + vx * t), point.y - (a.y + vy * t));
};

/**
 * 점 하나에서 자취까지의 최단 거리 — 점이 아니라 **선분** 기준으로 잰다.
 *
 * 예전에는 자취의 점들과만 견줬다. 손가락을 빠르게 그으면 한 프레임에 화면의 10%를 건너뛰어
 * 점 사이가 벌어지는데, 그 틈을 지나가는 목표 표본은 "안 지나갔다" 로 걸렸다.
 * 같은 획을 천천히 그으면 통과하고 빠르게 그으면 실패하던 원인이 이것이다.
 */
const nearest = (point: TracePoint, path: TracePoint[]): number => {
	if (path.length === 1) {
		return distance(point, path[0]);
	}
	let min = Infinity;
	for (let at = 1; at < path.length; at += 1) {
		min = Math.min(min, toSegment(point, path[at - 1], path[at]));
	}
	return min;
};

/** 자취를 고르게 count 점으로 줄인다 */
const sample = (path: TracePoint[], count: number): TracePoint[] => {
	if (path.length <= count) {
		return path;
	}
	const step = (path.length - 1) / (count - 1);
	return Array.from({ length: count }, (_, at) => path[Math.round(at * step)]);
};

/** 자취의 총 길이 */
export const traceLength = (path: TracePoint[]): number =>
	path.reduce((sum, point, at) => (at === 0 ? 0 : sum + distance(point, path[at - 1])), 0);

/**
 * 획 하나를 제대로 따라 그었는지.
 *
 * 1) 시작과 끝이 제자리인가 — 거꾸로 그으면 여기서 걸린다(획의 방향이 곧 필순이다)
 * 2) 목표 획 위를 빠짐없이 지나갔는가 — 중간을 건너뛰면 걸린다
 * 3) 엉뚱한 데를 헤매지 않았는가 — 판 전체에 낙서하면 걸린다
 *
 * @param drawn  손가락 자취 (0~1)
 * @param target 획 중심선 (0~1)
 */
export const isStrokeTraced = (drawn: TracePoint[], target: TracePoint[]): boolean => {
	if (drawn.length < 2 || target.length === 0) {
		return false;
	}
	const head = target[0];
	// 점 찍기 획은 시작과 끝이 같은 자리다 — 그 언저리를 눌렀는지만 본다
	if (traceLength(target) < DOT_LENGTH) {
		return drawn.every((point) => distance(point, head) <= END_TOLERANCE);
	}
	const tail = target[target.length - 1];
	if (distance(drawn[0], head) > END_TOLERANCE || distance(drawn[drawn.length - 1], tail) > END_TOLERANCE) {
		return false;
	}
	if (!sample(target, SAMPLE_COUNT).every((point) => nearest(point, drawn) <= COVER_TOLERANCE)) {
		return false;
	}
	return sample(drawn, SAMPLE_COUNT).every((point) => nearest(point, target) <= STRAY_TOLERANCE);
};

export default { isStrokeTraced, traceLength };
