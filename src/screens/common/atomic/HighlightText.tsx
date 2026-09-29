import React, { useMemo } from 'react';
import { Text, TextProps, StyleProp, TextStyle } from 'react-native';
import Colors from '@/src/const/ConstColors';
import { themed } from '@/src/utils/ThemedStyles';

interface Props extends TextProps {
	/** 원문 */
	text: string;
	/** 강조할 검색어. 비어 있으면 원문 그대로 렌더 */
	query?: string;
	/** 강조 구간 스타일 (기본: 포인트 컬러 + 옅은 배경) */
	highlightStyle?: StyleProp<TextStyle>;
}

/**
 * 검색어 강조 텍스트
 * - 대소문자 구분 없이 일치하는 모든 구간을 강조한다.
 * - 정규식 대신 인덱스 탐색을 쓴다(사용자가 넣는 특수문자로 정규식이 깨지지 않게).
 */
const HighlightText: React.FC<Props> = ({ text, query, highlightStyle, style, ...rest }) => {
	const parts = useMemo(() => {
		const q = (query ?? '').trim();
		if (!q) return null;
		const lowerText = text.toLowerCase();
		const lowerQuery = q.toLowerCase();
		const out: { value: string; hit: boolean }[] = [];
		let from = 0;
		for (;;) {
			const at = lowerText.indexOf(lowerQuery, from);
			if (at === -1) break;
			if (at > from) out.push({ value: text.slice(from, at), hit: false });
			out.push({ value: text.slice(at, at + q.length), hit: true });
			from = at + q.length;
		}
		if (out.length === 0) return null;
		if (from < text.length) out.push({ value: text.slice(from), hit: false });
		return out;
	}, [text, query]);

	if (!parts) {
		return (
			<Text style={style} {...rest}>
				{text}
			</Text>
		);
	}
	return (
		<Text style={style} {...rest}>
			{parts.map((p, i) =>
				p.hit ? (
					<Text key={i} style={[defaultHighlight, highlightStyle]}>
						{p.value}
					</Text>
				) : (
					p.value
				),
			)}
		</Text>
	);
};

const defaultHighlight: TextStyle = themed(() => ({ color: Colors.primaryDeep, fontWeight: '900', backgroundColor: Colors.primarySoft }));

export default HighlightText;
