// const/ConstDomainLevels.ts
/**
 * 주제(도메인)별 레벨/등급 메타 — 타이틀·아이콘·점수 임계값·격려문·설명을 상수로 관리
 *
 * - 마스코트 이미지는 ConstCharacters의 주제별 이미지 세트를 레벨 index로 매핑해 재사용(중복 X)
 * - 임계값 기준(metric): 모든 주제가 'score' (누적 점수) 기준이다
 * - 세계 상식 주제는 등급 사다리를 주제마다 손으로 쓰지 않고 한 틀에서 만든다.
 *   임계값은 그 주제 항목을 전부 맞혔을 때의 점수(항목 수 × 정답 1개 점수)에 비율을 곱해 정한다 —
 *   항목이 20개인 태양계와 338개인 위인이 같은 문턱을 쓰면 한쪽은 너무 쉽고 한쪽은 끝이 없다.
 * - 화면에서는 getDomainLevel(domain, { solved, score }) 로 현재 레벨/타이틀/마스코트를 얻어 사용
 */

import { getCharacterImages } from "./ConstCharacters";
import { POINT_PER_CORRECT } from "./ConstScoring";
import { WORLD_TOPICS } from "./data/world/ConstWorldTopics";
import { WORLD_ENTRIES } from "./data/world/ConstWorldEntries";
import { WORLD_TOPIC_TEXT } from "./data/world/ConstWorldText";

export type LevelMetric = "solved" | "score";

export interface DomainLevel {
  /** 1-based 레벨 */
  level: number;
  /** 등급 명칭 (예: '세계 수도 탐험가') */
  label: string;
  /** fontAwesome6 아이콘 이름 */
  icon: string;
  /** 이 레벨에 도달하기 위한 metric 임계값 */
  threshold: number;
  /** 등급 부제 (일부 주제에만 존재, 예: '입문 등급') */
  title?: string;
  /** 격려 메시지 */
  encouragement?: string;
  /** 설명 */
  description?: string;
  /** 느낌/포지션 태그 (일부 주제) */
  feeling?: string;
}

interface DomainLevelDef {
  metric: LevelMetric;
  levels: DomainLevel[];
}

// ─────────────────────────────────────────────────────────────
// 주제별 등급 — 한 틀에서 만든다 (주제 이름 + 단계 이름)
// ─────────────────────────────────────────────────────────────
const TOPIC_STEPS: { name: string; icon: string; ratio: number; encouragement: string; description: string }[] = [
  {
    name: "새내기",
    icon: "seedling",
    ratio: 0,
    encouragement: "첫걸음을 내디뎠어요!\n앞으로가 더욱 기대돼요!",
    description: "이 주제를 막 펼친 단계예요.\n익숙한 이름부터 하나씩 알아가면 돼요.",
  },
  {
    name: "탐험가",
    icon: "compass",
    ratio: 0.1,
    encouragement: "좋은 출발이에요!\n조금씩 지도가 넓어지고 있어요!",
    description: "자주 듣던 이름들이 하나둘 연결되기 시작하는 단계예요.\n본격적인 탐험의 길에 들어섰습니다.",
  },
  {
    name: "숙련자",
    icon: "map",
    ratio: 0.3,
    encouragement: "지식이 차곡차곡 쌓이고 있어요!\n이제 훨씬 더 능숙해졌네요!",
    description: "헷갈리던 보기도 가려낼 수 있는 단계예요.\n기초를 넘어 한층 단단한 실력을 갖췄습니다.",
  },
  {
    name: "고수",
    icon: "chess-knight",
    ratio: 0.6,
    encouragement: "낯선 문제도 거뜬해요!\n어떤 도전도 당당히 맞설 수 있네요!",
    description: "특급 난이도의 낯선 이름까지 손에 넣어 가는 단계예요.\n주변에서 물어볼 만한 실력입니다.",
  },
  {
    name: "마스터",
    icon: "crown",
    ratio: 1,
    encouragement: "이 주제의 끝까지 왔어요!\n진정한 마스터예요!",
    description: "이 주제의 항목을 모두 정복한 단계예요.\n누구보다 넓고 깊은 지식을 갖췄습니다.",
  },
];

