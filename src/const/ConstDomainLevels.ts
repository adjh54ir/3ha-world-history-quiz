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

import i18n from "@/src/translations";
import { localized } from "@/src/utils/ThemedStyles";
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
const TOPIC_STEPS = localized((): { name: string; icon: string; ratio: number; encouragement: string; description: string }[] => [
  {
    name: i18n.t("level.step.novice.name"),
    icon: "seedling",
    ratio: 0,
    encouragement: i18n.t("level.step.novice.encouragement"),
    description: i18n.t("level.step.novice.description"),
  },
  {
    name: i18n.t("level.step.explorer.name"),
    icon: "compass",
    ratio: 0.1,
    encouragement: i18n.t("level.step.explorer.encouragement"),
    description: i18n.t("level.step.explorer.description"),
  },
  {
    name: i18n.t("level.step.skilled.name"),
    icon: "map",
    ratio: 0.3,
    encouragement: i18n.t("level.step.skilled.encouragement"),
    description: i18n.t("level.step.skilled.description"),
  },
  {
    name: i18n.t("level.step.expert.name"),
    icon: "chess-knight",
    ratio: 0.6,
    encouragement: i18n.t("level.step.expert.encouragement"),
    description: i18n.t("level.step.expert.description"),
  },
  {
    name: i18n.t("level.step.master.name"),
    icon: "crown",
    ratio: 1,
    encouragement: i18n.t("level.step.master.encouragement"),
    description: i18n.t("level.step.master.description"),
  },
]);

const topicLevels = (key: keyof typeof WORLD_ENTRIES): DomainLevelDef => {
  const label = WORLD_TOPIC_TEXT[key].label;
  const full = WORLD_ENTRIES[key].length * POINT_PER_CORRECT;
  return {
    metric: "score",
    levels: TOPIC_STEPS.map((step, i) => ({
      level: i + 1,
      label: i18n.t("level.topicLabel", { topic: label, step: step.name }),
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
const overall = (): DomainLevelDef => ({
  metric: "score",
  levels: [
    { level: 1, label: i18n.t("level.overall.1.label"), icon: "seedling", threshold: 0, encouragement: i18n.t("level.overall.1.encouragement") },
    { level: 2, label: i18n.t("level.overall.2.label"), icon: "leaf", threshold: 400, encouragement: i18n.t("level.overall.2.encouragement") },
    { level: 3, label: i18n.t("level.overall.3.label"), icon: "book", threshold: 900, encouragement: i18n.t("level.overall.3.encouragement") },
    { level: 4, label: i18n.t("level.overall.4.label"), icon: "chalkboard-user", threshold: 1600, encouragement: i18n.t("level.overall.4.encouragement") },
    { level: 5, label: i18n.t("level.overall.5.label"), icon: "trophy", threshold: 2400, encouragement: i18n.t("level.overall.5.encouragement") },
    { level: 6, label: i18n.t("level.overall.6.label"), icon: "crown", threshold: 3400, encouragement: i18n.t("level.overall.6.encouragement") },
  ],
});

/** 주제 키 → 레벨 정의 */
export const DOMAIN_LEVELS = localized((): Record<string, DomainLevelDef> => ({
  overall: overall(),
  ...Object.fromEntries(WORLD_TOPICS.map((t) => [t.key, topicLevels(t.key)])),
}));

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
