/**
 * DementionUtils 기반 반응형 스타일 변환기
 * - StyleSheet.create / style JSX 속성 / 스타일형 객체 리터럴 안의
 *   하드코딩 숫자를 scaleWidth·scaleHeight·scaledSize로 감쌈
 * - shadowOffset·offset·hitSlop 내부, borderWidth 등은 제외
 * - width/height가 같은 값(정사각형·원)은 둘 다 scaleWidth로 통일 (원형 유지)
 * 사용: node responsive_transform.js [--apply] <file...>
 */
const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const W = new Set([
	'paddingHorizontal', 'paddingLeft', 'paddingRight', 'marginHorizontal', 'marginLeft', 'marginRight',
	'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
	'gap', 'columnGap', 'minWidth', 'maxWidth', 'padding', 'margin', 'width', 'translateX',
]);
const H = new Set([
	'paddingVertical', 'paddingTop', 'paddingBottom', 'marginVertical', 'marginTop', 'marginBottom',
	'lineHeight', 'minHeight', 'maxHeight', 'rowGap', 'height', 'translateY',
]);
const F = new Set(['fontSize']);
const SKIP_PARENT_KEYS = new Set(['shadowOffset', 'offset', 'hitSlop', 'contentOffset']);
const STYLEISH = new Set([...W, ...H, ...F, 'flexDirection', 'alignItems', 'justifyContent', 'backgroundColor', 'borderColor', 'color', 'position', 'borderWidth', 'flex', 'overflow']);

const apply = process.argv.includes('--apply');
const files = process.argv.slice(2).filter((a) => a !== '--apply');
let grandTotal = 0;

const keyName = (prop) => {
	if (!prop || !prop.key) return null;
	if (prop.key.type === 'Identifier') return prop.key.name;
	if (prop.key.type === 'StringLiteral') return prop.key.value;
	return null;
};

for (const file of files) {
	const src = fs.readFileSync(file, 'utf8');
	let ast;
	try {
		ast = parser.parse(src, { sourceType: 'module', plugins: ['typescript', 'jsx'], ranges: true });
	} catch (e) {
		console.log(`PARSE-FAIL ${file}: ${e.message}`);
		continue;
	}

	// 스타일 컨텍스트 안의 ObjectExpression 수집
	const styleObjects = new Set();
	const markAllObjects = (node) => {
		// node 아래 모든 ObjectExpression을 스타일 컨텍스트로 마킹
		const stack = [node];
		while (stack.length) {
			const n = stack.pop();
			if (!n || typeof n !== 'object') continue;
			if (Array.isArray(n)) { stack.push(...n); continue; }
			if (n.type === 'ObjectExpression') styleObjects.add(n);
			for (const k of Object.keys(n)) {
				if (k === 'loc' || k === 'range' || k === 'leadingComments' || k === 'trailingComments') continue;
				const v = n[k];
				if (v && typeof v === 'object') stack.push(v);
			}
		}
	};

	traverse(ast, {
		CallExpression(p) {
			const c = p.node.callee;
			if (c.type === 'MemberExpression' && c.object.name === 'StyleSheet' && c.property.name === 'create') {
				markAllObjects(p.node.arguments[0]);
			}
		},
		JSXAttribute(p) {
			const name = p.node.name && p.node.name.name;
			if (typeof name === 'string' && /style/i.test(name)) markAllObjects(p.node.value);
		},
		ObjectExpression(p) {
			// 휴리스틱: 스타일 속성 2개 이상 가진 객체 리터럴 (card 같은 공용 상수)
			let hits = 0;
			for (const prop of p.node.properties) {
				const k = keyName(prop);
				if (k && STYLEISH.has(k)) hits++;
			}
			if (hits >= 2) styleObjects.add(p.node);
		},
	});

	// 변환 대상 수집
	const edits = [];
	const wrappers = new Set();

	const numericOf = (v) => {
		if (v.type === 'NumericLiteral') return { val: v.value, node: v };
		if (v.type === 'UnaryExpression' && v.operator === '-' && v.argument.type === 'NumericLiteral')
			return { val: -v.argument.value, node: v };
		return null;
	};

	for (const obj of styleObjects) {
		// 부모 키가 shadowOffset 등인지 검사는 아래 property 순회에서 처리
		const props = obj.properties.filter((pr) => pr.type === 'ObjectProperty');
		const byKey = {};
		props.forEach((pr) => { const k = keyName(pr); if (k) byKey[k] = pr; });

		for (const pr of props) {
			const k = keyName(pr);
			if (!k) continue;
			if (!(W.has(k) || H.has(k) || F.has(k))) continue;
			const num = numericOf(pr.value);
			if (!num || num.val === 0) continue;

			// shadowOffset:{width,height} 등 제외 — 이 obj가 SKIP 키의 값인지 확인
			if (obj.__skip === undefined) {
				obj.__skip = false;
			}

			let fn = F.has(k) ? 'scaledSize' : W.has(k) ? 'scaleWidth' : 'scaleHeight';
			// 정사각형/원: width===height 숫자면 둘 다 scaleWidth (원형 유지)
			if ((k === 'height' || k === 'minHeight') && byKey.width) {
				const wNum = numericOf(byKey.width.value);
				if (wNum && wNum.val === num.val) fn = 'scaleWidth';
			}
			edits.push({ start: num.node.start, end: num.node.end, text: `${fn}(${num.val})`, file });
			wrappers.add(fn);
		}
	}

	// shadowOffset / hitSlop 값 내부 편집 제거
	traverse(ast, {
		ObjectProperty(p) {
			const k = keyName(p.node);
			if (k && SKIP_PARENT_KEYS.has(k) && p.node.value.type === 'ObjectExpression') {
				const { start, end } = p.node.value;
				for (let i = edits.length - 1; i >= 0; i--) {
					if (edits[i].start >= start && edits[i].end <= end) edits.splice(i, 1);
				}
			}
		},
		JSXAttribute(p) {
			const name = p.node.name && p.node.name.name;
			if (name === 'hitSlop' && p.node.value) {
				const { start, end } = p.node.value;
				for (let i = edits.length - 1; i >= 0; i--) {
					if (edits[i].start >= start && edits[i].end <= end) edits.splice(i, 1);
				}
			}
		},
	});

	if (edits.length === 0) continue;
	grandTotal += edits.length;
	console.log(`${file}: ${edits.length}건`);

	if (!apply) continue;

	// 뒤에서부터 치환
	edits.sort((a, b) => b.start - a.start);
	let out = src;
	for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);

	// import 보강
	const needed = [...wrappers];
	const importRe = /import\s*\{([^}]*)\}\s*from\s*'@\/src\/utils';/;
	const m = out.match(importRe);
	if (m) {
		const names = m[1].split(',').map((s) => s.trim()).filter(Boolean);
		const missing = needed.filter((n) => !names.includes(n));
		if (missing.length) out = out.replace(importRe, `import { ${[...names, ...missing].join(', ')} } from '@/src/utils';`);
	} else {
		// 마지막 import 뒤에 추가
		const lines = out.split('\n');
		let lastImp = -1;
		lines.forEach((l, i) => { if (l.startsWith('import ')) lastImp = i; });
		lines.splice(lastImp + 1, 0, `import { ${needed.join(', ')} } from '@/src/utils';`);
		out = lines.join('\n');
	}

	fs.writeFileSync(file, out);
}
console.log(`\n총 ${grandTotal}건${apply ? ' 적용됨' : ' (dry-run)'}`);