const topicLevels = (key: keyof typeof WORLD_ENTRIES): DomainLevelDef => {
  const label = WORLD_TOPIC_TEXT[key].label;
  const full = WORLD_ENTRIES[key].length * POINT_PER_CORRECT;
  return {
    metric: "score",
    levels: TOPIC_STEPS.map((step, i) => ({
      level: i + 1,
      label: `${label} ${step.name}`,
      icon: step.icon,
      // 단계마다 적어도 10점은 벌어지게 한다 (항목 수가 적어도 두 단계가 같은 문턱을 쓰지 않게)
      threshold: Math.max(i * POINT_PER_CORRECT, Math.round((full * step.ratio) / POINT_PER_CORRECT) * POINT_PER_CORRECT),
      encouragement: step.encouragement,
      description: step.description,
    })),
  };
};

// ─────────────────────────────────────────────────────────────
// 전체(누적 점수) — 세계를 누비는 역사 사자 서사 (점수 상세 '전체'·홈 캐릭터 공용 기준)
// 임계값은 전체 마스코트 단계(OVERALL_TIERS)와 동일
// ─────────────────────────────────────────────────────────────
const overall: DomainLevelDef = {
  metric: "score",
  levels: [
    { level: 1, label: "탐험 새싹 사자", icon: "seedling", threshold: 0, encouragement: "세계 여행의 첫걸음을 뗐어요!" },
    { level: 2, label: "견습 탐험가 사자", icon: "leaf", threshold: 400, encouragement: "차근차근 지도를 넓히고 있어요!" },
    { level: 3, label: "노련한 여행가 사자", icon: "book", threshold: 900, encouragement: "여러 나라와 이야기가 익숙해졌어요!" },
    { level: 4, label: "세계 탐구가 사자", icon: "chalkboard-user", threshold: 1600, encouragement: "실력이 눈에 띄게 늘었어요!" },
    { level: 5, label: "대탐험가 사자", icon: "trophy", threshold: 2400, encouragement: "상당한 경지에 올랐어요!" },
    { level: 6, label: "황금 대탐험가 사자", icon: "crown", threshold: 3400, encouragement: "세계 상식의 달인이 되었어요!" },
  ],
};

/** 주제 키 → 레벨 정의 */
export const DOMAIN_LEVELS: Record<string, DomainLevelDef> = {
  overall,
  ...Object.fromEntries(WORLD_TOPICS.map((t) => [t.key, topicLevels(t.key)])),
};

export interface DomainLevelInfo {
  /** 현재 레벨 메타 */
  def: DomainLevel;
  /** 1-based 레벨 */
  level: number;
  maxLevel: number;
  /** 다음 레벨 메타 (최고 레벨이면 null) */
  nextDef: DomainLevel | null;
  /** 다음 레벨 임계값 (최고 레벨이면 null) */
  nextThreshold: number | null;
  /** 임계값 기준 */
  metric: LevelMetric;
  /** 현재 metric 값 */
  value: number;
  /** 현재 레벨 마스코트 이미지 */
  img: ReturnType<typeof require> | null;
}

/** 해당 주제에 레벨 정의가 있는지 */
export const hasDomainLevels = (domain: string): boolean =>
  !!DOMAIN_LEVELS[domain];

/**
 * 주제 + 지표(푼 문제 수/점수)로 현재 레벨/타이틀/마스코트 산출
 * - metric에 맞는 값을 선택해 임계값 이하 최고 레벨을 반환
 */
export const getDomainLevel = (
  domain: string,
  metrics: { solved?: number; score?: number },
): DomainLevelInfo | null => {
  const d = DOMAIN_LEVELS[domain];
  if (!d) return null;
  const value =
    d.metric === "score" ? (metrics.score ?? 0) : (metrics.solved ?? 0);
  const imgs = getCharacterImages(domain);
  let idx = 0;
  for (let i = 0; i < d.levels.length; i++) {
    if (value >= d.levels[i].threshold) idx = i;
  }
  const nextDef = idx < d.levels.length - 1 ? d.levels[idx + 1] : null;
  return {
    def: d.levels[idx],
    level: idx + 1,
    maxLevel: d.levels.length,
    nextDef,
    nextThreshold: nextDef ? nextDef.threshold : null,
    metric: d.metric,
    value,
    img: imgs[idx] ?? imgs[imgs.length - 1] ?? null,
  };
};

/** 주제의 전체 레벨 목록 */
export const getDomainLevels = (domain: string): DomainLevel[] =>
  DOMAIN_LEVELS[domain]?.levels ?? [];

export default {
  DOMAIN_LEVELS,
  getDomainLevel,
  getDomainLevels,
  hasDomainLevels,
};
