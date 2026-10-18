/**
 * 세계 상식 주제의 보이는 글자 (번역 파일 main.world)
 * -------------------------------------------------
 * 언어마다 한 번 번역해 두고(localized) 읽는 시점의 언어 값을 돌려준다 — 설정에서 언어를 바꾸면 바로 따라간다.
 * 주제 키·모드 키는 ConstWorldTopics 와 같다 — 모드를 더하면 여기와 번역 파일에 이름·발문을 넣는다.
 */
import type { WorldType } from '@/src/types/data/WorldType';
import i18n from '@/src/translations';
import { localized } from '@/src/utils/ThemedStyles';

export interface TopicText {
	label: string;
	description: string;
	/** 모드 키 → 이름·발문 */
	modes: Record<string, { label: string; question: string }>;
}

export const WORLD_TOPIC_TEXT = localized((): Record<WorldType.TopicKey, TopicText> => ({
	capital: {
		label: i18n.t('world.topic.capital.label'),
		description: i18n.t('world.topic.capital.description'),
		modes: {
			capital: { label: i18n.t('world.topic.capital.modes.capital.label'), question: i18n.t('world.topic.capital.modes.capital.question') },
			continent: { label: i18n.t('world.topic.capital.modes.continent.label'), question: i18n.t('world.topic.capital.modes.continent.question') },
			country: { label: i18n.t('world.topic.capital.modes.country.label'), question: i18n.t('world.topic.capital.modes.country.question') },
			flag: { label: i18n.t('world.topic.capital.modes.flag.label'), question: i18n.t('world.topic.capital.modes.flag.question') },
		},
	},
	constellation: {
		label: i18n.t('world.topic.constellation.label'),
		description: i18n.t('world.topic.constellation.description'),
		modes: {
			image: { label: i18n.t('world.topic.constellation.modes.image.label'), question: i18n.t('world.topic.constellation.modes.image.question') },
			name: { label: i18n.t('world.topic.constellation.modes.name.label'), question: i18n.t('world.topic.constellation.modes.name.question') },
			season: { label: i18n.t('world.topic.constellation.modes.season.label'), question: i18n.t('world.topic.constellation.modes.season.question') },
			star: { label: i18n.t('world.topic.constellation.modes.star.label'), question: i18n.t('world.topic.constellation.modes.star.question') },
		},
	},
	event: {
		label: i18n.t('world.topic.event.label'),
		description: i18n.t('world.topic.event.description'),
		modes: {
			century: { label: i18n.t('world.topic.event.modes.century.label'), question: i18n.t('world.topic.event.modes.century.question') },
			country: { label: i18n.t('world.topic.event.modes.country.label'), question: i18n.t('world.topic.event.modes.country.question') },
			kind: { label: i18n.t('world.topic.event.modes.kind.label'), question: i18n.t('world.topic.event.modes.kind.question') },
			name: { label: i18n.t('world.topic.event.modes.name.label'), question: i18n.t('world.topic.event.modes.name.question') },
		},
	},
	figure: {
		label: i18n.t('world.topic.figure.label'),
		description: i18n.t('world.topic.figure.description'),
		modes: {
			country: { label: i18n.t('world.topic.figure.modes.country.label'), question: i18n.t('world.topic.figure.modes.country.question') },
			era: { label: i18n.t('world.topic.figure.modes.era.label'), question: i18n.t('world.topic.figure.modes.era.question') },
			name: { label: i18n.t('world.topic.figure.modes.name.label'), question: i18n.t('world.topic.figure.modes.name.question') },
			portrait: { label: i18n.t('world.topic.figure.modes.portrait.label'), question: i18n.t('world.topic.figure.modes.portrait.question') },
			role: { label: i18n.t('world.topic.figure.modes.role.label'), question: i18n.t('world.topic.figure.modes.role.question') },
		},
	},
	landmark: {
		label: i18n.t('world.topic.landmark.label'),
		description: i18n.t('world.topic.landmark.description'),
		modes: {
			city: { label: i18n.t('world.topic.landmark.modes.city.label'), question: i18n.t('world.topic.landmark.modes.city.question') },
			country: { label: i18n.t('world.topic.landmark.modes.country.label'), question: i18n.t('world.topic.landmark.modes.country.question') },
			name: { label: i18n.t('world.topic.landmark.modes.name.label'), question: i18n.t('world.topic.landmark.modes.name.question') },
			photo: { label: i18n.t('world.topic.landmark.modes.photo.label'), question: i18n.t('world.topic.landmark.modes.photo.question') },
		},
	},
	myth: {
		label: i18n.t('world.topic.myth.label'),
		description: i18n.t('world.topic.myth.description'),
		modes: {
			domain: { label: i18n.t('world.topic.myth.modes.domain.label'), question: i18n.t('world.topic.myth.modes.domain.question') },
			name: { label: i18n.t('world.topic.myth.modes.name.label'), question: i18n.t('world.topic.myth.modes.name.question') },
			portrait: { label: i18n.t('world.topic.myth.modes.portrait.label'), question: i18n.t('world.topic.myth.modes.portrait.question') },
			roman: { label: i18n.t('world.topic.myth.modes.roman.label'), question: i18n.t('world.topic.myth.modes.roman.question') },
		},
	},
	nature: {
		label: i18n.t('world.topic.nature.label'),
		description: i18n.t('world.topic.nature.description'),
		modes: {
			continent: { label: i18n.t('world.topic.nature.modes.continent.label'), question: i18n.t('world.topic.nature.modes.continent.question') },
			country: { label: i18n.t('world.topic.nature.modes.country.label'), question: i18n.t('world.topic.nature.modes.country.question') },
			name: { label: i18n.t('world.topic.nature.modes.name.label'), question: i18n.t('world.topic.nature.modes.name.question') },
		},
	},
	olympic: {
		label: i18n.t('world.topic.olympic.label'),
		description: i18n.t('world.topic.olympic.description'),
		modes: {
			city: { label: i18n.t('world.topic.olympic.modes.city.label'), question: i18n.t('world.topic.olympic.modes.city.question') },
			host: { label: i18n.t('world.topic.olympic.modes.host.label'), question: i18n.t('world.topic.olympic.modes.host.question') },
			top: { label: i18n.t('world.topic.olympic.modes.top.label'), question: i18n.t('world.topic.olympic.modes.top.question') },
		},
	},
	space: {
		label: i18n.t('world.topic.space.label'),
		description: i18n.t('world.topic.space.description'),
		modes: {
			image: { label: i18n.t('world.topic.space.modes.image.label'), question: i18n.t('world.topic.space.modes.image.question') },
			kind: { label: i18n.t('world.topic.space.modes.kind.label'), question: i18n.t('world.topic.space.modes.kind.question') },
			name: { label: i18n.t('world.topic.space.modes.name.label'), question: i18n.t('world.topic.space.modes.name.question') },
			order: { label: i18n.t('world.topic.space.modes.order.label'), question: i18n.t('world.topic.space.modes.order.question') },
		},
	},
	winter: {
		label: i18n.t('world.topic.winter.label'),
		description: i18n.t('world.topic.winter.description'),
		modes: {
			city: { label: i18n.t('world.topic.winter.modes.city.label'), question: i18n.t('world.topic.winter.modes.city.question') },
			host: { label: i18n.t('world.topic.winter.modes.host.label'), question: i18n.t('world.topic.winter.modes.host.question') },
			top: { label: i18n.t('world.topic.winter.modes.top.label'), question: i18n.t('world.topic.winter.modes.top.question') },
		},
	},
	worldcup: {
		label: i18n.t('world.topic.worldcup.label'),
		description: i18n.t('world.topic.worldcup.description'),
		modes: {
			host: { label: i18n.t('world.topic.worldcup.modes.host.label'), question: i18n.t('world.topic.worldcup.modes.host.question') },
			runnerUp: { label: i18n.t('world.topic.worldcup.modes.runnerUp.label'), question: i18n.t('world.topic.worldcup.modes.runnerUp.question') },
			winner: { label: i18n.t('world.topic.worldcup.modes.winner.label'), question: i18n.t('world.topic.worldcup.modes.winner.question') },
		},
	},
}));

/**
 * 학습 카드 '정보' 표에 띄울 필드 이름.
 * 여기 없는 필드(code·image·hemisphere 처럼 그림 열쇠이거나 다른 값과 겹치는 것)는 표에 나오지 않는다.
 */
export const WORLD_FIELD_LABELS = localized((): Record<string, string> => ({
	capital: i18n.t('world.field.capital'),
	continent: i18n.t('world.field.continent'),
	country: i18n.t('world.field.country'),
	city: i18n.t('world.field.city'),
	era: i18n.t('world.field.era'),
	role: i18n.t('world.field.role'),
	century: i18n.t('world.field.century'),
	kind: i18n.t('world.field.kind'),
	roman: i18n.t('world.field.roman'),
	domain: i18n.t('world.field.domain'),
	symbol: i18n.t('world.field.symbol'),
	order: i18n.t('world.field.order'),
	host: i18n.t('world.field.host'),
	feature: i18n.t('world.field.feature'),
	star: i18n.t('world.field.star'),
	season: i18n.t('world.field.season'),
	winner: i18n.t('world.field.winner'),
	runnerUp: i18n.t('world.field.runnerUp'),
	top: i18n.t('world.field.top'),
}));

/** 주제마다 뜻이 다른 필드 — 태양계의 host 는 개최국이 아니라 그 천체가 도는 중심이다 */
const TOPIC_FIELD_LABELS = localized((): Partial<Record<WorldType.TopicKey, Record<string, string>>> => ({
	space: { host: i18n.t('world.topicField.space.host') },
}));

export const fieldLabel = (topic: WorldType.TopicKey, field: string): string | undefined => TOPIC_FIELD_LABELS[topic]?.[field] ?? WORLD_FIELD_LABELS[field];
